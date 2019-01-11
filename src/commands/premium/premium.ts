import axios from 'axios';
import { Message } from 'eris';
import moment from 'moment';
import { MoreThan } from 'typeorm';

import { IMClient } from '../../client';
import { EnumResolver } from '../../resolvers';
import { BotCommand, CommandGroup, Permissions } from '../../types';
import { Command, Context } from '../Command';

enum Action {
	Check = 'Check',
	Activate = 'Activate',
	Deactivate = 'Deactivate'
}

export default class extends Command {
	public constructor(client: IMClient) {
		super(client, {
			name: BotCommand.premium,
			aliases: ['patreon', 'donate'],
			args: [
				{
					name: 'action',
					resolver: new EnumResolver(client, Object.values(Action))
				}
			],
			group: CommandGroup.Premium,
			guildOnly: false
		});
	}

	public async action(
		message: Message,
		[action]: [Action],
		flags: {},
		{ guild, t, settings, isPremium }: Context
	): Promise<any> {
		// TODO: Create list of premium features (also useful for FAQ)
		const lang = settings.lang;
		const guildId = guild ? guild.id : undefined;

		const embed = this.createEmbed();

		const sub = await this.repo.premium.findOne({
			where: {
				memberId: message.author.id,
				validUntil: MoreThan(new Date())
			}
		});

		if (!action) {
			if (!sub) {
				embed.title = t('cmd.premium.noPremium.title');
				embed.description = t('cmd.premium.noPremium.text');

				embed.fields.push({
					name: t('cmd.premium.feature.servers.title'),
					value: t('cmd.premium.feature.servers.text')
				});

				embed.fields.push({
					name: t('cmd.premium.feature.embeds.title'),
					value: t('cmd.premium.feature.embeds.text', {
						link:
							'https://docs.invitemanager.co/bot/custom-messages/join-message-examples'
					})
				});

				embed.fields.push({
					name: t('cmd.premium.feature.export.title'),
					value: t('cmd.premium.feature.export.text')
				});

				embed.fields.push({
					name: t('cmd.premium.feature.patreon.title'),
					value: t('cmd.premium.feature.patreon.text', {
						cmd: '`' + settings.prefix + 'premium check`'
					})
				});
			} else {
				embed.title = t('cmd.premium.premium.title');

				const date = moment(sub.validUntil)
					.locale(lang)
					.fromNow(true);

				const allGuildSubs = await this.repo.premiumGuilds.find({
					relations: ['guild'],
					where: {
						premiumSubscriptionId: sub.id
					}
				});

				let guildList = '';
				allGuildSubs.forEach(guildSub => {
					const guildName = guildSub.guild.name;
					guildList +=
						`- **${guildName}**` +
						(guildSub.guildId === guildId ? ' *(This server)*' : '') +
						'\n';
				});
				if (guildId) {
					if (allGuildSubs.some(s => s.guildId === guildId)) {
						guildList +=
							'\n`' +
							t('cmd.premium.premium.deactivate', {
								cmd: settings.prefix + 'premium deactivate`'
							});
					} else {
						guildList +=
							'\n`' +
							t('cmd.premium.premium.activate', {
								cmd: settings.prefix + 'premium activate`'
							});
					}
				}

				const limit = `**${allGuildSubs.length}/${sub.maxGuilds}**`;

				embed.description =
					t('cmd.premium.premium.text', {
						date,
						limit,
						guildList,
						link: 'https://docs.invitemanager.co/bot/premium/features'
					}) + '\n';
			}
		} else {
			if (action === Action.Activate) {
				embed.title = t('cmd.premium.activate.title');

				if (!guildId) {
					embed.description = t('cmd.premium.activate.noGuild');
				} else if (!message.member.permission.has(Permissions.ADMINISTRATOR)) {
					embed.description = t('cmd.premium.premium.adminOnly');
				} else if (isPremium) {
					embed.description = t('cmd.premium.activate.currentlyActive');
				} else if (!sub) {
					embed.description = t('cmd.premium.activate.noSubscription', {
						cmd: '`' + settings.prefix + 'premium`'
					});
				} else {
					const subs = await this.repo.premiumGuilds.count({
						where: {
							premiumSubscriptionId: sub.id
						}
					});

					if (subs > sub.maxGuilds) {
						embed.description = t('cmd.premium.activate.maxGuilds');
					} else {
						await this.repo.premiumGuilds.save({
							premiumSubscriptionId: sub.id,
							guildId
						});

						this.client.cache.premium.flush(guildId);

						embed.description = t('cmd.premium.activate.done');
					}
				}
			} else if (action === Action.Deactivate) {
				embed.title = t('cmd.premium.deactivate.title');

				if (!guildId) {
					embed.description = t('cmd.premium.deactivate.noGuild');
				} else if (isPremium) {
					await this.repo.premiumGuilds.delete({
						premiumSubscriptionId: sub.id,
						guildId
					});

					this.client.cache.premium.flush(guildId);

					embed.description = t('cmd.premium.deactivate.done');
				} else {
					embed.description = t('cmd.premium.deactivate.noSubscription');
				}
			} else if (action === Action.Check) {
				embed.title = t('cmd.premium.check.title');

				const apiKey = this.client.config.apiKey;
				const userId = message.author.id;
				const res = await axios
					.get(
						`http://invitemanager.co/check/patreon/?apiKey=${apiKey}&userId=${userId}`
					)
					.catch(() => undefined);

				if (!res) {
					embed.description = t('cmd.premium.check.notFound');
				} else if (res.data.declined_since) {
					embed.description = t('cmd.premium.check.declined', {
						since: res.data.declined_since
					});
				} else if (res.data.is_paused) {
					embed.description = t('cmd.premium.check.paused');
				} else {
					const day = moment(res.data.created_at).date();
					const validUntil = moment()
						.add(1, 'month')
						.date(day);

					if (sub) {
						sub.validUntil = validUntil.toDate();
						await sub.save();
					} else {
						await this.repo.premium.save({
							maxGuilds: 5,
							isFreeTier: false,
							memberId: userId,
							validUntil: validUntil.toDate(),
							reason: null
						});
					}

					embed.description = t('cmd.premium.check.done', {
						valid: validUntil.locale(lang).calendar(),
						cmd: '`' + settings.prefix + 'premium`'
					});
				}
			}
		}

		return this.sendReply(message, embed);
	}
}
