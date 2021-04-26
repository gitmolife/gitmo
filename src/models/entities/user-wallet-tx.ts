import { PrimaryColumn, Entity, Index, JoinColumn, Column, ManyToOne } from 'typeorm';
import { User } from './user';
import { id } from '../id';

@Entity()
export class UserWalletTx {
	@PrimaryColumn(id())
	public id: string;

	@Index()
	@Column({
		...id(),
		comment: 'The owner ID.'
	})
	public userId: User['id'];

	@Index()
	@Column('varchar', {
		length: 64,
		comment: 'The transaction id.'
	})
	public txid: string;

	@Column('integer', {
		default: 0,
		comment: 'The tx vout.'
	})
	public vout: number;

	@Column('varchar', {
		length: 64,
		comment: 'The blochash which the transaction was included within.'
	})
	public address: string;

	@Column('integer', {
		default: 0,
		comment: 'The coin type of this tx.'
	})
	public coinType: number;

	@Column('integer', {
		default: 0,
		comment: 'The tx type.'
	})
	public txtype: number;

	@Column('integer', {
		default: 0,
		comment: 'The tx confirmation count.'
	})
	public confirms: number;

	@Column('integer', {
		default: 0,
		comment: 'The tx processed status.'
	})
	public processed: number;

	@Column('boolean', {
		default: true,
		comment: 'Whether the tx is complete.'
	})
	public complete: boolean;

	@Column('decimal', {
		default: 0,
		comment: 'The amount of this tx.'
	})
	public amount: number;

	@ManyToOne(type => User, {
		onDelete: 'CASCADE'
	})
	@JoinColumn()
	public user: User | null;

	@Column('timestamp with time zone', {
		comment: 'The created date of the tx entry.'
	})
	public createdAt: Date;

	@Column('timestamp with time zone', {
		comment: 'The updated date of the tx entry.'
	})
	public updatedAt: Date;

	constructor(data: Partial<UserWalletAddress>) {
		if (data == null) return;

		for (const [k, v] of Object.entries(data)) {
			(this as any)[k] = v;
		}
	}
}
