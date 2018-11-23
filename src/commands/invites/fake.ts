import { Message } from 'eris';

import { IMClient } from '../../client';
import { NumberResolver } from '../../resolvers';
import { BotCommand, CommandGroup } from '../../types';
import { Command, Context } from '../Command';

const usersPerPage = 20;

export default class extends Command {
	public constructor(client: IMClient) {
		super(client, {
			name: BotCommand.fake,
			aliases: ['fakes', 'cheaters', 'cheater', 'invalid'],
			args: [
				{
					name: 'page',
					resolver: NumberResolver
				}
			],
			// clientPermissions: ['MANAGE_GUILD'],
			group: CommandGroup.Invites,
			guildOnly: true
		});
	}

	public async action(
		message: Message,
		[_page]: [number],
		{ guild, t }: Context
	): Promise<any> {
		const js = await this.repo.joins
			.createQueryBuilder('j')
			.select('j.memberId')
			.addSelect('m.name', 'memberName')
			.addSelect('COUNT(j.id)', 'totalJoins')
			.addSelect(
				'GROUP_CONCAT(CONCAT(ic.inviterId, "|", i.name) SEPARATOR "\\t")',
				'inviterIds'
			)
			.innerJoin('j.member', 'm')
			.innerJoin('j.exactMatch', 'ic')
			.innerJoin('ic.inviter', 'i')
			.where('guildId = :guildId', { guildId: guild.id })
			.groupBy('j.memberId')
			.getRawMany();

		if (js.length <= 0) {
			return this.sendReply(message, t('cmd.fake.none'));
		}

		const suspiciousJoins = js
			.filter(j => Number(j.totalJoins) > 1)
			.sort((a, b) => Number(b.totalJoins) - Number(a.totalJoins));

		if (suspiciousJoins.length === 0) {
			return this.sendReply(message, t('cmd.fake.noneSinceJoin'));
		}

		const maxPage = Math.ceil(suspiciousJoins.length / usersPerPage);
		const p = Math.max(Math.min(_page ? _page - 1 : 0, maxPage - 1), 0);

		this.showPaginated(message, p, maxPage, page => {
			let description = '';

			suspiciousJoins
				.slice(page * usersPerPage, (page + 1) * usersPerPage)
				.forEach(join => {
					if (!join.inviterIds) {
						return;
					}

					const invs: { [x: string]: number } = {};
					join.inviterIds.split('\t').forEach((idName: string) => {
						const name = idName.split('|', 2)[1];
						if (invs[name]) {
							invs[name]++;
						} else {
							invs[name] = 1;
						}
					});

					const mainText = t('cmd.fake.join.entry.text', {
						name: join.memberName,
						times: join.totalJoins
					});

					const invText = Object.keys(invs)
						.map(name => {
							return t('cmd.fake.join.entry.invite', {
								name,
								times: invs[name] > 1 ? invs[name] : undefined
							});
						})
						.join(', ');

					const newFakeText = mainText + ' ' + invText + '\n';
					if (description.length + newFakeText.length < 2048) {
						description += newFakeText;
					}
				});

			return this.createEmbed({
				title: t('cmd.fake.title'),
				description
			});
		});
	}
}
