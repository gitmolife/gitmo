import define from '../../define';
import { ApiError } from '../../error';
import { Users, UserWalletAddresses, UserWalletBalances, UserWalletStatuses } from '../../../../models';
import { UserWalletAddress } from '../../../../models/entities/user-wallet-address';
import { UserWalletBalance } from '../../../../models/entities/user-wallet-balance';
import { UserWalletStatus } from '../../../../models/entities/user-wallet-status';
import { getConnection } from 'typeorm';

export const meta = {
	tags: ['wallet'],

	requireCredential: true as const,

	params: {

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

	// TODO: move to config
	const coinType = 0;
	const confirmsRequired: number = 7;

	let status: UserWalletStatus = (await UserWalletStatuses.findOne({ type: "ohmcoin" }) as UserWalletStatus);
	let wallet: UserWalletAddress = (await UserWalletAddresses.findOne({ userId: user.id, coinType: coinType }) as UserWalletAddress);
	let balance: UserWalletBalance = (await UserWalletBalances.findOne({ userId: user.id, coinType: coinType }) as UserWalletBalance);
	let bOnline: boolean = status != null ? status.online : false;
	let bSynced: boolean = status != null ? status.synced : false;

	var cb: (error: Error | null) => void = (error: Error | null) => {
		if (error) {
			// errored
			console.error('newAddress().callback.Error: ' + error.toString());
		} else {
			//console.log('getNewAddress().callback.Complete');
		}
	}

	if (!wallet && bOnline) {
		if (process.send) {
			//console.log('getNewAddress() requested');
			process.send({ prc: 'relay', cmd: 'getNewAddress', dat: { userId: user.id } }, undefined, {}, cb);
		} else {
			console.error('newAddress() error');
		}
	} else if (bOnline) {
		if (wallet.address.length > 36 || wallet.address.length <= 31 || (wallet.address.indexOf('\'') >= 0 || wallet.address.indexOf('"') >= 0)) {
			console.warn('newAddress(): Regenerating user address..');
			// TODO: don't delete? mark as invalid..
			await getConnection()
				.createQueryBuilder()
				.delete()
				.from('user_wallet_address')
				.where({ userId: user.id })
				.execute();
			await getConnection()
				.createQueryBuilder()
				.delete()
				.from('user_wallet_balance')
				.where({ userId: user.id })
				.execute();
			if (process.send) {
				//console.log('getNewAddress() requested');
				process.send({ prc: 'relay', cmd: 'getNewAddress', dat: { userId: user.id } }, undefined, {}, cb);
			} else {
				console.error('newAddress() regen error');
			}
		}
		//console.log("Wallet Exists.");
	}

	let stat: string = bOnline && bSynced ? "Online" : bOnline ? "Synchronizing" : "Offline";
	if (wallet) {
		let data = {
			account: wallet.address,
			confRequire: confirmsRequired,
			balance: {
				total: (Number(wallet.balance) + Number(balance.balance)).toFixed(8),
				pending: 0,
				network: wallet.balance,
				tipping: balance.balance,
			},
			server: {
				online: status.online,
				status: stat,
				synced: status.synced,
				crawling: status.crawling,
				height: status.blockheight,
				time: status.blocktime
			},
		};
		return data;
	} else {
		let data = {
			account: bOnline ? 'Success: Please Reload Page..' : 'Error: Please Try Again Later..',
			confRequire: confirmsRequired,
			balance: {
				total: 0,
				pending: 0,
				network: 0,
				tipping: 0,
			},
			server: {
				online: status.online,
				status: stat,
				synced: status.synced,
				crawling: status.crawling,
				height: status.blockheight,
				time: status.blocktime
			},
		};
		return data;
	}
});
