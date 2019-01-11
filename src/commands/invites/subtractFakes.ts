import { Message } from 'eris';

import { IMClient } from '../../client';
import { CustomInvitesGeneratedReason } from '../../models/CustomInvite';
import { BotCommand, CommandGroup } from '../../types';
import { Command, Context } from '../Command';

export default class extends Command {
	public constructor(client: IMClient) {
		super(client, {
			name: BotCommand.subtractFakes,
			aliases: ['subtract-fakes', 'subfakes', 'sf'],
			group: CommandGroup.Invites,
			guildOnly: true,
			strict: true
		});
	}

	public async action(
		message: Message,
		args: any[],
		flags: {},
		{ guild, t }: Context
	): Promise<any> {
		const js = await this.repo.joins
			.createQueryBuilder('j')
			.select(['j.memberId', 'ic.code', 'ic.inviterId'])
			.addSelect('COUNT(ic.code)', 'numJoins')
			.addSelect('MAX(j.createdAt)', 'newestJoin')
			.innerJoin('j.exactMatch', 'ic')
			.where({ guildId: guild.id })
			.groupBy('j.memberId')
			.addGroupBy('ic.code')
			.getRawMany();

		if (js.length === 0) {
			return this.sendReply(message, t('cmd.subtractFakes.none'));
		}

		// Delete old duplicate removals
		await this.repo.customInvs.update(
			{
				guildId: guild.id,
				generatedReason: CustomInvitesGeneratedReason.fake
			},
			{ deletedAt: new Date() }
		);

		// Add subtracts for duplicate invites
		const customInvs = js
			.filter((j: any) => parseInt(j.numJoins, 10) > 1)
			.map((j: any) => ({
				id: null,
				guildId: guild.id,
				memberId: j['exactMatch.inviterId'],
				creatorId: null,
				amount: -(parseInt(j.numJoins, 10) - 1),
				reason: j.memberId,
				generatedReason: CustomInvitesGeneratedReason.fake
			}));
		// TODO: updateOnDuplicate: ['amount', 'updatedAt']
		await this.repo.customInvs.save(customInvs);

		const total = -customInvs.reduce((acc, inv) => acc + inv.amount, 0);
		return this.sendReply(message, t('cmd.subtractFakes.done', { total }));
	}
}
