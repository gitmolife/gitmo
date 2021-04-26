import { PrimaryColumn, Entity, Index, JoinColumn, Column, ManyToOne } from 'typeorm';
import { User } from './user';
import { id } from '../id';

@Entity()
export class UserWalletBalance {
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

	@Column('decimal', {
		default: 0,
		comment: 'The balance of for this user wallet.'
	})
	public balance: number;

	@ManyToOne(type => User, {
		onDelete: 'CASCADE'
	})
	@JoinColumn()
	public user: User | null;

	constructor(data: Partial<UserWalletBalance>) {
		if (data == null) return;

		for (const [k, v] of Object.entries(data)) {
			(this as any)[k] = v;
		}
	}
}
