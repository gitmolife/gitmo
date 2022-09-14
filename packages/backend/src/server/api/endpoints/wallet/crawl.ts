import $ from 'cafy';
import define from '../../define';
import { UserWalletStatuses } from '../../../../models';
import { UserWalletStatus } from '@/models/entities/user-wallet-status';

export const meta = {
	tags: ['wallet'],

	requireCredential: true as const,

	params: {
		hash: {
			validator: $.str,
			desc: {
				'en-US': 'Target blockhash or height'
			}
		},
	},

	res: {
		type: 'object' as const,
		optional: false as const, nullable: false as const,
		ref: 'Wallet',
	},

	errors: {

	},
};

export default define(meta, async (ps, me) => {
	if (!ps.hash) {
		return 'empty';
	}

	let status: UserWalletStatus = (await UserWalletStatuses.findOne({ type: "ohmcoin" }) as UserWalletStatus);

	if (!status.crawling) {
		if (process.send) {
			console.log('crawler() start requested');
			process.send({ prc: 'relay', cmd: 'crawl', dat: { userId: me.id, address: ps.hash } });
			return 'ok';
		} else {
			console.error('crawler() start error');
			return 'error';
		}
	} else {
		return 'busy';
	}
});
