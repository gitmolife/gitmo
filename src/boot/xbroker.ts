import { initDb } from '../db/postgre';
import { getConnection } from 'typeorm';
import IntercomBroker from '../services/intercom/intercom-broker';
import Logger from '../services/logger';

const daemonLogger = new Logger('broker', 'green', false);
const brokerLogger = daemonLogger.createSubLogger('daemon', 'gold', false);

/**
 * Initialize worker process
 */
const init = new Promise<void>( async (resolve: (result: any) => any, reject: (e: Error) => any) => {
	daemonLogger.debug('Creating..');
	const dbLogger = daemonLogger.createSubLogger('db');

	// Try to connect to DB
	try {
		dbLogger.info('Connecting...');
		await initDb();
		const v = await getConnection().query('SHOW server_version').then(x => x[0].server_version);
		dbLogger.succ(`Connected: v${v}`);
	} catch (e) {
		dbLogger.error('Cannot connect', null, true);
		dbLogger.error(e);
		return reject(e);
	}

	try {
		daemonLogger.debug('Initializing...');
		// Initialize intercom2 broker
		const intercomBroker : IntercomBroker | undefined = new IntercomBroker(brokerLogger);
		if (intercomBroker) {
			brokerLogger.succ(`Intercom2 initialized! Mode: [${process.env.INTERCOM_MODE}]`, null, true);
		} else {
			brokerLogger.error('Intercom2 failed to initialize!', null, true);
			return reject(new Error('Intercom2 failed to initialize'));
		}

		// #region Events

		// setup message handler event
		process.on('message', (msg) => {
			if (msg === 'master-ready') {
				brokerLogger.succ('Site Ready');
			} else if (msg.cmd = 'getNewAddress') {
				brokerLogger.debug('getNewAddress()');
				brokerLogger.debug(msg.userId);
				var data = msg.userId;
				var cb = new Function('return ' + msg.callback)();
				cb(data, function(err: string, result: string) {
					process.send!({
						cmd: 'response',
						err: err,
						result: result
					});
				});
			}
		});

		// setup error catches
		process.on('uncaughtException', (e) => {
				brokerLogger.error('Exception [pid=' + process.pid.toString() + '] at: ' + e, null, true);
				process.exit(1);
		});

		process.on('warning', (e) => {
				brokerLogger.error('Error [pid=' + process.pid.toString() + '] at: ' + e, null, true);
		});

		// setup exit
		process.on('exit', (code: number | undefined) => {
				brokerLogger.info('Exit [pid=' + process.pid.toString() + '] with code: ' + code);
				daemonLogger.succ('Stopped');
				process.exit(code);
		});

		//#endregion

		return resolve(intercomBroker);
	} catch (e) {
		return reject(e);
	}
});

// do initialize
init.then((result: any) => {
	if (result instanceof IntercomBroker) {
		const broker = result as IntercomBroker;
		if (broker.isReady()) {
			daemonLogger.succ('Initialized ID \'' + broker.getId() + '\'', null, true);
			// Send a 'ready' message to parent process
			process.send!({boot: 'ready'});
			return;
		}
	}
	daemonLogger.error('Initializion failed', null, true);
	process.send!({boot: 'error'});
	process.exit(1);
}).catch(e => {
	brokerLogger.error(e, null, true)
	process.exit(1);
});
