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

	let wallet = (await UserWalletAddresses.findOne({ userId: user.id, coinType: ct } ) as UserWalletAddress);
	let balance = (await UserWalletBalances.findOne({ userId: user.id, coinType: ct} ) as UserWalletBalance);

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

	let status: UserWalletStatus = (await UserWalletStatuses.findOne({ type: "ohmcoin" } ) as UserWalletStatus);
	//let history = await UserWalletTxs.findMany({ userId: user.id } );
	let history = await getConnection()
						.createQueryBuilder()
						.select("user_wallet_tx")
						.from('user_wallet_tx')
						.where({ userId: user.id })
						.getMany();

	var accountHistory: any[] = [];
	var pending: number = 0;
	for (var h of history) {
		var a = "DEPOSIT IN";
		var t = "RECEIVE";
		var date = h.createdAt;
		var amt = h.amount;
		if (h.txtype === 2 || h.txtype === 4) {
			t = "SEND_EXT";
			a = "X WITHDRAW";
			amt = '-' + h.amount;
		} else {
			if (!h.complete) {
				pending = pending + parseFloat(h.amount);
			}
		}
		var entry: any[] = [ a, t, date, amt ];
		accountHistory.push(entry);
	}

	var data = {
		account: wallet,
		balance: balance.balance,
		pending: pending,
		server: {
			status: status.online ? "Online" : "Offline",
			synced: status.synced,
			crawling: status.crawling,
			height: status.blockheight,
			time: status.blocktime
		},
		walletHist: accountHistory,
	};

	return data;
});
