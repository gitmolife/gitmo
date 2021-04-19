import $ from 'cafy';
import define from '../../define';
import { ApiError } from '../../error';
import { Users, UserWalletAddresses } from '../../../../models';
import { UserWalletAddress } from '../../../../models/entities/user-wallet-address';
import { ID } from '@/misc/cafy-id';
import { getConnection } from 'typeorm';

export const meta = {
	tags: ['wallet'],

	requireCredential: true as const,

	params: {

		address: {
			validator: $.optional.str
		},

		amount: {
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
			message: 'No such user.',
			code: 'NO_SUCH_USER',
			id: '88b36214-5918-4cec-be59-df48a42c53d7'
		}
	},
};

export default define(meta, async (ps, me) => {
	const user = await Users.findOne(me != null ? me.id : null);

	if (user == null) {
		throw new ApiError(meta.errors.noSuchUser);
	}

	let addrUser: UserWalletAddress = (await UserWalletAddresses.findOne({ userId: user.id} ) as UserWalletAddress);

	var cb: (error: Error | null) => void = (error: Error | null) => {
		if (error) {
			// errored
			console.error('doWithdraw().callback.Error: ' + error.toString());
		} else {
			//console.log('doWithdraw().callback.Complete');
		}
	}

	function isJson(item: any) {
		try {
			item = typeof item !== "string" ? JSON.stringify(item) : item;
			item = JSON.parse(item);
		} catch (e) {
			return false;
		}
		if (typeof item === "object" && item !== null) {
			return true;
		}
		return false;
	}

	let error: string = null;
	let data: string = null;

	if (addrUser) {
		//console.log('doWithdraw() requested');
		let amt = parseFloat(ps.amount);
		const xfee = '0.00001100';
		let amountFee = parseFloat(xfee) + amt;
		if (!ps.amount) {
			error = 'Amount must be number';
		} else if (amt <= 0.1) {
			error = 'Amount must be more than 0.1';
		} else if (amountFee > addrUser.balance) {
			// Not enough OHM..
			error = 'Not Enough OHM';
		} else if (process.send) {
			let dat = { userId: user.id, address: ps.address, amount: ps.amount };
			process.send({ prc: 'relay', cmd: 'doWithdraw', dat }, undefined, {}, cb);
			data = Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5);

			/*process.on('message', async msg => {
				if (isJson(msg)) {
					const res = JSON.parse(JSON.stringify(msg));
					if (res.cmd === 'doneWithdraw') {
						console.log('doneWithdraw!!!!');
						// Create Job
						await getConnection()
							.createQueryBuilder()
							.insert()
							.into('user_wallet_job')
							.values({
								userId: user.id,
								job: 'WITHDRAW_FINAL',
								type: json.coin,
								state: 0,
								data: data,
								result: res.response,
							})
							.execute();
					}
				}
			});*/
		} else {
			console.log('doWithdraw() error');
			error = 'Internal Withdraw Error!';
		}
	} else {
		console.error("User Wallet doesnt Exists!");
	}

	let result = {
		data,
		error,
	};

	return result;
});
