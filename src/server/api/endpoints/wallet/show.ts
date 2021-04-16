import $ from 'cafy';
import define from '../../define';
import { ApiError } from '../../error';
import { Users, UserWalletAddresses, UserWalletBalances } from '../../../../models';
import { UserWalletAddress } from '../../../../models/entities/user-wallet-address';
import { UserWalletBalance } from '../../../../models/entities/user-wallet-balance';
import { ID } from '@/misc/cafy-id';
//import { toPunyNullable } from '../../../../misc/convert-host';
//import IntercomBroker from '../../../../services/intercom/intercom-broker';
//import { getIntercom } from '../../../../boot/master';
//import { getBroker } from '../../../../boot/xbroker';

export const meta = {
	tags: ['wallet'],

	requireCredential: true as const,

	params: {
		userId: {
			validator: $.optional.type(ID),
			desc: {
				'ja-JP': '対象のユーザーのID',
				'en-US': 'Target user ID'
			}
		},

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
			id: '7ad3fa3e-5e12-42f0-b23a-f3d13f10ee4b'
		}
	},
};

export default define(meta, async (ps, me) => {
	const user = await Users.findOne(me != null ? me.id : null);
	/*const user = await Users.findOne(ps.userId != null
		? { id: ps.userId }
		: { usernameLower: ps.username!.toLowerCase(), host: toPunyNullable(ps.host) });*/

	if (user == null) {
		throw new ApiError(meta.errors.noSuchUser);
	}

	ps.userId = user.id;
	ps.username = user.username!.toLowerCase();
	let ct = 0;

	let wallet = (await UserWalletAddresses.findOne({ userId: user.id, coinType: ct } ) as UserWalletAddress);
	let balance = (await UserWalletBalances.findOne({ userId: user.id, coinType: ct} ) as UserWalletBalance);
	//let hitstory = (await UserWalletAddresses.findOne({ userId: user.id} ) as UserWalletAddress);

	var cb: (error: Error | null) => void = (error: Error | null) => {
		if (error) {
			// errored
			console.log('getNewAddress().callback.Error');
		} else {
			console.log('getNewAddress().callback.Complete');
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

	if (!wallet) {
		if (process.send) {
			console.log('getNewAddress() requested');
			process.send({ cmd: 'getNewAddress', userId: user.id }, undefined, {}, cb);
		} else {
			console.log('getNewAddress() error');
		}
	} else {
		console.log("Wallet Exists.");
	}

	process.on('message', msg => {
		if (isJson(msg)) {
			const res = JSON.parse(JSON.stringify(msg));
			if (res.cmd === 'gotNewAddress') {
				console.log(msg);
				// TODO: cleanup..
			}
		}
	});

	process.on('message', msg => {
		if (isJson(msg)) {
			const res = JSON.parse(JSON.stringify(msg));
			if (res.cmd === 'gotNewWallet') {
				console.log(msg);
				// TODO: cleanup..
			}
		}
	});

	var accountHistory: any[] = [];
	// TODO: setup history..
	var entry6: any[] = ["X WITHDRAW", "SEND_EXT", "2021-04-15 05:40:01", 5];
	var entry5: any[] = ["RAIN CLOUD", "SEND_INT", "2021-04-15 04:20:01", 3];
	var entry4: any[] = ["RAIN DROPS", "RECEIVE", "2021-04-15 03:40:01", 0.1];
	var entry3: any[] = ["TIP INMATE", "RECEIVE", "2021-04-15 02:40:01", 0.5];
	var entry2: any[] = ["TIP INMATE", "SEND_INT", "2021-04-15 01:40:01", 1];
	var entry1: any[] = ["DEPOSIT IN", "RECEIVE", "2021-04-14 02:40:01", 10];
	accountHistory.push(entry1);
	accountHistory.push(entry2);
	accountHistory.push(entry3);
	accountHistory.push(entry4);
	accountHistory.push(entry5);
	accountHistory.push(entry6);

	var data = {
		account: wallet,
		balance: balance.balance,
		pending: 0.0,
		server: {
			status: "Online",
			synced: true,
			latency: 0,
		},
		walletHist: accountHistory,
	};

	return data;
});
