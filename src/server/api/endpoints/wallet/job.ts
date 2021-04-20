import $ from 'cafy';
import define from '../../define';
import { ApiError } from '../../error';
import { Users, UserWalletJobs } from '../../../../models';
import { UserWalletJob } from '../../../../models/entities/user-wallet-job';
import { ID } from '@/misc/cafy-id';
import { getConnection } from 'typeorm';

export const meta = {
	tags: ['wallet'],

	requireCredential: true as const,

	params: {
		jobId: {
			validator: $.optional.str
		},
		jobData: {
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
			message: 'No such job.',
			code: 'NO_SUCH_JOB',
			id: '88b36214-5918-4cec-be59-df48a42c53d7'
		}
	},
};

export default define(meta, async (ps, me) => {
	const user = await Users.findOne(me != null ? me.id : null);

	if (user == null) {
		throw new ApiError(meta.errors.noSuchUser);
	}

	const jobs = await getConnection()
		.createQueryBuilder()
		.select("user_wallet_job")
		.from('user_wallet_job')
		.where('user_wallet_job."userId" = :uid', { uid: user.id })
		.andWhere('user_wallet_job."job" = :job', { job: ps.jobId })
		.getCount();

	let response = JSON.stringify({ error: "Invalid", data: null });
	if (jobs > 0) {
		let data = await getConnection()
				.createQueryBuilder()
				.select("user_wallet_job")
				.from('user_wallet_job')
				.where('user_wallet_job."userId" = :uid', { uid: user.id })
				.andWhere('user_wallet_job."job" = :job', { job: ps.jobId })
				.getOne();
		await getConnection()
	    .createQueryBuilder()
	    .delete("user_wallet_job")
	    .from('user_wallet_job')
			.where('user_wallet_job."userId" = :uid', { uid: user.id })
			.andWhere('user_wallet_job."job" = :job', { job: ps.jobId })
	    .execute();
		response = JSON.stringify({ error: null, data: data.result });
	}

	return response;
});
