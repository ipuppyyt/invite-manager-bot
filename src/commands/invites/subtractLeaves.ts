import { Message } from 'eris';

import { IMClient } from '../../client';
import { CustomInvitesGeneratedReason } from '../../models/CustomInvite';
import { BotCommand, CommandGroup } from '../../types';
import { Command, Context } from '../Command';

export default class extends Command {
	public constructor(client: IMClient) {
		super(client, {
			name: BotCommand.subtractLeaves,
			aliases: ['subtract-leaves', 'subleaves', 'sl'],
			group: CommandGroup.Invites,
			guildOnly: true,
			strict: true
		});
	}

	public async action(
		message: Message,
		args: any[],
		flags: {},
		{ guild, t, settings }: Context
	): Promise<any> {
		const ls = await this.repo.leaves
			.createQueryBuilder('l')
			.select('l.memberId')
			.addSelect(
				'TIMESTAMPDIFF(SECOND, MAX(j.createdAt), MAX(l.createdAt))',
				'timeDiff'
			)
			.innerJoin('l.join', 'j')
			.innerJoin('j.exactMatch', 'ic')
			.where('guildId = :guildId', { guildId: guild.id })
			.groupBy('l.memberId')
			.addGroupBy('ic.code')
			.getRawMany();

		if (ls.length === 0) {
			return this.sendReply(message, t('cmd.subtractLeaves.none'));
		}

		// Delete old duplicate removals
		await this.repo.customInvs.update(
			{
				guildId: guild.id,
				generatedReason: CustomInvitesGeneratedReason.leave
			},
			{ deletedAt: new Date() }
		);

		const threshold = settings.autoSubtractLeaveThreshold;

		// Add subtracts for leaves
		const customInvs = ls
			.filter((l: any) => parseInt(l.timeDiff, 10) < threshold)
			.map((l: any) => ({
				id: null,
				guildId: guild.id,
				memberId: l['join.exactMatch.inviterId'],
				creatorId: null,
				amount: -1,
				reason: l.memberId,
				generatedReason: CustomInvitesGeneratedReason.leave
			}));
		// TODO: updateOnDuplicate: ['amount', 'updatedAt']
		await this.repo.customInvs.save(customInvs);

		return this.sendReply(
			message,
			t('cmd.subtractLeaves.done', { total: customInvs.length })
		);
	}
}
