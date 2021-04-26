import { initDb } from '../db/postgre';
import { getConnection } from 'typeorm';
import IntercomBroker from '../services/intercom/intercom-broker';
import MessageIPC from '../services/intercom/message-ipc-cmd';
import { isJson, initBroker, newAddress, withdraw, transfer } from '../services/intercom/intercom-functions';
import Logger from '../services/logger';

const daemonLogger = new Logger('broker', 'green', false);
const brokerLogger = daemonLogger.createSubLogger('daemon', 'gold', false);

let intercomBroker: IntercomBroker | undefined = undefined;

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

	// Try Initialize intercom2 broker
	try {
		daemonLogger.debug('Initializing...');
		const intercomBroker : IntercomBroker | undefined = new IntercomBroker(brokerLogger);
		if (intercomBroker) {
			brokerLogger.succ(`Intercom2 initialized! Mode: [${process.env.INTERCOM_MODE}]`, null, true);
			return resolve(intercomBroker);
		} else {
			brokerLogger.error('Intercom2 failed to initialize!', null, true);
		}
	} catch (e) {
		return reject(e);
	}

	return reject(new Error('Intercom2 failed to initialize'));
});

// do initialize
init.then((result: any) => {
	if (result instanceof IntercomBroker) {
		const broker = result as IntercomBroker;
		if (broker.isReady()) {
			intercomBroker = broker;
			daemonLogger.succ('Initialized site with ID \'' + broker.getId() + '\'', null, true);
			// Send a 'ready' message to parent process
			process.send!({boot: 'ready'});
			return;
		}
	}
	daemonLogger.error('Initializion failed', null, true);
	process.send!({boot: 'error'});
	process.exit(1);
}).catch(e => {
	brokerLogger.error(e, null, true);
	process.exit(1);
});

/************************************/
// #region Events

// setup message handler event
process.on('message', async (msg) => {
	if (msg === 'master-ready') {
		// Broker Init Check..
		await initBroker(brokerLogger, intercomBroker);
		brokerLogger.succ('Systems Initialized.  Site Ready!');	/* SITE READY */
	} else if (isJson(msg) && intercomBroker) {
		const res: MessageIPC = <MessageIPC> msg;  // Message parse from ipc..
		if (res.prc === 'relay' && res.cmd === 'getNewAddress') {
			// New Address
			await newAddress(brokerLogger, intercomBroker, res);
		} else if (res.prc === 'relay' && res.cmd === 'doWithdraw') {
			// Perform Withdraw
			await withdraw(brokerLogger, intercomBroker, res);
		} else if (res.prc === 'relay' && res.cmd === 'doTransfer') {
			// Perform Internal Transfer
			await transfer(brokerLogger, intercomBroker, res);
		}
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
/************************************/
