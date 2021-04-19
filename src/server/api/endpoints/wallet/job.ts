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

	//let job: UserWalletJob = (await UserWalletJobs.findOne({ userId: user.id, job: ps.jobId }) as UserWalletJob);
	const job = await getConnection()
		.createQueryBuilder()
		.select("user_wallet_job")
		.from('user_wallet_job')
		.where({ userId: user.id, job: ps.jobId })
		.getOne();

	let response = JSON.stringify({ error: "Invalid" });
	if (job) {
		await getConnection()
	    .createQueryBuilder()
	    .delete("user_wallet_job")
	    .from('user_wallet_job')
	    .where({ userId: user.id, job: ps.jobId })
	    .execute();
		response = job.result;
	}

	return response;
});
