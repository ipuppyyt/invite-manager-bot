import { Message, TextChannel } from 'eris';

import { IMClient } from '../../../../client';
import { beautify } from '../../../../settings';
import { BotCommand, CommandGroup, GuildPermission } from '../../../../types';
import { GuildSettingsKey } from '../../../models/GuildSetting';
import { LogAction } from '../../../models/Log';
import { setChannelResolver } from '../../../resolvers/setChannelResolver';
import { Command, Context } from '../../Command';

export default class extends Command {
	public constructor(client: IMClient) {
		super(client, {
			name: BotCommand.setJoinChannel,
			aliases: ['setJoinChannels'],
			group: CommandGroup.EasyConfig,
			guildOnly: true,
			defaultAdminOnly: true,
			args: [
				{
					name: 'channel',
					resolver: setChannelResolver,
					required: false
				}
			]
		});
	}

	public async action(message: Message, [_channel]: [TextChannel], flags: {}, context: Context): Promise<any> {
		const channel = _channel;
		const { guild, settings, t, me } = context;
		const embed = this.createEmbed();
		const prefix = settings.prefix;
		const key = 'joinMessageChannel';
		let value: string;
		embed.title = key;

		console.log(typeof channel);

		if (typeof channel === 'undefined') {
			const oldVal = settings[key];

			if (oldVal !== null) {
				embed.description = t('cmd.config.current.text', {
					prefix,
					key
				});
			} else {
				embed.description = t('cmd.config.current.notSet', {
					prefix,
					key
				});
			}

			embed.fields.push({
				name: t('cmd.config.current.title'),
				value: oldVal !== null ? beautify('Channel', oldVal) : t('cmd.config.none')
			});

			return this.sendReply(message, embed);
		}

		if (channel !== null) {
			// check the given channel
			if (!(channel instanceof TextChannel)) {
				return this.sendReply(message, t('cmd.config.invalid.mustBeTextChannel'));
			}
			if (!channel.permissionsOf(me.id).has(GuildPermission.READ_MESSAGES)) {
				return this.sendReply(message, t('cmd.config.invalid.canNotReadMessages'));
			}
			if (!channel.permissionsOf(me.id).has(GuildPermission.SEND_MESSAGES)) {
				return this.sendReply(message, t('cmd.config.invalid.canNotSendMessages'));
			}
			if (!channel.permissionsOf(me.id).has(GuildPermission.EMBED_LINKS)) {
				return this.sendReply(message, t('cmd.config.invalid.canNotSendEmbeds'));
			}
			value = channel.id;
		} else {
			value = null;
		}
		// check if the current value isn't already set to that value
		const oldVal = settings[key];

		if (value === oldVal) {
			embed.description = t('cmd.config.sameValue');
			embed.fields.push({
				name: t('cmd.config.current.title'),
				value: beautify('Channel', oldVal)
			});
			return this.sendReply(message, embed);
		}

		// save
		await this.client.cache.guilds.setOne(guild.id, GuildSettingsKey.joinMessageChannel, value);

		embed.description = t('cmd.config.changed.text', { prefix, key });

		// Log the settings change
		await this.client.logAction(guild, message, LogAction.config, {
			key,
			oldValue: oldVal,
			newValue: value
		});

		if (oldVal !== null && oldVal !== undefined) {
			embed.fields.push({
				name: t('cmd.config.previous.title'),
				value: beautify('Channel', oldVal)
			});
		}

		embed.fields.push({
			name: t('cmd.config.new.title'),
			value: value !== null ? beautify('Channel', value) : t('cmd.config.none')
		});

		await this.sendReply(message, embed);
	}
}
