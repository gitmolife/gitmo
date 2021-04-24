import { PrimaryColumn, Entity, Index, Column } from 'typeorm';
import { id } from '../id';

@Entity()
export class UserWalletTip {
	@PrimaryColumn(id())
	public id: string;

	@Index()
	@Column('varchar', {
		length: 16,
		comment: 'The User From.'
	})
	public userIdFrom: string;

	@Index()
	@Column('varchar', {
		length: 16,
		comment: 'The User To.'
	})
	public userIdTo: string;

	@Column('boolean', {
		default: true,
		comment: 'Whether this tip is anon.'
	})
	public anon: boolean;

	@Column('integer', {
		default: 0,
		comment: 'The transaction/tip type.'
	})
	public type: number;

	@Column('integer', {
		default: 0,
		comment: 'The coin type.'
	})
	public coinType: number;

	@Column('decimal', {
		default: 0,
		comment: 'The balance of this address.'
	})
	public balance: number;

	@Column('varchar', {
		length: 256,
		comment: 'Message Text.'
	})
	public message: string;

	@Column('timestamp with time zone', {
		comment: 'The created date of the User.'
	})
	public createdAt: Date;

	@Column('timestamp with time zone', {
		comment: 'The updated date of the Entry.'
	})
	public updatedAt: Date;

	constructor(data: Partial<UserWalletTip>) {
		if (data == null) return;

		for (const [k, v] of Object.entries(data)) {
			(this as any)[k] = v;
		}
	}
}
