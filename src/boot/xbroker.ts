import { initDb } from '../db/postgre';
import { getConnection } from 'typeorm';
import IntercomBroker from '../services/intercom/intercom-broker';
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
			intercomBroker = broker;
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
	brokerLogger.error(e, null, true);
	process.exit(1);
});

/************************************/
// #region Events

// setup message handler event
process.on('message', (msg) => {
	if (msg === 'master-ready') {
		brokerLogger.succ('Site Ready');
	} else if (isJson(msg)) {
		const res = JSON.parse(JSON.stringify(msg));
		if (res.cmd === 'getNewAddress') {
			brokerLogger.debug('getNewAddress() ' + res.userId);
			var cb = (error: Error | null, data: any) => {
				if (error) {
					brokerLogger.error(error);
				} else {
					let address = JSON.stringify(data);
					brokerLogger.debug('gotNewAddress() ' + address);
					getConnection()
						.createQueryBuilder()
						.insert()
						.into('user_wallet_address')
						.values([
								{ userId: res.userId, address: data }
						 ])
						.execute();
					process.send!({cmd: 'gotNewAddress', address: data});
					getConnection()
						.createQueryBuilder()
						.insert()
						.into('user_wallet_balance')
						.values([
								{ userId: res.userId }
						 ])
						.execute();
					process.send!({cmd: 'gotNewWallet', address: data});
				}
			};
			intercomBroker!.getNewAddress(res.userId, cb);
		} else if (res.cmd === 'doWithdraw') {
				brokerLogger.info('doWithdraw() ' + res.data.address);
				let uid: string = res.data.userId;
				let outAddress: string = res.data.address;
				let amount: number = parseFloat(res.data.amount);
				var cb = async (error: Error | null, data: any) => {
					if (error) {
						brokerLogger.error(error);
					} else {
						let json = JSON.parse(data);
						brokerLogger.debug('doneWithdraw() ' + data);

						// Get current Balance..
						const userBalance = await getConnection()
							.createQueryBuilder()
							.select("user_wallet_balance")
							.from('user_wallet_balance')
							.where({ userId: uid })
							.getOne();
						// Update Balance..
						let ibal: number = parseFloat(userBalance.balance);
						let nbal: number = ibal - amount;
						await getConnection()
							.createQueryBuilder()
							.update('user_wallet_balance')
							.set({
								balance: nbal,
							})
							.where({ userId: uid })
							.execute();
						// Add Tx Entry...
						await getConnection()
							.createQueryBuilder()
							.insert()
							.into('user_wallet_tx')
							.values({
								userId: uid,
								txid: json.txid,
								address: outAddress,
								coinType: 0,
								txtype: 4,
								processed: 3,
								amount: amount,
								complete: false,
							})
							.execute();
						process.send!({cmd: 'doneWithdraw', address: data});
					}
				};

				// TODO: establish root account handle..
				let inAddress: string = "ZMo5naJ4wUKqX9gKeFUSzyheobgFkbXE6G";
				let changeAddress: string = "ZK9k3RkP6GzUNTMdMuk11q7zCoDFbXBbqy";
				let trq: TransactionRequest = {
	        senders: [inAddress],
	        recipients: [
	          { address: outAddress, amount: (amount * 100000000) },
	        ],
	        changeAddress: changeAddress,
	      };
				console.log(trq);
				intercomBroker!.sendFunds(trq, cb);
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
