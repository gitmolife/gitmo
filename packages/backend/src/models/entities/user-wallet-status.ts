import { PrimaryColumn, Entity, Index, JoinColumn, Column, ManyToOne } from 'typeorm';
import { id } from '../id';

@Entity()
export class UserWalletStatus {
	@PrimaryColumn(id())
	public id: string;

	@Index()
	@Column('varchar', {
		length: 16,
		comment: 'The Status type.'
	})
	public type: string;

	@Column('boolean', {
		default: true,
		comment: 'Whether the Entry is active.'
	})
	public active: boolean;

	@Column('boolean', {
		default: false,
		comment: 'Whether the Entry is online.'
	})
	public online: boolean;

	@Column('boolean', {
		default: false,
		comment: 'Whether the Entry is synced.'
	})
	public synced: boolean;

	@Column('boolean', {
		default: false,
		comment: 'Whether the Entry is crawling.'
	})
	public crawling: boolean;

	@Column('integer', {
		default: 0,
		comment: 'The Height.'
	})
	public blockheight: number;

	@Column('varchar', {
		length: 64, nullable: true,
		comment: 'The blockhash.'
	})
	public blockhash: string | null;

	@Column('integer', {
		default: 0,
		comment: 'The Time.'
	})
	public blocktime: number;

	@Column('timestamp with time zone', {
		comment: 'The created date of the Entry.'
	})
	public createdAt: Date;

	@Column('timestamp with time zone', {
		comment: 'The updated date of the Entry.'
	})
	public updatedAt: Date;

	constructor(data: Partial<UserWalletStatus>) {
		if (data == null) return;

		for (const [k, v] of Object.entries(data)) {
			(this as any)[k] = v;
		}
	}
}
