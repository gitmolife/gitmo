import $ from 'cafy';
import define from '../../define';
import { ApiError } from '../../error';
import { UserWalletTips } from '../../../../models';
import { UserWalletTip } from '../../../../models/entities/user-wallet-tips';
import { ID } from '@/misc/cafy-id';

export const meta = {
	tags: ['wallet'],

	requireCredential: true as const,

	params: {
		noteId: {
			validator: $.type(ID),
			desc: {
				'ja-JP': '',
				'en-US': 'Target note ID'
			}
		},
	},

	res: {
		type: 'object' as const,
		optional: false as const, nullable: false as const,
		ref: 'Wallet',
	},

	errors: {
		noSuchNote: {
			message: 'No such note.',
			code: 'NO_SUCH_NOTE',
			id: '88b36214-5918-4cec-be59-df48a42c53d7'
		}
	},
};

export default define(meta, async (ps, me) => {
	if (!ps.noteId) {
		throw new ApiError(meta.errors.noSuchNote);
	}

	let tips: UserWalletTip[] = (await UserWalletTips.find({ noteId: ps.noteId }) as UserWalletTip[]);
	if (tips == null) {
		return [];
	}
	let _tips: UserWalletTip[] = [];
	for (var tip of tips) {
		if (tip.userIdFrom !== me.id) {
			if (tip.anon) {
				tip.userIdFrom = '';
			}
		}
		_tips.push(tip);
	}
	return _tips;
});
