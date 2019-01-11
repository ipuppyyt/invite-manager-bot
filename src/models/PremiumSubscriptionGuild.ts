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
import { PremiumSubscription } from './PremiumSubscription';

@Entity()
export class PremiumSubscriptionGuild extends BaseEntity {
	@PrimaryGeneratedColumn()
	public id: number;

	@CreateDateColumn()
	public createdAt: Date;

	@UpdateDateColumn()
	public updatedAt: Date;

	@Column({ nullable: true })
	public deletedAt: Date;

	@Column({ nullable: true })
	public guildId: string;

	@ManyToOne(type => Guild, g => g.premiumSubscriptionGuilds)
	public guild: Guild;

	@Column({ nullable: true })
	public premiumSubscriptionId: number;

	@ManyToOne(type => PremiumSubscription, ps => ps.premiumSubscriptionGuilds)
	public premiumSubscription: PremiumSubscription;
}
