import { initDb } from '../db/postgre';
import { getConnection } from 'typeorm';
import IntercomBroker from '../services/intercom/intercom-broker';
import Logger from '../services/logger';

const daemonLogger = new Logger('broker', 'green', false);
const brokerLogger = daemonLogger.createSubLogger('daemon', 'gold', false);

// intercom broker
let intercomBroker : IntercomBroker | undefined;

/**
 * Get Intercom Broker
 */
/*export function getBroker(): IntercomBroker | undefined {
	return intercomBroker;
}*/

// Broker Start
export default init();

/**
 * Initialize worker process
 */
async function init() {
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
		process.exit(1);
	}

	daemonLogger.debug('Initializing...');
	// Initialize intercom2 broker
	intercomBroker = new IntercomBroker(brokerLogger);
	if (intercomBroker) {
		brokerLogger.succ(`Intercom2 initialized! Mode: [${process.env.INTERCOM_MODE}]`);
	} else {
		brokerLogger.error('Intercom2 failed to initialize!');
	}

	if (intercomBroker.isReady()) {
		daemonLogger.succ('Initialized');
		// Send a 'ready' message to parent process
		process.send!({boot: 'ready'});
	} else {
		daemonLogger.error('Initializion failed');
		process.send!({boot: 'error'});
	}

	// Event Setups
	process.on('message', (msg) => {
		if (msg === 'master-ready') {
			brokerLogger.succ('Site Ready');
		}
	});

	process.on('error', (e) => {
			brokerLogger.error('Error: ' + e);
			process.exit(1);
	});

	process.on('exit', (code) => {
			brokerLogger.info('Exit with code: ' + code);
			daemonLogger.succ('Stopped');
			process.exit(0);
	});
}
