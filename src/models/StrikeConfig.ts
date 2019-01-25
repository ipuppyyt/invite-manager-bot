import {
	BaseEntity,
	Column,
	CreateDateColumn,
	Entity,
	Index,
	ManyToOne,
	PrimaryGeneratedColumn,
	UpdateDateColumn
} from 'typeorm';

import { ViolationType } from '../types';

import { Guild } from './Guild';

@Entity()
@Index(['guild', 'violationType'], { unique: true })
export class StrikeConfig extends BaseEntity {
	@PrimaryGeneratedColumn()
	public id: number;

	@CreateDateColumn()
	public createdAt: Date;

	@UpdateDateColumn()
	public updatedAt: Date;

	@Column({ nullable: true })
	public deletedAt: Date;

	@Column()
	public type: ViolationType;

	@Column({ type: 'int' })
	public amount: number;

	@Column({ nullable: true })
	public guildId: string;

	@ManyToOne(type => Guild, g => g.strikeConfigs)
	public guild: Guild;
}
