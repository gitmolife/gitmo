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
process.on('message', async (msg) => {
	const sid: string = 'system-pool_root';
	if (msg === 'master-ready') {
		const addressCount = await getConnection()
			.createQueryBuilder()
			.select("user_wallet_address")
			.from('user_wallet_address')
			.where({ active: true })
			.getCount();
		brokerLogger.info('>> Site contains: ' + addressCount + ' active address accounts.');
		const siteAddress = await getConnection()
			.createQueryBuilder()
			.select("user_wallet_address")
			.from('user_wallet_address')
			.where({ userId: sid })
			.getOne();
		if (siteAddress) {
			brokerLogger.info('>> Site balance: ' + siteAddress.balance + ' with address: ' + siteAddress.address);
		} else {
			var cb = (error: Error | null, data: any) => {
				if (error) {
					brokerLogger.error(error);
				} else {
					let address = JSON.stringify(data);
					brokerLogger.info('>> Created System Root Address: ' + address);
					getConnection()
						.createQueryBuilder()
						.insert()
						.into('user_wallet_address')
						.values([
								{ userId: sid, address: data }
						 ])
						.execute();
					getConnection()
						.createQueryBuilder()
						.insert()
						.into('user_wallet_balance')
						.values([
								{ userId: sid }
						 ])
						.execute();
					process.send!({cmd: 'gotNewAddress', address: data});
				}
			};
			brokerLogger.warn('> Site Wallet Missing!  Attempting to create..');
			/* GET ADDRESS */
			intercomBroker!.getNewAddress(sid, cb);
		}
		/*SITE READY */
		brokerLogger.succ('Site Ready');
	} else if (isJson(msg)) {
		const res = JSON.parse(JSON.stringify(msg));
		// FIXME: Clean this up!!
		if (res.prc === 'relay' && res.cmd === 'getNewAddress') {
			brokerLogger.debug('getNewAddress() ' + res.userId);
			var cb = async (error: Error | null, data: any) => {
				if (error) {
					brokerLogger.error(error);
				} else {
					let address = JSON.stringify(data);
					brokerLogger.debug('gotNewAddress() ' + data);
					await getConnection()
						.createQueryBuilder()
						.insert()
						.into('user_wallet_address')
						.values([
								{ userId: res.userId, address: address }
						 ])
						.execute();
					await getConnection()
						.createQueryBuilder()
						.insert()
						.into('user_wallet_balance')
						.values([
								{ userId: res.userId }
						 ])
						.execute();
					//process.send!({cmd: 'gotNewAddress', address: data});
				}
			};
			/* GET ADDRESS */
			intercomBroker!.getNewAddress(res.userId, cb);
		} else if (res.prc === 'relay' && res.cmd === 'doWithdraw') {
				brokerLogger.debug('doWithdraw() ' + res.dat.address);
				let uid: string = res.dat.userId;
				let outAddress: string = res.dat.address;
				let amount = parseFloat(res.dat.amount);
				const xfee = '0.00001100';
				let amountFee = parseFloat(xfee) + amount;
				// Get current Balance..
				const userAddress = await getConnection()
					.createQueryBuilder()
					.select("user_wallet_address")
					.from('user_wallet_address')
					.where({ userId: uid })
					.getOne();
				var cb = async (error: Error | null, data: any) => {
					if (error) {
						//brokerLogger.error(error);
						//process.send!({cmd: 'doneWithdraw', prc: 'relay', response: error});
						// Create Job
						let jobId =  Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5);
						await getConnection()
							.createQueryBuilder()
							.insert()
							.into('user_wallet_job')
							.values({
								userId: uid,
								job: 'WITHDRAW_FINAL',
								type: 'ohmcoin',
								state: 0,
								data: jobId,
								result: { error: error.toString(), data: null },
							})
							.execute();
					} else {
						let json = JSON.parse(data);
						brokerLogger.debug('doneWithdraw() ' + json.txid);
						let rfee: number = (parseFloat(json.fee) * 0.000000001);
						// Update Balance..
						let ibal: number = parseFloat(userAddress.balance);
						let nbal: number = ibal - (amount + rfee);
						await getConnection()
							.createQueryBuilder()
							.update('user_wallet_address')
							.set({
								balance: nbal,
							})
							.where({ userId: uid })
							.execute();
						// Add Tx Entry... User
						console.log(amount);
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
								complete: true,
							})
							.execute();
						// Add Tx Entry... Change
						await getConnection()
							.createQueryBuilder()
							.insert()
							.into('user_wallet_tx')
							.values({
								//userId: uid,
								txid: json.txid,
								address: userAddress.address,
								coinType: 0,
								txtype: 3,
								processed: 3,
								amount: amount,
								complete: false,
							})
							.execute();
						//process.send!({cmd: 'doneWithdraw', prc: 'relay', address: data});
						// Create Job
						let jobId =  Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5);
						await getConnection()
							.createQueryBuilder()
							.insert()
							.into('user_wallet_job')
							.values({
								userId: uid,
								job: 'WITHDRAW_FINAL',
								type: 'ohmcoin',
								state: 0,
								data: jobId,
								result: { error: null, data: data },
							})
							.execute();
					}
				};
				let inAddress: string = userAddress.address;
				let changeAddress: string = userAddress.address;
				let trq: TransactionRequest = {
	        senders: [inAddress],
	        recipients: [
	          { address: outAddress, amount: (amountFee * 100000000).toFixed(0) },
	        ],
	        changeAddress: changeAddress,
	      };
				/* TRANSFER FUNDS */
				intercomBroker!.sendFunds(trq, cb);
		} else if (res.prc === 'relay' && res.cmd === 'doTransfer') {
				brokerLogger.debug('doTransfer() ' + res.dat.address);
				let type: string = res.dat.type;
				let uid: string = res.dat.userId;
				let outAddress: string = res.dat.address;
				let amount = parseFloat(res.dat.amount);
				const xfee = '0.00007700';
				let amountFee = amount + parseFloat(xfee);
				const siteAddress = await getConnection()
					.createQueryBuilder()
					.select("user_wallet_address")
					.from('user_wallet_address')
					.where({ userId: sid })
					.getOne();
				var cb = async (error: Error | null, data: any) => {
					if (error) {
						//brokerLogger.error(error);
						// Create Job
						let jobId =  Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5);
						await getConnection()
							.createQueryBuilder()
							.insert()
							.into('user_wallet_job')
							.values({
								userId: uid,
								job: 'TRANSFER_FINAL',
								type: 'ohmcoin',
								state: 0,
								data: jobId,
								result: { error: error.toString(), data: null },
							})
							.execute();
						//process.send!({cmd: 'doneTransfer', prc: 'relay', response: error});
					} else {
						let json = JSON.parse(data);
						brokerLogger.debug('doneTransfer() ' + json.txid);
						let rfee: number = (parseFloat(json.fee) * 0.000000001);
						// Get current Balance..
						const userAddress = await getConnection()
							.createQueryBuilder()
							.select("user_wallet_address")
							.from('user_wallet_address')
							.where({ userId: uid })
							.getOne();
						// Get site current Balance..
						const siteAddress = await getConnection()
							.createQueryBuilder()
							.select("user_wallet_address")
							.from('user_wallet_address')
							.where({ userId: 'system-pool_root' })
							.getOne();
						// Get current Balance..
						const userBalance = await getConnection()
							.createQueryBuilder()
							.select("user_wallet_balance")
							.from('user_wallet_balance')
							.where({ userId: uid })
							.getOne();

						let ubal: number = parseFloat(userBalance.balance);
						let abal: number = parseFloat(userAddress.balance);
						let sbal: number = parseFloat(siteAddress.balance);
						let nbal_user: number = 0;
						let nbal_addr: number = 0;
						let nbal_site: number = 0;
						if (type === 'ohm') {
							// Update Balance..
							nbal_user = ubal - amountFee;
							nbal_addr = abal + (amount - rfee);
							nbal_site = sbal - amount;
							// Add Tx Entry... User
							await getConnection()
								.createQueryBuilder()
								.insert()
								.into('user_wallet_tx')
								.values({
									userId: uid,
									txid: json.txid,
									address: outAddress,
									coinType: 0,
									txtype: 10,
									processed: 1,
									amount: amount,
									complete: true,
								})
								.execute();
							// Add Tx Entry... Site
							await getConnection()
								.createQueryBuilder()
								.insert()
								.into('user_wallet_tx')
								.values({
									userId: sid,
									txid: json.txid,
									address: siteAddress.address,
									coinType: 0,
									txtype: 21,
									processed: 0,
									amount: -amount,
									complete: true,
								})
								.execute();
							// Add Tx Entry... Change
							await getConnection()
								.createQueryBuilder()
								.insert()
								.into('user_wallet_tx')
								.values({
									userId: sid,
									txid: json.txid,
									address: siteAddress.address,
									coinType: 0,
									txtype: 20,
									processed: 0,
									amount: 0,
									complete: true,
								})
								.execute();
							// Update system network balance
							getConnection()
							.createQueryBuilder()
							.update('user_wallet_address')
							.set({
								balance: nbal_site,
							})
							.where({ userId: 'system-pool_root' })
							.execute();
							// Update user network balance
							getConnection()
							.createQueryBuilder()
							.update('user_wallet_address')
							.set({
								balance: nbal_addr,
							})
							.where({ userId: uid })
							.execute();
						} else if (type === 'om') {
							// Update Balance..
							nbal_user = ubal + (amount - rfee);
							nbal_addr = abal - amount;
							nbal_site = sbal + amount;
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
									txtype: 11,
									processed: 1,
									amount: -amount,
									complete: true,
								})
								.execute();
							// Add Tx Entry... Site
							await getConnection()
								.createQueryBuilder()
								.insert()
								.into('user_wallet_tx')
								.values({
									userId: sid,
									txid: json.txid,
									address: siteAddress.address,
									coinType: 0,
									txtype: 20,
									processed: 0,
									amount: amount,
									complete: true,
								})
								.execute();
							// Add Tx Entry... Change
							await getConnection()
								.createQueryBuilder()
								.insert()
								.into('user_wallet_tx')
								.values({
									userId: uid,
									txid: json.txid,
									address: siteAddress.address,
									coinType: 0,
									txtype: 21,
									processed: 0,
									amount: 0,
									complete: true,
								})
								.execute();
							// Update user network balance
							getConnection()
							.createQueryBuilder()
							.update('user_wallet_address')
							.set({
								balance: nbal_addr,
							})
							.where({ userId: uid })
							.execute();
							// Update system network balance
							getConnection()
							.createQueryBuilder()
							.update('user_wallet_address')
							.set({
								balance: nbal_site,
							})
							.where({ userId: 'system-pool_root' })
							.execute();
						}
						// Update user site balance
						getConnection()
							.createQueryBuilder()
							.update('user_wallet_balance')
							.set({
								balance: nbal_user,
							})
							.where({ userId: uid })
							.execute();
						//process.send!({cmd: 'doneTransfer', prc: 'relay', response: data});
						// Create Job
						let jobId =  Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5);
						await getConnection()
							.createQueryBuilder()
							.insert()
							.into('user_wallet_job')
							.values({
								userId: uid,
								job: 'TRANSFER_FINAL',
								type: 'ohmcoin',
								state: 0,
								data: jobId,
								result: { error: null, data: data },
							})
							.execute();
					}
				};

				if (type === 'ohm') {
					// Check Balance..
					if (amountFee > siteAddress.balance) {
						brokerLogger.error("Amount is greater than Site balance!! " + amount + " > " + siteAddress.balance);
						return;
					}
					// convert om to ohm
					let inAddress: string = siteAddress.address;
					let changeAddress: string = siteAddress.address;
					let amountSend: string = (parseFloat(amountFee) * 100000000).toFixed(0);
					let trq: TransactionRequest = {
						senders: [inAddress],
						recipients: [
							{ address: outAddress, amount: amountSend },
						],
						changeAddress: changeAddress,
					};
					/* TRANSFER FUNDS */
					intercomBroker!.sendFunds(trq, cb);
				} else if (type === 'om') {
					// convert ohm to om
					let inAddress: string = siteAddress.address;
					let changeAddress: string = outAddress;
					let amountSend: string = (parseFloat(amountFee) * 100000000).toFixed(0);
					let trq: TransactionRequest = {
						senders: [outAddress],
						recipients: [
							{ address: inAddress, amount: amountSend },
						],
						changeAddress: changeAddress,
					};
					/* TRANSFER FUNDS */
					intercomBroker!.sendFunds(trq, cb);
				} else {
					brokerLogger.error("Non matching Transfer Type!");
				}
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
