import { Message } from 'eris';
import { In, Not } from 'typeorm';

import { IMClient } from '../../client';
import { LogAction } from '../../models/Log';
import { BasicUser, UserResolver } from '../../resolvers';
import { BotCommand, CommandGroup } from '../../types';
import { Command, Context } from '../Command';

export default class extends Command {
	public constructor(client: IMClient) {
		super(client, {
			name: BotCommand.restoreInvites,
			aliases: ['restore-invites', 'unclear-invites', 'unclearInvites'],
			args: [
				{
					name: 'user',
					resolver: UserResolver
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
		flags: {},
		{ guild, t }: Context
	): Promise<any> {
		const memberId = user ? user.id : null;

		await this.repo.invCodes.update(
			{
				guildId: guild.id,
				inviterId: memberId ? memberId : Not(null)
			},
			{
				clearedAmount: 0
			}
		);

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
				cleared: false
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

		this.client.logAction(guild, message, LogAction.restoreInvites, {
			...(memberId && { targetId: memberId })
		});

		return this.sendReply(message, t('cmd.restoreInvites.done'));
	}
}
