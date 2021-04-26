import { PrimaryColumn, Entity, Index, JoinColumn, Column, ManyToOne } from 'typeorm';
import { User } from './user';
import { id } from '../id';

@Entity()
export class UserWalletJob {
	@PrimaryColumn(id())
	public id: string;

	@Index()
	@Column('varchar', {
		length: 256,
		comment: 'The job.'
	})
	public job: string;

	@Column('varchar', {
		length: 16,
		comment: 'The job type.'
	})
	public type: string;

	@Column('integer', {
		default: 0,
		comment: 'The job state.'
	})
	public state: number;

	@Column({
		...id(),
		comment: 'The owner ID.'
	})
	public userId: User['id'];

	@Column('varchar', {
		length: 8192, nullable: true,
		comment: 'The job data.'
	})
	public data: string | null;

	@Column('varchar', {
		length: 8192, nullable: true,
		comment: 'The job result.'
	})
	public result: string | null;

	@ManyToOne(type => User, {
		onDelete: 'CASCADE'
	})
	@JoinColumn()
	public user: User | null;

	@Column('timestamp with time zone', {
		comment: 'The created date of the User.'
	})
	public createdAt: Date;

	constructor(data: Partial<UserWalletJob>) {
		if (data == null) return;

		for (const [k, v] of Object.entries(data)) {
			(this as any)[k] = v;
		}
	}
}
