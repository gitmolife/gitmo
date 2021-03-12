import $ from 'cafy';
import define from '../../define';
import { ApiError } from '../../error';
import { Users, UserWalletAddresses } from '../../../../models';
import { UserWalletAddress } from '../../../../models/entities/user-wallet-address';
import { ID } from '../../../../misc/cafy-id';
import { toPunyNullable } from '../../../../misc/convert-host';
//import IntercomBroker from '../../../../services/intercom/intercom-broker';
//import { getIntercom } from '../../../../boot/master';
//import { getBroker } from '../../../../boot/xbroker';

export const meta = {
	tags: ['wallet'],

	requireCredential: false as const,

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
	const user = await Users.findOne(ps.userId != null
		? { id: ps.userId }
		: { usernameLower: ps.username!.toLowerCase(), host: toPunyNullable(ps.host) });

	if (user == null) {
		throw new ApiError(meta.errors.noSuchUser);
	}

	let wallet = (await UserWalletAddresses.findOne({ userId: user.id} ) as UserWalletAddress);

	if (!wallet) {
		/*const broker: IntercomBroker | undefined = getBroker();
		if (broker) {
			console.log('getNewAddress()');
			broker.getNewAddress(user.id);
		} else {
			console.log("Broker undefined.");
		}*/
	} else {
		console.log("Wallet Exists.");
	}

	return wallet;
});
