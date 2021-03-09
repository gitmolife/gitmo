import $ from 'cafy';
import { publishMainStream } from '../../../../services/stream';
import define from '../../define';
import { Users, UserWalletAddresses } from '../../../../models';

export const meta = {
	tags: ['wallet'],

	requireCredential: true as const,

	params: {

	}

};

export default define(meta, async (ps, user) => {
	await UserWalletAddresses.update(user.id, {
		wallet: ps.wallet as any
	});

	const iObj = await Users.pack(user.id, user, {
		detail: true,
		includeSecrets: true
	});

	// Publish meUpdated event
	publishMainStream(user.id, 'walletUpdated', iObj);

	return iObj;
});
