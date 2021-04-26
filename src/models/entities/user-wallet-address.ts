import { PrimaryColumn, Entity, Index, JoinColumn, Column, ManyToOne } from 'typeorm';
import { User } from './user';
import { id } from '../id';

@Entity()
export class UserWalletAddress {
	@PrimaryColumn(id())
	public id: string;

	@Index()
	@Column({
		...id(),
		comment: 'The owner ID.'
	})
	public userId: User['id'];

	@Column('integer', {
		default: 0,
		comment: 'The coin type.'
	})
	public coinType: number;

	@Index()
	@Column('varchar', {
		length: 64,
		comment: 'The wallet address of the User.'
	})
	public address: string;

	@Column('decimal', {
		default: 0,
		comment: 'The balance of this address.'
	})
	public balance: number;

	@Column('boolean', {
		default: true,
		comment: 'Whether the Address is active.'
	})
	public active: boolean;

	@ManyToOne(type => User, {
		onDelete: 'CASCADE'
	})
	@JoinColumn()
	public user: User | null;

	@Index()
	@Column('timestamp with time zone', {
		comment: 'The created date of the wallet address.'
	})
	public createdAt: Date;

	constructor(data: Partial<UserWalletAddress>) {
		if (data == null) return;

		for (const [k, v] of Object.entries(data)) {
			(this as any)[k] = v;
		}
	}
}
