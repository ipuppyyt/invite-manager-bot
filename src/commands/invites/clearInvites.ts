import { Message } from 'eris';
import { Moment } from 'moment';
import { In, Not } from 'typeorm';

import { IMClient } from '../../client';
import { LogAction } from '../../models/Log';
import {
	BasicUser,
	BooleanResolver,
	DateResolver,
	UserResolver
} from '../../resolvers';
import { BotCommand, CommandGroup } from '../../types';
import { Command, Context } from '../Command';

export default class extends Command {
	public constructor(client: IMClient) {
		super(client, {
			name: BotCommand.clearInvites,
			aliases: ['clear-invites'],
			args: [
				{
					name: 'user',
					resolver: UserResolver
				}
			],
			flags: [
				{
					name: 'date',
					resolver: DateResolver,
					short: 'd'
				},
				{
					name: 'clearBonus',
					resolver: BooleanResolver,
					short: 'cb'
				}
			],
			group: CommandGroup.Invites,
			guildOnly: true,
			strict: true
		});
	}

	public async action(
		message: Message,
		[user]: [BasicUser],
		{ date, clearBonus }: { date: Moment; clearBonus: boolean },
		{ guild, t }: Context
	): Promise<any> {
		const memberId = user ? user.id : undefined;

		await this.repo.invCodes
			.createQueryBuilder('i')
			.update()
			.set({ clearedAmount: () => 'i.uses' })
			.where('guildId = :guildId AND inviterId :memberId', {
				guildId: guild.id,
				inviterId: memberId ? memberId : Not(null)
			})
			.execute();

		await this.repo.joins.update(
			{
				guildId: guild.id,
				...(memberId && {
					exactMatchCode: In(
						(await this.repo.invCodes.find({
							where: { guildId: guild.id, inviterId: memberId }
						})).map(ic => ic.code)
					)
				})
			},
			{
				cleared: true
			}
		);

		await this.repo.customInvs.update(
			{
				guildId: guild.id,
				...(memberId && { memberId })
			},
			{
				cleared: false
			}
		);

		if (clearBonus) {
			// Clear invites
			await this.repo.customInvs.update(
				{
					guildId: guild.id,
					...(memberId && { memberId })
				},
				{
					cleared: true
				}
			);
		}

		this.client.logAction(guild, message, LogAction.clearInvites, {
			clearBonus,
			...(memberId && { targetId: memberId })
		});

		return this.sendReply(message, t('cmd.clearInvites.done'));
	}
}
