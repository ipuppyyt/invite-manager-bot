import {
	BaseEntity,
	Column,
	CreateDateColumn,
	Entity,
	ManyToOne,
	PrimaryGeneratedColumn,
	UpdateDateColumn
} from 'typeorm';

import { Guild } from './Guild';
import { Member } from './Member';

export enum MemberSettingsKey {
	hideFromLeaderboard = 'hideFromLeaderboard'
}

@Entity()
export class MemberSetting extends BaseEntity {
	@PrimaryGeneratedColumn()
	public id: number;

	@CreateDateColumn()
	public createdAt: Date;

	@UpdateDateColumn()
	public updatedAt: Date;

	@Column({ nullable: true })
	public deletedAt: Date;

	@Column()
	public key: MemberSettingsKey;

	@Column({ type: 'text' })
	public value: string;

	@Column({ nullable: true })
	public guildId: string;

	@ManyToOne(type => Guild, g => g.memberSettings)
	public guild: Guild;

	@Column({ nullable: true })
	public memberId: string;

	@ManyToOne(type => Member, m => m.memberSettings)
	public member: Member;
}
