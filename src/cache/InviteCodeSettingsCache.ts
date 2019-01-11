import { Invite } from 'eris';
import { getRepository, In, Repository } from 'typeorm';

import { IMClient } from '../client';
import {
	InviteCodeSetting,
	InviteCodeSettingsKey
} from '../models/InviteCodeSetting';
import {
	fromDbValue,
	inviteCodeDefaultSettings,
	InviteCodeSettingsObject,
	toDbValue
} from '../settings';

import { GuildCache } from './GuildCache';

export class InviteCodeSettingsCache extends GuildCache<
	Map<string, InviteCodeSettingsObject>
> {
	private settingsRepo: Repository<InviteCodeSetting>;

	public constructor(client: IMClient) {
		super(client);

		this.settingsRepo = getRepository(InviteCodeSetting);
	}

	public initOne(guilId: string) {
		return new Map();
	}

	public async getAll(guildIds: string[]) {
		// Load all settings from DB
		const sets = await this.settingsRepo.find({
			where: { guildId: In(guildIds) }
		});

		sets.forEach(set => {
			if (set.value === null) {
				return;
			}

			const guildSets = this.cache.get(set.guildId);
			let invSets = guildSets.get(set.inviteCode);
			if (!invSets) {
				invSets = { ...inviteCodeDefaultSettings };
				guildSets.set(set.inviteCode, invSets);
			}
			invSets[set.key] = fromDbValue(set.key, set.value);
		});
	}

	protected async _get(
		guildId: string
	): Promise<Map<string, InviteCodeSettingsObject>> {
		const sets = await this.settingsRepo.find({ where: { guildId } });

		const map = new Map();
		sets.forEach(set => {
			if (set.value === null) {
				return;
			}

			let invSets = map.get(set.inviteCode);
			if (!invSets) {
				invSets = { ...inviteCodeDefaultSettings };
				map.set(set.inviteCode, invSets);
			}
			invSets[set.key] = fromDbValue(set.key, set.value);
		});

		return map;
	}

	public async getOne(guildId: string, invCode: string) {
		const guildSets = await this.get(guildId);
		const set = guildSets.get(invCode);
		return set ? set : { ...inviteCodeDefaultSettings };
	}

	public async setOne<K extends InviteCodeSettingsKey>(
		invite: Invite,
		key: K,
		value: InviteCodeSettingsObject[K]
	) {
		const guildSet = await this.get(invite.guild.id);
		const dbVal = toDbValue(key, value);
		const val = fromDbValue(key, dbVal);

		let set = guildSet.get(invite.code);
		if (!set) {
			set = { ...inviteCodeDefaultSettings };
		}

		// Check if the value changed
		if (set[key] !== val) {
			// Save into DB
			// TODO: Use 'UPDATE ON DUPLICATE' query
			this.settingsRepo.save([
				{
					guildId: invite.guild.id,
					inviteCode: invite.code,
					key,
					value: dbVal
				}
			]);

			set[key] = val;
			guildSet.set(invite.code, set);
		}

		return val;
	}
}
