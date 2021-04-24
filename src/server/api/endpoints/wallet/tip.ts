import $ from 'cafy';
import define from '../../define';
import { ApiError } from '../../error';
import { Users, Notes, UserWalletBalances, UserWalletAddresses } from '../../../../models';
import { UserWalletBalance } from '../../../../models/entities/user-wallet-balance';
import { UserWalletAddress } from '../../../../models/entities/user-wallet-address';
import { Note } from '../../../../models/entities/note';
import { createNotification } from '../../../../services/create-notification';
import { siteID } from '../../../../services/intercom/intercom-functions';
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

		noteId: {
			validator: $.nullable.optional.str
		},

		anon: {
			validator: $.optional.bool
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
		},
		noSuchNote: {
			message: 'This note no longer or does not exist.',
			code: 'NO_SUCH_NOTE',
			id: '88b36214-5918-4cec-be59-df48a42c53d6'
		}
	},
};

export default define(meta, async (ps, me) => {
	const user = await Users.findOne(me.id);

	if (user == null) {
		throw new ApiError(meta.errors.noSuchUser);
	}

	let wallet: UserWalletBalance = (await UserWalletBalances.findOne({ userId: user.id }) as UserWalletBalance);
	let walletOther: UserWalletBalance = (await UserWalletBalances.findOne({ userId: ps.other }) as UserWalletBalance);
	let addrSite: UserWalletAddress = (await UserWalletAddresses.findOne({ userId: siteID }) as UserWalletAddress);

	if (!walletOther) {
		throw new ApiError(meta.errors.noSuchOtherUser);
	}

	if (ps.noteId) {
		let note: Note = (await Notes.findOne({ id: ps.noteId }) as Note);
		if (!note) {
			throw new ApiError(meta.errors.noSuchNote);
		}
	}

	let amount: number;
	let message: string | null = null; // TODO: tip messages..

	let error: string | null = null;
	let data: {
		message: string,
		ourUser: number,
		othUser: number,
	} | null;

	async function logTip(uidFrom: string, uidTo: string, amount: number, type: string, note: string | null | undefined) {
		let t: number = 50;
		let amt: number;
		let usrA: string;
		let usrB: string;
		if (type === 'to') {
			// Received
			amt = amount;
			t = 51;
			usrA = uidTo;
			usrB = uidFrom;
		} else if (type === 'from') {
			// Sent
			amt = -amount;
			t = 52;
			usrA = uidFrom;
			usrB = uidTo;
		} else {
			return;
		}
		let alog: string = usrB + ':' + note;
		// Add Entry to Transaction Log??
		await getConnection()
			.createQueryBuilder()
			.insert()
			.into('user_wallet_tx')
			.values({
				userId: usrA,
				txid: 'INTERNAL_TX_TIP',
				address: alog,
				coinType: 0,
				txtype: t,
				processed: 3,
				amount: amt,
				complete: true,
			})
			.execute();
	}

	try {
		if (ps.amount === null || isNaN(Number(ps.amount))) {
			throw new ApiError(meta.errors.amountInvalid);
		}
		amount = Number(ps.amount);
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
		let nBalance = Number(wallet.balance) - amount;
		let nBalanceOther = Number(walletOther.balance) + amount;
		let uid = wallet.userId;
		let uido = walletOther.userId;
		let note = ps.noteId;
		// Update user network balance
		await getConnection()
			.createQueryBuilder()
			.update('user_wallet_balance')
			.set({ balance: nBalance })
			.where('user_wallet_balance."userId" = :uid', { uid: uid })
			.execute();
		// Update user network balance
		await getConnection()
			.createQueryBuilder()
			.update('user_wallet_balance')
			.set({ balance: nBalanceOther })
			.where('user_wallet_balance."userId" = :uid', { uid: uido })
			.execute();
		// Add Log Entries
		logTip(uid, uido, amount, 'from', note);
		logTip(uid, uido, amount, 'to', note);
		// Add Entry to Tip Log..
		await getConnection()
			.createQueryBuilder()
			.insert()
			.into('user_wallet_tip')
			.values({
				userIdFrom: uid,
				userIdTo: uido,
				noteId: note,
				anon: ps.anon,
				type: 50,
				coinType: 0,
				amount: amount,
				message: message,
			})
			.execute();
		let _uid: string | null = null;
		if (!ps.anon) {
			_uid = uid;
		}
		// Notification to user receiving tip.
		createNotification(uido, 'tipReceive', {
			notifierId: _uid,
			customBody: 'Received Tip of ' + amount + " OHM",
			customHeader: 'You Received a Tip',
			customIcon: '/static-assets/client/coin/ohm100.png',
			//isRead: true,
			noteId: note,
		});
		// Notification to user who created tip..
		createNotification(uid, 'tipSent', {
			notifierId: uido,
			customBody: 'Sent Tip of ' + amount + " OHM",
			customHeader: 'You Sent a Tip',
			customIcon: '/static-assets/client/coin/ohm100.png',
			//isRead: true,
			noteId: note,
		});
		data = {
			message: 'Processed',
			ourUser: nBalance,
			othUser: nBalanceOther,
		};
	}

	let result = {
		data,
		error,
	};

	return result;
});
