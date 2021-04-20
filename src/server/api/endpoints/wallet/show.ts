import $ from 'cafy';
import define from '../../define';
import { ApiError } from '../../error';
import { Users, UserWalletAddresses, UserWalletBalances, UserWalletStatuses, UserWalletTxs } from '../../../../models';
import { UserWalletAddress } from '../../../../models/entities/user-wallet-address';
import { UserWalletBalance } from '../../../../models/entities/user-wallet-balance';
import { UserWalletStatus } from '../../../../models/entities/user-wallet-status';
import { UserWalletTx } from '../../../../models/entities/user-wallet-tx';
import { ID } from '@/misc/cafy-id';
import { getConnection } from 'typeorm';

export const meta = {
	tags: ['wallet'],

	requireCredential: true as const,

	params: {
		username: {
			validator: $.optional.str
		},

		host: {
			validator: $.optional.nullable.str
		},
	},

	res: {
		type: 'object' as const,
		optional: false as const, nullable: false as const,
		ref: 'Wallet',
	},

	errors: {
		noSuchUser: {
			message: 'No such user.',
			code: 'NO_SUCH_USER',
			id: '88b36214-5918-4cec-be59-df48a42c53d7'
		}
	},
};

export default define(meta, async (ps, me) => {
	const user = await Users.findOne(me != null ? me.id : null);

	if (user == null) {
		throw new ApiError(meta.errors.noSuchUser);
	}

	ps.userId = user.id;
	ps.username = user.username!.toLowerCase();
	let ct = 0;

	// TODO: move to config
	let explorer: string = 'http://explorer.ohm.sqdmc.net/';

	let status: UserWalletStatus = (await UserWalletStatuses.findOne({ type: "ohmcoin" } ) as UserWalletStatus);
	let wallet = (await UserWalletAddresses.findOne({ userId: user.id, coinType: ct } ) as UserWalletAddress);
	let balance = (await UserWalletBalances.findOne({ userId: user.id, coinType: ct} ) as UserWalletBalance);
	let bOnline = status != null ? status.online : false;
	let bSynced = status != null ? status.synced : false;

	var cb: (error: Error | null) => void = (error: Error | null) => {
		if (error) {
			// errored
			console.error('getNewAddress().callback.Error: ' + error.toString());
		} else {
			//console.log('getNewAddress().callback.Complete');
		}
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

	if (!wallet && bOnline) {
		if (process.send) {
			//console.log('getNewAddress() requested');
			process.send({ prc: 'relay', cmd: 'getNewAddress', userId: user.id }, undefined, {}, cb);
		} else {
			console.error('getNewAddress() error');
		}
	} else if (bOnline) {
		if (wallet.address.length > 36 || wallet.address.length <= 31 || (wallet.address.indexOf('\'') >= 0 || wallet.address.indexOf('"') >= 0)) {
			console.warn('getNewAddress(): Regenerating user address..');
			// TODO: don't delete? mark as invalid..
			await getConnection()
		    .createQueryBuilder()
		    .delete("user_wallet_address")
		    .from('user_wallet_address')
		    .where({ userId: user.id })
		    .execute();
			await getConnection()
		    .createQueryBuilder()
		    .delete("user_wallet_balance")
		    .from('user_wallet_balance')
		    .where({ userId: user.id })
		    .execute();
			if (process.send) {
				//console.log('getNewAddress() requested');
				process.send({ prc: 'relay', cmd: 'getNewAddress', userId: user.id }, undefined, {}, cb);
			} else {
				console.error('getNewAddress() regen error');
			}
		}
		//console.log("Wallet Exists.");
	}

	let history = await getConnection()
						.createQueryBuilder()
						.select("user_wallet_tx")
						.from('user_wallet_tx')
						.where({ userId: user.id })
						.getMany();

	var accountHistory: any[] = [];
	var pending: number = 0;
	var i: number = 0;
	for (var h of history) {
		var a = "N/A";
		var t = "UNKNOWN";
		var date = new Date(h.createdAt).toLocaleString();
		var amt = h.amount;
		if (h.txtype === 1 || h.txtype === 3) {
			a = "IN";
			t = "DEPOSIT";
			if (!h.complete) {
				pending = pending + parseFloat(h.amount);
			}
		} else if (h.txtype === 2 || h.txtype === 4) {
			t = "WITHDRAW";
			a = "OUT";
			amt = '-' + h.amount;
		} else if (h.txtype === 10) {
			t = "LOCAL-Tx";
			a = "IN+";
			if (!h.complete) {
				pending = pending + parseFloat(h.amount);
			}
		} else if (h.txtype === 11) {
			t = "CACHE-TIP";
			a = "SITE";
		} else if (h.txtype === 13) {
			t = "LOCAL";
			a = "SYNC";
			amt = '~' + h.amount;
		} else if (h.txtype === 20) {
				continue;
		} else if (h.txtype === 21) {
				continue;
		}
		var entry: any[] = [ i++, a, t, date, amt, h.txid ];
		accountHistory.push(entry);
	}

	if (wallet) {
		accountHistory.sort(function(a, b) {
		  var keyA = new Date(a[3]);
	    var keyB = new Date(b[3]);
		  if (keyA < keyB) return -1;
		  if (keyA > keyB) return 1;
		  return 0;
		});
		let stat: string = status.online && status.synced ? "Online" : status.online ? "Synchronizing" : "Offline";
		var data = {
			explorer: explorer,
			account: wallet.address,
			balance: {
				total: (parseFloat(wallet.balance) + parseFloat(balance.balance)).toFixed(8),
				pending: (pending).toFixed(8),
				network: wallet.balance,
				tipping: balance.balance,
			},
			server: {
				online: status.online,
				status: stat,
				synced: status.synced,
				crawling: status.crawling,
				height: status.blockheight,
				time: status.blocktime
			},
			walletHist: accountHistory.reverse(),
		};
		return data;
	} else {
		let stat: string = status.online && status.synced ? "Online" : status.online ? "Synchronizing" : "Offline";
		var data = {
			explorer: explorer,
			account: this.bOnline ? 'Please Reload Page' : 'Please Try Again Later..',
			balance: {
				total: 0,
				pending: 0,
				network: 0,
				tipping: 0,
			},
			server: {
				online: status.online,
				status: stat,
				synced: status.synced,
				crawling: status.crawling,
				height: status.blockheight,
				time: status.blocktime
			},
			walletHist: accountHistory,
		};
		return data;
	}

});
