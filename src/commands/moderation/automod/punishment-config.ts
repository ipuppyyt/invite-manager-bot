import { Message } from 'eris';

import { IMClient } from '../../../client';

import {
	EnumResolver,
	NumberResolver,
	StringResolver
} from '../../../resolvers';
import {
	CommandGroup,
	ModerationCommand,
	PunishmentType
} from '../../../types';
import { Command, Context } from '../../Command';

export default class extends Command {
	public constructor(client: IMClient) {
		super(client, {
			name: ModerationCommand.punishmentConfig,
			aliases: ['punishment-config'],
			args: [
				{
					name: 'punishment',
					resolver: new EnumResolver(client, Object.values(PunishmentType))
				},
				{
					name: 'strikes',
					resolver: NumberResolver
				},
				{
					name: 'args',
					resolver: StringResolver,
					rest: true
				}
			],
			group: CommandGroup.Moderation,
			strict: true,
			guildOnly: true
		});
	}

	public async action(
		message: Message,
		[punishment, strikes, args]: [PunishmentType, number, string],
		flags: {},
		{ guild, t }: Context
	): Promise<any> {
		if (this.client.config.ownerGuildIds.indexOf(guild.id) === -1) {
			return;
		}

		const embed = this.createEmbed({
			title: t('cmd.punishmentConfig.title')
		});

		const punishmentQuery = {
			guildId: guild.id,
			type: punishment
		};
		if (typeof punishment === typeof undefined) {
			const allPunishments: PunishmentType[] = Object.values(PunishmentType);
			const punishmentConfigList = await this.client.cache.punishments.get(
				guild.id
			);
			const unusedPunishment = allPunishments.filter(
				p => punishmentConfigList.map(pcl => pcl.type).indexOf(p) < 0
			);
			embed.description = punishmentConfigList
				.map(pcl =>
					t('cmd.punishmentConfig.text', {
						punishment: `**${pcl.type}**`,
						strikes: `**${pcl.amount}**`
					})
				)
				.join('\n');
			embed.fields.push({
				name: t('cmd.punishmentConfig.unusedPunishment'),
				value: `\n${unusedPunishment.map(v => `\`${v}\``).join(', ')}`
			});
		} else if (typeof strikes === typeof undefined) {
			const pc = await this.repo.punishConfigs.findOne({
				where: punishmentQuery
			});
			embed.description = t('cmd.punishmentConfig.text', {
				punishment: `**${pc ? pc.type : punishment}**`,
				strikes: `**${pc ? pc.amount : 0}**`
			});
		} else if (strikes === 0) {
			await this.repo.punishConfigs.update(punishmentQuery, {
				deletedAt: new Date()
			});
			embed.description = t('cmd.punishmentConfig.deletedText', {
				punishment: `**${punishment}**`
			});
		} else {
			// TODO: This used to be INSERT OR UPDATE
			await this.repo.punishConfigs.save({
				amount: strikes,
				args: args,
				...punishmentQuery
			});
			embed.description = t('cmd.punishmentConfig.text', {
				punishment: `**${punishment}**`,
				strikes: `**${strikes}**`
			});
		}

		this.client.cache.punishments.flush(guild.id);
		this.sendReply(message, embed);
	}
}
