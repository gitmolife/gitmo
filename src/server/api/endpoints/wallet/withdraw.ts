import $ from 'cafy';
import define from '../../define';
import { ApiError } from '../../error';
import { Users, UserWalletAddresses } from '../../../../models';
import { UserWalletAddress } from '../../../../models/entities/user-wallet-address';
import { ID } from '@/misc/cafy-id';

export const meta = {
	tags: ['wallet'],

	requireCredential: true as const,

	params: {

		address: {
			validator: $.optional.str
		},

		amount: {
			validator: $.optional.str
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
			let data = { userId: user.id, address: ps.address, amount: ps.amount };
			process.send({ cmd: 'doWithdraw', data }, undefined, {}, cb);
		} else {
			console.log('doWithdraw() error');
		}
	} else {
		console.log("User Wallet doesnt Exists.");
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
