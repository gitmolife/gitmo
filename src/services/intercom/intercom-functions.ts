/*
 * Copyright 2020-2021 Cryptech Services
 *
 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 *
 */

import { getConnection } from 'typeorm';
import Logger from '../logger';
import MessageIPC from './message-ipc-cmd';
import IntercomBroker from './intercom-broker';

// Root Account Label for Site Internal Wallet.
const siteID: string = 'system-pool_root';

// Init Broker Check
export async function initBroker(brokerLogger: Logger, intercomBroker?: IntercomBroker): Promise<void> {
	if (!intercomBroker) {
		return;
	}
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
		.where({ userId: siteID })
		.getOne();
	if (siteAddress) {
		brokerLogger.info('>> Site balance: ' + siteAddress.balance + ' with address: ' + siteAddress.address);
	} else {
		let cb = (error: Error | null, data: any) => {
			if (error) {
				brokerLogger.error(error);
			} else {
				let address = JSON.stringify(data);
				brokerLogger.succ('>> Created System Root Address: ' + address);
				getConnection()
					.createQueryBuilder()
					.insert()
					.into('user_wallet_address')
					.values([
							{ userId: siteID, address: data }
					 ])
					.execute();
				getConnection()
					.createQueryBuilder()
					.insert()
					.into('user_wallet_balance')
					.values([
							{ userId: siteID }
					 ])
					.execute();
				process.send!({cmd: 'gotNewAddress', address: data});
			}
		};
		brokerLogger.warn('> Site Wallet Missing!  Attempting to create..');
		/* GET ADDRESS */
		intercomBroker!.getNewAddress(siteID, cb);
	}
};

// Generate New Wallet Address
export async function newAddress(brokerLogger: Logger, intercomBroker: IntercomBroker, cmd: MessageIPC): Promise<void> {
	if (!intercomBroker) {
		return;
	}
	brokerLogger.debug('newAddress() ' + cmd.dat.userId);
	let cb = async (error: Error | null, data: any) => {
		if (error) {
			brokerLogger.error(error);
		} else {
			let address = JSON.stringify(data);
			brokerLogger.debug('newAddress().callback() ' + address);
			await getConnection()
				.createQueryBuilder()
				.insert()
				.into('user_wallet_address')
				.values([
						{ userId: cmd.dat.userId, address: data }
				 ])
				.execute();
			await getConnection()
				.createQueryBuilder()
				.insert()
				.into('user_wallet_balance')
				.values([
						{ userId: cmd.dat.userId }
				 ])
				.execute();
		}
	};
	/* GET ADDRESS */
	intercomBroker!.getNewAddress(cmd.dat.userId, cb);
};

// Execute Wallet Withdraw
export async function withdraw(brokerLogger: Logger, intercomBroker: IntercomBroker, cmd: MessageIPC): Promise<void> {
	if (!intercomBroker) {
		return;
	}
	brokerLogger.debug('withdraw() ' + cmd.dat.address);
	let jobId = Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5);
	let uid: string = cmd.dat.userId;
	let outAddress: string = cmd.dat.address;
	let amount = parseFloat(cmd.dat.amount);
	const xfee = '0.00001100';
	let amountFee = parseFloat(xfee) + amount;
	// Get current Balance..
	const userAddress = await getConnection()
		.createQueryBuilder()
		.select("user_wallet_address")
		.from('user_wallet_address')
		.where({ userId: uid })
		.getOne();
	let cb = async (error: Error | null, data: any) => {
		if (error) {
			//brokerLogger.error(error);
			// Create Job
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
			brokerLogger.debug('withdraw().callback() ' + json.txid);
			let rfee: number = (parseFloat(json.fee) * 0.000000001);
			let ibal: number = parseFloat(userAddress.balance);
			let nbal: number = ibal - (amount + rfee);
			// Update Balance..
			await getConnection()
				.createQueryBuilder()
				.update('user_wallet_address')
				.set({
					balance: nbal,
				})
				.where({ userId: uid })
				.execute();
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
					txtype: 4,
					processed: 1,
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
					userId: uid,
					txid: json.txid,
					address: userAddress.address,
					coinType: 0,
					txtype: 13,
					processed: 1,
					amount: 0,
					complete: false,
				})
				.execute();
			// Create Job
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
			{ address: outAddress, amount: (amount * 100000000).toFixed(0) },
		],
		changeAddress: changeAddress,
	};
	/* TRANSFER FUNDS */
	intercomBroker!.sendFunds(trq, cb);
};

// Execute Internal Transfer
export async function transfer(brokerLogger: Logger, intercomBroker: IntercomBroker, cmd: MessageIPC): Promise<void> {
	if (!intercomBroker) {
		return;
	}
	brokerLogger.debug('doTransfer() ' + cmd.dat.address);
	let jobId = Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5);
	let type: string = cmd.dat.type;
	let uid: string = cmd.dat.userId;
	let outAddress: string = cmd.dat.address;
	let amount = parseFloat(cmd.dat.amount);
	const xfee = '0.00071750';
	let amountFee = amount + parseFloat(xfee);
	const siteAddress = await getConnection()
		.createQueryBuilder()
		.select("user_wallet_address")
		.from('user_wallet_address')
		.where({ userId: siteID })
		.getOne();
	let cb = async (error: Error | null, data: any) => {
		if (error) {
			//brokerLogger.error(error);
			// Create Job
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
			// Setup Balances..
			let ubal: number = parseFloat(userBalance.balance);
			let abal: number = parseFloat(userAddress.balance);
			let sbal: number = parseFloat(siteAddress.balance);
			let nbal_user: number = 0;
			let nbal_addr: number = 0;
			let nbal_site: number = 0;
			// Check Type, Log Updates.
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
						userId: siteID,
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
						userId: siteID,
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
						userId: siteID,
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
			// Create Job
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
		let amountSend: string = (parseFloat(amount) * 100000000).toFixed(0);
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
		let amountSend: string = (parseFloat(amount) * 100000000).toFixed(0);
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
};

export function isJson(item: any) {
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
