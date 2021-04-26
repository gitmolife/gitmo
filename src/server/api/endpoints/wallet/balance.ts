import $ from 'cafy';
import define from '../../define';
import { ApiError } from '../../error';
import { Users, UserWalletBalances, UserWalletAddresses } from '../../../../models';
import { UserWalletAddress } from '../../../../models/entities/user-wallet-address';
import { UserWalletBalance } from '../../../../models/entities/user-wallet-balance';
import { ID } from '@/misc/cafy-id';

export const meta = {
	tags: ['wallet'],

	requireCredential: true as const,

	params: {
		userId: {
			validator: $.optional.nullable.type(ID),
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
			id: '88b36214-5918-4cec-be59-df48a42c53d7'
		}
	},
};

export default define(meta, async (ps, me) => {
	const user = await Users.findOne(ps.userId != null
		? { id: ps.userId }
		: { id: me.id });

	if (user == null) {
		throw new ApiError(meta.errors.noSuchUser);
	}

	let wallet: UserWalletBalance = (await UserWalletBalances.findOne({ userId: user.id }) as UserWalletBalance);
	let address: UserWalletAddress = (await UserWalletAddresses.findOne({ userId: user.id }) as UserWalletAddress);

	if (wallet == null || address == null) {
		throw new ApiError(meta.errors.noSuchUser);
	}

	let data = {
		network: address.balance,
		tipping: wallet.balance
	};

	return data;
});
