import { EntityRepository, Repository } from 'typeorm';
import { UserWalletAddress } from '../entities/user-wallet-address';
import { SchemaType } from '../../misc/schema';
import { Users } from '..';
import { awaitAll } from '../../prelude/await-all';
import { User } from '../entities/user';

export type PackedWalletAddress = SchemaType<typeof packedWalletSchema>;

@EntityRepository(UserWalletAddress)
export class UserWalletAddressRepository extends Repository<UserWalletAddress> {
	public async pack(
		me: User['id'] | User,
		cn: UserWalletAddress['coinType'] | UserWalletAddress,
	): Promise<PackedWalletAddress> {
		const meId = me ? typeof me === 'string' ? me : me.id : null;
		const wallet = await this.findOneOrFail({
			userid: meId,
			cointype: cn,
		});

		return await awaitAll({
			id: wallet.id,
			createdat: wallet.createdAt.toISOString(),
			userid: wallet.userid,
			user: Users.pack(wallet.user || wallet.userid, me),
			cointype: wallet.cointype,
			address: wallet.address,
			active: wallet.active,
			//balance: typeof wallet.balance === 'number' ? wallet.balance : undefined,
			balance: wallet.balance,
		});
	}

	public packMany(
		wallets: UserWalletAddress[],
		me: User['id'] | User,
	) {
		return Promise.all(wallets.map(x => this.pack(x, me)));
	}
}

export const packedWalletSchema = {
	type: 'object' as const,
	optional: false as const, nullable: false as const,
	properties: {
		id: {
			type: 'string' as const,
			optional: false as const, nullable: false as const,
			format: 'id',
			example: 'xxxxxxxxxx',
		},
		createdat: {
			type: 'string' as const,
			optional: true as const, nullable: false as const,
			format: 'date-time',
			description: 'The date that the user wallet was created.'
		},
		cointype: {
			type: 'number' as const,
			optional: false as const, nullable: false as const,
			description: 'The cryptocurrency coin type.'
		},
		address: {
			type: 'string' as const,
			optional: false as const, nullable: false as const,
			description: 'The wallet address for the user.'
		},
		active: {
			type: 'boolean' as const,
			optional: true as const, nullable: false as const
		},
		balance: {
			type: 'number' as const,
			optional: true as const, nullable: false as const,
			description: 'The coin balance of this address.'
		},
		userid: {
			type: 'string' as const,
			optional: false as const, nullable: false as const,
			format: 'id',
		},
		user: {
			type: 'object' as const,
			ref: 'User',
			optional: false as const, nullable: false as const,
		},
	}
};
