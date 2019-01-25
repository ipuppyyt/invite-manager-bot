import {
	BaseEntity,
	Column,
	CreateDateColumn,
	Entity,
	Index,
	ManyToOne,
	OneToOne,
	PrimaryGeneratedColumn,
	UpdateDateColumn
} from 'typeorm';

import { Guild } from './Guild';
import { InviteCode } from './InviteCode';
import { Leave } from './Leave';
import { Member } from './Member';

export enum JoinInvalidatedReason {
	fake = 'fake',
	leave = 'leave'
}

@Entity()
@Index(['guild', 'member', 'createdAt'], { unique: true })
export class Join extends BaseEntity {
	@PrimaryGeneratedColumn()
	public id: number;

	@CreateDateColumn()
	public createdAt: Date;

	@UpdateDateColumn()
	public updatedAt: Date;

	@Column({ nullable: true })
	public deletedAt: Date;

	@Column({
		charset: 'utf8mb4',
		collation: 'utf8mb4_bin'
	})
	public possibleMatches: string;

	@Column()
	public invalidatedReason: JoinInvalidatedReason;

	@Column({ default: false })
	public cleared: boolean;

	@Column({ nullable: true })
	public guildId: string;

	@ManyToOne(type => Guild, g => g.joins)
	public guild: Guild;

	@Column({ nullable: true })
	public memberId: string;

	@ManyToOne(type => Member, m => m.joins)
	public member: Member;

	@Column({
		charset: 'utf8mb4',
		collation: 'utf8mb4_bin',
		length: 16,
		nullable: true
	})
	public exactMatchCode: string;

	@ManyToOne(type => InviteCode, i => i.joins)
	public exactMatch: InviteCode;

	@OneToOne(type => Leave, l => l.join)
	public leave: Leave;
}
