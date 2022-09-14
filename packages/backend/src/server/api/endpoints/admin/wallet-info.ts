import * as os from 'os';
import { getConnection } from 'typeorm';
import define from '../../define';
import { redisClient } from '../../../../db/redis';
import { Users, UserWalletAddresses, UserWalletBalances, UserWalletStatuses } from '../../../../models';
import { UserWalletAddress } from '../../../../models/entities/user-wallet-address';
import { UserWalletBalance } from '../../../../models/entities/user-wallet-balance';
import { UserWalletStatus } from '../../../../models/entities/user-wallet-status';

export const meta = {
	requireCredential: true as const,
	requireModerator: true,

	desc: {
		'ja-JP': 'ウォレット情報を表示します。',
		'en-US': 'Show wallet information.'
	},

	tags: ['admin', 'meta'],

	params: {
	},

	res: {
		type: 'object' as const,
		optional: false as const, nullable: false as const,
		properties: {
			status: {
				type: 'object' as const,
				optional: false as const, nullable: false as const,
				description: 'The status of wallet'
			},
			balance: {
				type: 'object' as const,
				optional: false as const, nullable: false as const,
				description: 'The balances of wallet'
			},
		}
	}
};

export default define(meta, async () => {
	const status: UserWalletStatus = (await UserWalletStatuses.findOne({ type: "ohmcoin" } ) as UserWalletStatus);
	let addrUsr: UserWalletAddress = (await UserWalletAddresses.find({ coinType: 0 } ) as UserWalletAddress);
	let bals: UserWalletBalane = (await UserWalletBalances.find({ coinType: 0 } ) as UserWalletBalance);
	let addrTotalBal: number = 0;
	let addrSiteBal: number = 0;
	for (var a of addrUsr) {
		if (a.userId === 'system-pool_root') {
			addrSiteBal = parseFloat(a.balance);
		} else {
			addrTotalBal += parseFloat(a.balance);
		}
	}
	let userTotalBal: number = 0;
	for (var a of bals) {
		userTotalBal += parseFloat(a.balance);
	}
	let wallTotal: number = addrSiteBal + addrTotalBal;
	let accntDelta: number = addrSiteBal - userTotalBal;
	return {
		status: status,
		balance: {
			walletTotal: wallTotal.toFixed(8),
			walletTips: addrSiteBal.toFixed(8),
			userTotal: addrTotalBal.toFixed(8),
			tipsTotal: userTotalBal.toFixed(8),
			accountDelta: accntDelta.toFixed(8),
		},
	};
});
