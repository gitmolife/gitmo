import * as os from 'os';
import * as cluster from 'cluster';
import * as chalk from 'chalk';
import * as portscanner from 'portscanner';
import * as isRoot from 'is-root';
import { getConnection } from 'typeorm';
import { fork, ChildProcess } from 'child_process';

import Logger from '../services/logger';
import loadConfig from '@/config/load';
import { Config } from '@/config/types';
import { lessThan } from '../prelude/array';
import { program } from '../argv';
import { showMachineInfo } from '@/misc/show-machine-info';
import { initDb } from '../db/postgre';
const meta = require('../meta.json');

const logger = new Logger('core', 'cyan');
const bootLogger = logger.createSubLogger('boot', 'magenta', false);
const intercomLogger = logger.createSubLogger('intercom', 'green', false);
const brokerLogger = intercomLogger.createSubLogger('broker', 'gold', false);
const brokerBootLogger = brokerLogger.createSubLogger('boot', 'magenta', false);

function greet() {
	if (!program.quiet) {
		//#region Misskey logo
		const v = `v${meta.version}`;
		console.log('  _____ _         _           ');
		console.log(' |     |_|___ ___| |_ ___ _ _ ');
		console.log(' | | | | |_ -|_ -| \'_| -_| | |');
		console.log(' |_|_|_|_|___|___|_,_|___|_  |');
		console.log(' ' + chalk.gray(v) + ('                        |___|\n'.substr(v.length)));
		//#endregion

		console.log(' Misskey is an open-source decentralized microblogging platform.');
		console.log(chalk.keyword('orange')(' If you like Misskey, please donate to support development. https://www.patreon.com/syuilo'));

		console.log('');
		console.log(chalk`--- ${os.hostname()} {gray (PID: ${process.pid.toString()})} ---`);
	}

	bootLogger.info('Welcome to Misskey!');
	bootLogger.info(`Misskey v${meta.version}`, null, true);
}

/**
 * Init master process
 */
export async function masterMain() {
	let config!: Config;
	// for Intercom2 worker
	let icWorker: ChildProcess | undefined;

	try {
		greet();

		// initialize app
		config = await init();

		if (config.port == null || Number.isNaN(config.port)) {
			bootLogger.error('The port is not configured. Please configure port.', null, true);
			process.exit(1);
		}

		if (process.platform === 'linux' && isWellKnownPort(config.port) && !isRoot()) {
			bootLogger.error('You need root privileges to listen on well-known port on Linux', null, true);
			process.exit(1);
		}

		if (!await isPortAvailable(config.port)) {
			bootLogger.error(`Port ${config.port} is already in use`, null, true);
			process.exit(1);
		}
	} catch (e) {
		bootLogger.error('Fatal error occurred during initialization', null, true);
		process.exit(1);
	}

	bootLogger.succ('Misskey initialized');

	try {
		icWorker = await spawnIntercom();
	} catch (e) {
		bootLogger.error('Fatal error occurred during initialization attempt for Intercom2', null, true);
		intercomLogger.error(e, null, true);
		process.exit(1);
	}

	if (!program.disableClustering) {
		await spawnWorkers(config.clusterLimit);
	}

	bootLogger.succ(`Now listening on port ${config.port} on ${config.url}`, null, true);

	if (!program.noDaemons) {
		require('../daemons/server-stats').default();
		require('../daemons/queue-stats').default();
		require('../daemons/janitor').default();
	}

	process.on('message', msg => {
		if (msg === 'ok') {
			if (icWorker !== undefined) {
				icWorker.send('master-ready');
			}
			bootLogger.succ('Misskey Ready!');
		}
		if (isJson(msg)) {
			const res = JSON.parse(JSON.stringify(msg));
			if (res.cmd === 'getNewAddress') {
				//console.log(msg);
				if (icWorker !== undefined) {
					icWorker.send(msg);
				}
			}
			if (res.cmd === 'gotNewAddress') {
				//console.log(msg);
				if (icWorker !== undefined) {
					icWorker.send(msg);
				}
			}
			if (res.cmd === 'doWithdraw') {
				//console.log(msg);
				if (icWorker !== undefined) {
					icWorker.send(msg);
				}
			}
		}
	});
}

const runningNodejsVersion = process.version.slice(1).split('.').map(x => parseInt(x, 10));
const requiredNodejsVersion = [11, 7, 0];
const satisfyNodejsVersion = !lessThan(runningNodejsVersion, requiredNodejsVersion);

function isWellKnownPort(port: number): boolean {
	return port < 1024;
}

async function isPortAvailable(port: number): Promise<boolean> {
	return await portscanner.checkPortStatus(port, '127.0.0.1') === 'closed';
}

function showEnvironment(): void {
	const env = process.env.NODE_ENV;
	const logger = bootLogger.createSubLogger('env');
	logger.info(typeof env === 'undefined' ? 'NODE_ENV is not set' : `NODE_ENV: ${env}`);

	if (env !== 'production') {
		logger.warn('The environment is not in production mode.');
		logger.warn('DO NOT USE FOR PRODUCTION PURPOSE!', null, true);
	}

	logger.info(`You ${isRoot() ? '' : 'do not '}have root privileges`);
}

function checkIsValidDomain(domain: string): boolean {
	var re = new RegExp(/^((?:(?:(?:\w[\.\-\+]?)*)\w)+)((?:(?:(?:\w[\.\-\+]?){0,62})\w)+)\.(\w{2,6})$/);
	return domain.match(re) != null;
}

function isJson(item: any) {
	try {
		item = typeof item !== "string" ? JSON.stringify(item) : item;
		item = JSON.parse(item);
	} catch (e) {
		return false;
	}
	if (typeof item === "object" && item !== null) {
		return true;
	}
	return false;
}

/**
 * Init app
 */
async function init(): Promise<Config> {
	showEnvironment();

	await showMachineInfo(bootLogger);

	const nodejsLogger = bootLogger.createSubLogger('nodejs');

	nodejsLogger.info(`Version ${runningNodejsVersion.join('.')}`);

	if (!satisfyNodejsVersion) {
		nodejsLogger.error(`Node.js version is less than ${requiredNodejsVersion.join('.')}. Please upgrade it.`, null, true);
		process.exit(1);
	}

	const configLogger = bootLogger.createSubLogger('config');
	let config;

	try {
		config = loadConfig();
	} catch (exception) {
		if (typeof exception === 'string') {
			configLogger.error(exception);
			process.exit(1);
		}
		if (exception.code === 'ENOENT') {
			configLogger.error('Configuration file not found', null, true);
			process.exit(1);
		}
		throw exception;
	}

	configLogger.succ('Loaded');

	const dbLogger = bootLogger.createSubLogger('db');

	// Try to connect to DB
	try {
		dbLogger.info('Connecting...');
		await initDb();
		const v = await getConnection().query('SHOW server_version').then(x => x[0].server_version);
		dbLogger.succ(`Connected: v${v}`);
	} catch (e) {
		dbLogger.error('Cannot connect', null, true);
		dbLogger.error(e);
		process.exit(1);
	}

	return config;
}

async function spawnWorkers(limit: number = 1) {
	const workers = Math.min(limit, os.cpus().length);
	bootLogger.info(`Starting ${workers} worker${workers === 1 ? '' : 's'}...`);
	await Promise.all([...Array(workers)].map(spawnWorker));
	bootLogger.succ('All workers started');
}

function spawnWorker(): Promise<void> {
	return new Promise(res => {
		const worker = cluster.fork();
		worker.on('message', message => {
			if (message !== 'ready') return;
			res();
		});
	});
}

/**
 * Spawn worker instance of intercom
 */
async function spawnIntercom(): Promise<ChildProcess | undefined> {
	if (process.env.INTERCOM_MODE && Number(process.env.INTERCOM_MODE) > 0) {
		brokerBootLogger.debug('Setup site daemon..');
		if (process.env.SITE_INTERCOM_ID == null || Number.isNaN(process.env.SITE_INTERCOM_ID)) {
			brokerBootLogger.error('The site id for Intercom2 is not configured. Please configure site id in .env config file.', null, true);
			process.exit(1);
		}
		if (process.env.SITE_INTERCOM_PORT == null || Number.isNaN(process.env.SITE_INTERCOM_PORT)) {
			brokerBootLogger.error('The port for Intercom2 is not configured. Please configure port in .env config file.', null, true);
			process.exit(1);
		}
		if (process.platform === 'linux' && isWellKnownPort(Number(process.env.SITE_INTERCOM_PORT)) && !isRoot()) {
			brokerBootLogger.error('You need root privileges to listen on well-known port on Linux for Intercom2', null, true);
			process.exit(1);
		}
		if (!await isPortAvailable(Number(process.env.SITE_INTERCOM_PORT))) {
			brokerBootLogger.error(`Port ${process.env.SITE_INTERCOM_PORT} for Intercom2 is already in use`, null, true);
			process.exit(1);
		}
		if (process.env.SITE_INTERCOM_HOST == null || !checkIsValidDomain(process.env.SITE_INTERCOM_HOST)) {
			brokerBootLogger.error('The host for Intercom2 is not valid. Please set a valid FQDN for host in .env config file.', null, true);
			process.exit(1);
		}

		return new Promise(res => {
			const broker = fork('./built/boot/xbroker', ['normal'], {});

			broker.on('message', function(msg) {
				if (isJson(msg)) {
					const res = JSON.parse(JSON.stringify(msg));
					if (res.boot === 'ready') {
					  intercomLogger.succ('Ready!');
					} else if (res.boot === 'error') {
						intercomLogger.error('Did not start!');
						process.exit(1);
					}
					if (res.cmd == "response") {
						brokerLogger.debug(res.result);
					}
				}
			});

			broker.on('error', function(e) {
				brokerLogger.warn(e.message);
				brokerLogger.error(e.stack as string);
			});

			broker.on('exit', function(code: number | undefined) {
				brokerLogger.warn("Exit " + code);
				process.exit(code);
			});

			brokerBootLogger.succ('Daemon worker started');
			res(broker);
		});
	} else {
		return undefined;
	}
}
