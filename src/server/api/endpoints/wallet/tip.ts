import $ from 'cafy';
import define from '../../define';
import { ApiError } from '../../error';
import { Users, UserWalletBalances, UserWalletStatuses, UserWalletAddresses } from '../../../../models';
import { UserWalletBalance } from '../../../../models/entities/user-wallet-balance';
import { UserWalletAddress } from '../../../../models/entities/user-wallet-address';
import { UserWalletStatus } from '../../../../models/entities/user-wallet-status';
import { ID } from '@/misc/cafy-id';
import { getConnection } from 'typeorm';

export const meta = {
	tags: ['wallet'],

	requireCredential: true as const,

	params: {

		other: {
			validator: $.type(ID)
		},

		amount: {
			validator: $.optional.str
		},

	},

	res: {
		type: 'object' as const,
		optional: true as const, nullable: true as const,
		result: {
			message: {
				type: 'string' as const,
				optional: true as const, nullable: true as const,
				description: 'Message text.'
			},
			data: {
				type: 'string' as const,
				optional: false as const, nullable: true as const,
				description: 'Data text.'
			},
			error: {
				type: 'string' as const,
				optional: false as const, nullable: true as const,
				description: 'Error text.'
			}
		}
	},

	errors: {
		noSuchUser: {
			message: 'No such user.',
			code: 'NO_SUCH_USER',
			id: '88b36214-5918-4cec-be59-df48a42c53d7'
		},
		noSuchOtherUser: {
			message: 'No such other user.',
			code: 'NO_SUCH_USER_OTHER',
			id: '88b36214-5918-4cec-be59-df48a42c53d9'
		},
		amountToSmall: {
			message: 'Amount must be more than 0.00001',
			code: 'LESS_MIN_AMOUNT',
			id: '88b36214-5918-4cec-be59-df48a42c53d5'
		},
		amountNotEnough: {
			message: 'Amount is more than you have..',
			code: 'LESS_REQUIRED_AMOUNT',
			id: '88b36214-5918-4cec-be59-df48a42c53d3'
		},
		amountToHigh: {
			message: 'Amount is more than available.',
			code: 'OVER_MAX_AMOUNT',
			id: '88b36214-5918-4cec-be59-df48a42c53d2'
		},
		amountInvalid: {
			message: 'Amount must be valid number.',
			code: 'INVALID_AMOUNT',
			id: '88b36214-5918-4cec-be59-df48a42c53d1'
		}
	},
};

export default define(meta, async (ps, me) => {
	const user = await Users.findOne(me != null ? me.id : null);

	if (user == null) {
		throw new ApiError(meta.errors.noSuchUser);
	}

	//let status: UserWalletStatus = (await UserWalletStatuses.findOne({ type: "ohmcoin" } ) as UserWalletStatus);
	let wallet: UserWalletBalance = (await UserWalletBalances.findOne({ userId: user.id} ) as UserWalletBalance);
	let walletOther: UserWalletBalance = (await UserWalletBalances.findOne({ userId: ps.other} ) as UserWalletBalance);
	let addrSite: UserWalletAddress = (await UserWalletAddresses.findOne({ userId: 'system-pool_root'} ) as UserWalletAddress);
	//let bOnline = status != null ? status.online : false;
	//let bSynced = status != null ? status.synced : false;

	if (!walletOther) {
		throw new ApiError(meta.errors.noSuchOtherUser);
	}

	let amount: number;

	let error: string = null;
	let data: string = null;

	console.log(ps.amount);

	try {
		if (ps.amount === null || isNaN(ps.amount)) {
			throw new ApiError(meta.errors.amountInvalid);
		}
		amount = parseFloat(ps.amount);
		if (amount <= 0) {
			throw new ApiError(meta.errors.amountToSmall);
		}
	} catch (e) {
		throw new ApiError(meta.errors.amountInvalid);
	}
	if (amount > wallet.balance || amount > 10000000) {
		error = "Not Enough";
		throw new ApiError(meta.errors.amountNotEnough);
	} else if (wallet.balance - amount < 0 || amount > wallet.balance) {
		error = "Not Enough";
		throw new ApiError(meta.errors.amountNotEnough);
	} else if (amount <= 0.00001) {
		error = 'Amount must be more than 0.00001';
		throw new ApiError(meta.errors.amountToSmall);
	} else if (amount >= addrSite.balance) {
		error = 'Amount too high';
		throw new ApiError(meta.errors.amountToHigh);
	} else {
		wallet.balance -= amount;
		walletOther.balance += amount;
		data = {
			message: 'Processed',
			ourUser: wallet.balance,
			othUser: walletOther.balance,
		};
	}

	let result = {
		data,
		error,
	};

	return result;
});
