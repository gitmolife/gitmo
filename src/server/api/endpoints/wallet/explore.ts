import $ from 'cafy';
import define from '../../define';
import { ApiError } from '../../error';
import { Users, UserWalletAddresses } from '../../../../models';
import { UserWalletAddress } from '../../../../models/entities/user-wallet-address';
import fetch from 'node-fetch';
import { siteID } from '@/services/intercom/intercom-functions';

export const meta = {
	tags: ['wallet'],

	requireCredential: true as const,

	params: {
		txid: {
			validator: $.optional.nullable.str,
			desc: {
				'ja-JP': '対象のユーザーのTx ID',
				'en-US': 'Target Tx ID'
			}
		},
		blockhash: {
			validator: $.optional.nullable.str,
			desc: {
				'ja-JP': '対象のユーザーのTx blockhash',
				'en-US': 'Target Tx blockhash'
			}
		},
	},

	res: {
		type: 'object' as const,
		optional: false as const, nullable: true as const,
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
	const user = me !== null ? await Users.findOne(me.id) : null;
	if (user == null) {
		throw new ApiError(meta.errors.noSuchUser);
	}
	let tx = null;
	const url = "http://explorer.ohm.sqdmc.net/";
	if (!ps.txid || ps.txid.length != 64) {
		return tx;
	}
	const res = await fetch(url + 'api/getrawtransaction?txid=' + ps.txid + '&decrypt=1', { method: 'GET' });
	let json = await res.json();
	if (res.status === 200 && json) {
		tx = json;
		if ('txid' in tx) {
			let siteWallet: UserWalletAddress = (await UserWalletAddresses.findOne({ userId: siteID }) as UserWalletAddress);
			for (var vout of tx.vout) {
				if (vout.scriptPubKey && vout.scriptPubKey.addresses[0]) {
					let address = vout.scriptPubKey.addresses[0];
					if (address === siteWallet.address) {
						vout.site = true;
						continue;
					}
					let wallet: UserWalletAddress = (await UserWalletAddresses.findOne({ address: address, userId: user.id }) as UserWalletAddress);
					if (wallet) {
						vout.mine = true;
					}
				}
			}
		}
	}
	return tx;
});
