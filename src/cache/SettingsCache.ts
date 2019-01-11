import { getRepository, In, Repository } from 'typeorm';

import { IMClient } from '../client';
import { Setting, SettingsKey } from '../models/Setting';
import {
	defaultSettings,
	fromDbValue,
	SettingsObject,
	toDbValue
} from '../settings';

import { GuildCache } from './GuildCache';

export class SettingsCache extends GuildCache<SettingsObject> {
	private settingsRepo: Repository<Setting>;

	public constructor(client: IMClient) {
		super(client);

		this.settingsRepo = getRepository(Setting);
	}

	protected initOne(guildId: string): SettingsObject {
		return { ...defaultSettings };
	}

	protected async getAll(guildIds: string[]): Promise<void> {
		// Load all settings from DB
		const sets = await this.settingsRepo.find({
			where: { guildId: In(guildIds) }
		});

		// Then insert the settings we got from the DB
		sets.forEach(set => {
			// Skip any empty values that aren't allowed to be empty.
			// This is a backward fix to insert any missing non-empty settings
			// for guilds that don't have them yet.
			if (set.value === null && defaultSettings[set.key] !== null) {
				return;
			}
			this.cache.get(set.guildId)[set.key] = fromDbValue(set.key, set.value);
		});
	}

	protected async _get(guildId: string): Promise<SettingsObject> {
		const sets = await this.settingsRepo.find({ where: { guildId } });

		const obj: SettingsObject = { ...defaultSettings };
		sets.forEach(set => (obj[set.key] = fromDbValue(set.key, set.value)));

		return obj;
	}

	public async setOne<K extends SettingsKey>(
		guildId: string,
		key: K,
		value: SettingsObject[K]
	): Promise<SettingsObject[K]> {
		const cfg = await this.get(guildId);
		const dbVal = toDbValue(key, value);
		const val = fromDbValue(key, dbVal);

		// Check if the value changed
		if (cfg[key] !== val) {
			// Save into DB
			// TODO: Use 'UPDATE ON DUPLICATE' query
			this.settingsRepo.save([
				{
					guildId,
					key,
					value: dbVal
				}
			]);

			cfg[key] = val;
			this.cache.set(guildId, cfg);
		}

		return val;
	}
}
