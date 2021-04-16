import $ from 'cafy';
import define from '../../define';
import { ApiError } from '../../error';
import { Users, UserWalletAddresses } from '../../../../models';
import { UserWalletAddress } from '../../../../models/entities/user-wallet-address';
import { ID } from '@/misc/cafy-id';
import { toPunyNullable } from '../../../../misc/convert-host';
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

	if (user == null) {
		throw new ApiError(meta.errors.noSuchUser);
	}

	let wallet = (await UserWalletAddresses.findOne({ userId: user.id} ) as UserWalletAddress);

	var cb: (error: Error | null) => void = (error: Error | null) => {
		if (error) {
			// errored
			console.log('doWithdraw().callback.Error');
		} else {
			console.log('doWithdraw().callback.Complete');
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

	if (wallet) {
		if (process.send) {
			console.log('doWithdraw() requested');
			process.send({ cmd: 'getNewAddress', userId: user.id }, undefined, {}, cb);
		} else {
			console.log('doWithdraw() error');
		}
	} else {
		console.log("Wallet doesnt Exists.");
	}

	process.on('message', msg => {
		if (isJson(msg)) {
			const res = JSON.parse(JSON.stringify(msg));
			if (res.cmd === 'doneWithdraw') {
				console.log(msg);
				// TODO: cleanup..
			}
		}
	});

	return wallet;
});
