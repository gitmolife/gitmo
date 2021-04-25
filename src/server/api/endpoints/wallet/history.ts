import $ from 'cafy';
import define from '../../define';
import { ApiError } from '../../error';
import { Users } from '../../../../models';
import { UserWalletTx } from '../../../../models/entities/user-wallet-tx';
import { getConnection } from 'typeorm';

export const meta = {
	tags: ['wallet'],

	requireCredential: true as const,

	params: {
		limit: {
			validator: $.optional.nullable.number,
			desc: {
				'ja-JP': '',
				'en-US': 'Query Limit'
			}
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
	const user = await Users.findOne(me.id);
	if (user == null) {
		throw new ApiError(meta.errors.noSuchUser);
	}

	const confirmsRequired: number = 7;
	let limit = ps.limit && ps.limit <= 500 ? ps.limit : 500;
	let history: UserWalletTx[] = await getConnection()
						.createQueryBuilder()
						.select('user_wallet_tx')
						.from(UserWalletTx, 'user_wallet_tx')
						.where({ userId: user.id })
						.limit(limit)
						.getMany() as UserWalletTx[];

	var accountHistory: any[] = [];
	var pending: number = 0;
	var i: number = 0;
	for (var h of history) {
		var a = "N/A";
		var t = "UNKNOWN";
		var dt = new Date(h.createdAt).toISOString().split('.')[0].split('T');
		var date = dt[0];
		var time = dt[1];
		var amt: string = '' + h.amount;
		var conf: number = h.confirms;
		if (conf > 999) {
			conf = 999;
		}
		if (h.txtype === 1 || h.txtype === 3) {
			a = "IN";
			t = "DEPOSIT";
			if (!h.complete) {
				pending = pending + h.amount;
			}
		} else if (h.txtype === 2 || h.txtype === 4) {
			t = "WITHDRAW";
			a = "OUT";
		} else if (h.txtype === 10) {
			t = "LOCAL-Tx";
			a = "IN+";
			if (!h.complete) {
				pending = pending + h.amount;
			}
		} else if (h.txtype === 11) {
			t = "Tx->TIPS";
			a = "SITE";
		} else if (h.txtype === 13) {
			t = "TxCHANGE";
			a = "SYNC";
			amt = '~' + h.amount;
		} else if (h.txtype === 20) {
			continue;
		} else if (h.txtype === 21) {
			continue;
		} else if (h.txtype === 50) {
			t = "UNKNOWN";
			a = "TIP";
		} else if (h.txtype === 51) {
			t = "RECEIVED";
			a = "TIP";
		} else if (h.txtype === 52) {
			t = "SENT-TIP";
			a = "TIP";
		}
		var entry: any[] = [ i++, a, t, date, amt, h.txid, conf, time ];
		accountHistory.push(entry);
	}

	if (accountHistory) {
		accountHistory.sort(function(a, b) {
			var keyA = new Date(a[3] + ' ' + a[7]);
			var keyB = new Date(b[3] + ' ' + b[7]);
			if (keyA < keyB) return -1;
			if (keyA > keyB) return 1;
			return 0;
		});
		return { history: accountHistory.reverse(), balance: { pending: Number(pending).toFixed(8), }, confRequire: confirmsRequired };
	} else {
		return { history: [], balance: { pending: 0, confRequire: confirmsRequired }, };
	}
});
