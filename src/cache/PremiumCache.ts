import { getRepository, In, MoreThan, Repository } from 'typeorm';

import { IMClient } from '../client';
import { PremiumSubscriptionGuild } from '../models/PremiumSubscriptionGuild';

import { GuildCache } from './GuildCache';

export class PremiumCache extends GuildCache<boolean> {
	private premiumSubsGuildRepo: Repository<PremiumSubscriptionGuild>;

	public constructor(client: IMClient) {
		super(client);

		this.premiumSubsGuildRepo = getRepository(PremiumSubscriptionGuild);
	}

	protected initOne(guildId: string): boolean {
		return false;
	}

	protected async getAll(guildIds: string[]): Promise<void> {
		// Load valid premium subs
		const subs = await this.premiumSubsGuildRepo.find({
			where: {
				guildId: In(guildIds),
				premiumSubscription: {
					validUntil: MoreThan(new Date())
				}
			}
		});

		subs.forEach(sub => {
			this.cache.set(sub.guildId, true);
		});
	}

	protected async _get(guildId: string): Promise<boolean> {
		const sub = await this.premiumSubsGuildRepo.count({
			where: {
				guildId,
				premiumSubscription: {
					validUntil: MoreThan(new Date())
				}
			}
		});

		return !!sub;
	}
}
