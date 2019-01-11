import { Guild } from 'eris';
import moment from 'moment';
import { getRepository, In, Repository } from 'typeorm';

import { IMClient } from '../client';
import {
	CustomInvite,
	CustomInvitesGeneratedReason
} from '../models/CustomInvite';
import { InviteCode } from '../models/InviteCode';
import { Join } from '../models/Join';
import { Member } from '../models/Member';
import { MemberSettingsKey } from '../models/MemberSetting';
import { InviteCounts } from '../types';

// Extra query stuff we need in multiple places
const sumClearRegular = [
	`SUM(IF(ci.generatedReason='clear_regular',ci.amount,0))`,
	'totalClearRegular'
];

const sumTotalCustom = [
	`SUM(IF(ci.generatedReason IS NULL OR ` +
		`ci.generatedReason='clear_custom',ci.amount,0))`,
	'totalCustom'
];

const sumTotalFake = [
	`SUM(IF(ci.generatedReason = 'fake' OR ` +
		`ci.generatedReason='clear_fake',ci.amount,0))`,
	'totalFake'
];

const sumTotalLeaves = [
	`SUM(IF(ci.generatedReason = 'leave' OR ` +
		`ci.generatedReason='clear_leave',ci.amount,0))`,
	'totalLeaves'
];

type InvCacheType = {
	[x: string]: {
		id: string;
		name: string;
		total: number;
		regular: number;
		custom: number;
		fake: number;
		leaves: number;
		oldTotal: number;
		oldRegular: number;
		oldCustom: number;
		oldFake: number;
		oldLeaves: number;
	};
};

export class InvitesService {
	private client: IMClient;

	private customInvs: Repository<CustomInvite>;
	private invs: Repository<InviteCode>;
	private joins: Repository<Join>;
	private members: Repository<Member>;

	public constructor(client: IMClient) {
		this.client = client;

		this.customInvs = getRepository(CustomInvite);
		this.invs = getRepository(InviteCode);
		this.joins = getRepository(Join);
		this.members = getRepository(Member);
	}

	public async getInviteCounts(
		guildId: string,
		memberId: string
	): Promise<InviteCounts> {
		const regularPromise = await this.invs
			.createQueryBuilder('ic')
			.select('SUM(ic.uses)', 'total')
			.where('ci.guildId = :guildId', { guildId: guildId })
			.andWhere('ci.inviterId = :inviterId', { inviterId: memberId })
			.getRawOne()
			.then(val => val.total);

		const customPromise = await this.customInvs
			.createQueryBuilder('ci')
			.select('ci.generatedReason')
			.addSelect('SUM(ci.amount)', 'total')
			.where('ci.guildId = :guildId', { guildId: guildId })
			.andWhere('ci.inviterId = :inviterId', { inviterId: memberId })
			.groupBy('ci.generatedReason')
			.getRawMany();

		const values = await Promise.all([regularPromise, customPromise]);

		const reg = values[0] || 0;

		const customUser = values[1].find(ci => ci.generatedReason === null) as any;
		const ctm = customUser ? parseInt(customUser.total, 10) : 0;

		const generated: { [x in CustomInvitesGeneratedReason]: number } = {
			[CustomInvitesGeneratedReason.clear_regular]: 0,
			[CustomInvitesGeneratedReason.clear_custom]: 0,
			[CustomInvitesGeneratedReason.clear_fake]: 0,
			[CustomInvitesGeneratedReason.clear_leave]: 0,
			[CustomInvitesGeneratedReason.fake]: 0,
			[CustomInvitesGeneratedReason.leave]: 0
		};

		values[1].forEach((ci: any) => {
			if (ci.generatedReason === null) {
				return;
			}
			const reason = ci.generatedReason as CustomInvitesGeneratedReason;
			const amount = parseInt(ci.total, 10);
			generated[reason] = amount;
		});

		const regular = reg + generated[CustomInvitesGeneratedReason.clear_regular];
		const custom = ctm + generated[CustomInvitesGeneratedReason.clear_custom];
		const fake =
			generated[CustomInvitesGeneratedReason.fake] +
			generated[CustomInvitesGeneratedReason.clear_fake];
		const leave =
			generated[CustomInvitesGeneratedReason.leave] +
			generated[CustomInvitesGeneratedReason.clear_leave];

		return {
			regular,
			custom,
			fake,
			leave,
			total: regular + custom + fake + leave
		};
	}

	public async generateLeaderboard(
		guild: Guild,
		hideLeft?: boolean,
		from: moment.Moment = moment(),
		to?: moment.Moment,
		limit: number = null
	) {
		const guildId = guild.id;

		const codeInvs = await this.invs
			.createQueryBuilder('ic')
			.select('ic.inviterId')
			.addSelect('SUM(ic.uses)', 'totalJoins')
			.innerJoin('ic.inviter', 'm')
			.where('ic.guildId = :guildId', { guildId })
			.groupBy('ic.inviterId')
			.orderBy('ic.totalJoins', 'DESC')
			.addOrderBy('ic.inviterId', 'ASC')
			.limit(limit)
			.getRawMany();

		const codeInvsSub = await this.joins
			.createQueryBuilder('j')
			.select('j.inviterId', 'inviterId')
			.addSelect('COUNT(j.id)', 'totalJoins')
			.innerJoin('j.exactMatch', 'ic')
			.where('j.exactMatchCode = :code', In(codeInvs.map(ic => ic.code)))
			.andWhere('j.deletedAt IS NULL')
			.andWhere('j.createdAt >= :date', { date: from.toDate() })
			.groupBy('ic.inviterId')
			.getRawMany();

		const customInvs = await this.customInvs
			.createQueryBuilder('ci')
			.select(sumClearRegular)
			.addSelect(sumTotalCustom)
			.addSelect(sumTotalFake)
			.addSelect(sumTotalLeaves)
			.leftJoinAndSelect('ci.member', 'm')
			.where('ci.guildId = :guildId', { guildId })
			.andWhere('ci.createdAt <= :from', { from: from.toDate() })
			.groupBy('ci.memberId')
			.getRawMany();

		const invs: InvCacheType = {};
		codeInvs.forEach(inv => {
			const id = inv.inviterId;
			const subInv = codeInvsSub.find(s => s.inviterId === id);
			const sub = subInv ? subInv.totalJoins : 0;
			invs[id] = {
				id,
				name: inv['inviter.name'],
				total: parseInt(inv.totalJoins, 10) - sub,
				regular: parseInt(inv.totalJoins, 10) - sub,
				custom: 0,
				fake: 0,
				leaves: 0,
				oldTotal: 0,
				oldRegular: 0,
				oldCustom: 0,
				oldFake: 0,
				oldLeaves: 0
			};
		});
		customInvs.forEach(inv => {
			const id = inv.memberId;
			const clearReg = parseInt(inv.totalClearRegular, 10);
			const custom = parseInt(inv.totalCustom, 10);
			const fake = parseInt(inv.totalFake, 10);
			const lvs = parseInt(inv.totalLeaves, 10);
			if (invs[id]) {
				invs[id].total += custom + clearReg + fake + lvs;
				invs[id].regular += clearReg;
				invs[id].custom = custom;
				invs[id].fake = fake;
				invs[id].leaves = lvs;
			} else {
				invs[id] = {
					id,
					name: inv['member.name'],
					total: custom + clearReg + fake + lvs,
					regular: clearReg,
					custom: custom,
					fake: fake,
					leaves: lvs,
					oldTotal: 0,
					oldRegular: 0,
					oldCustom: 0,
					oldFake: 0,
					oldLeaves: 0
				};
			}
		});

		if (to) {
			const oldCodeInvs = await this.invs
				.createQueryBuilder('inv')
				.leftJoinAndSelect('inv.inviter', 'inviter')
				.addSelect(
					'SUM(inv.uses) - MAX((SELECT COUNT(joins.id) FROM joins WHERE ' +
						`exactMatchCode = code AND deletedAt IS NULL AND ` +
						`createdAt >= '${to.utc().format('YYYY/MM/DD HH:mm:ss')}'))`,
					'totalJoins'
				)
				.where('inv.guildId = :guildId', { guildId })
				.groupBy('inv.inviterId')
				.orderBy('totalJoins DESC')
				.addOrderBy('inv.inviterId')
				.getRawMany();

			const oldCustomInvs = await customInvites.findAll({
				attributes: attrs,
				where: {
					guildId,
					createdAt: {
						[Op.lte]: to
					}
				},
				group: ['memberId'],
				include: [
					{
						attributes: ['name'],
						model: members
					}
				],
				raw: true
			});

			oldCodeInvs.forEach(inv => {
				const id = inv.inviterId;
				if (invs[id]) {
					invs[id].oldTotal = parseInt(inv.totalJoins, 10);
					invs[id].oldRegular = parseInt(inv.totalJoins, 10);
				} else {
					invs[id] = {
						id,
						name: inv['inviter.name'],
						total: 0,
						regular: 0,
						custom: 0,
						fake: 0,
						leaves: 0,
						oldTotal: parseInt(inv.totalJoins, 10),
						oldRegular: parseInt(inv.totalJoins, 10),
						oldCustom: 0,
						oldFake: 0,
						oldLeaves: 0
					};
				}
			});
			oldCustomInvs.forEach((inv: any) => {
				const id = inv.memberId;
				const clearReg = parseInt(inv.totalClearRegular, 10);
				const custom = parseInt(inv.totalCustom, 10);
				const fake = parseInt(inv.totalFake, 10);
				const lvs = parseInt(inv.totalLeaves, 10);
				if (invs[id]) {
					invs[id].oldTotal += custom + clearReg + fake + lvs;
					invs[id].oldRegular += clearReg;
					invs[id].oldCustom = custom;
					invs[id].oldFake = fake;
					invs[id].oldLeaves = lvs;
				} else {
					invs[id] = {
						id,
						name: inv['member.name'],
						total: 0,
						regular: 0,
						custom: 0,
						fake: 0,
						leaves: 0,
						oldTotal: custom + clearReg + fake + lvs,
						oldRegular: clearReg,
						oldCustom: custom,
						oldFake: fake,
						oldLeaves: lvs
					};
				}
			});
		}

		const hidden = (await memberSettings.findAll({
			attributes: ['memberId'],
			where: {
				guildId,
				key: MemberSettingsKey.hideFromLeaderboard,
				value: 'true'
			},
			raw: true
		})).map(i => i.memberId);

		const rawKeys = Object.keys(invs)
			.filter(k => hidden.indexOf(k) === -1 && invs[k].total > 0)
			.sort((a, b) => {
				const diff = invs[b].total - invs[a].total;
				return diff !== 0
					? diff
					: invs[a].name
					? invs[a].name.localeCompare(invs[b].name)
					: 0;
			});

		const lastJoinAndLeave = await this.members
			.createQueryBuilder('m')
			.select(['m.id', 'm.name'])
			.addSelect('MAX(j.createdAt)', 'lastJoinedAt')
			.addSelect('MAX(l.createdAt)', 'lastLeftAt')
			.leftJoinAndSelect('m.joins', 'j')
			.leftJoinAndSelect('m.leaves', 'l')
			.where('m.id = :ids', { ids: In(rawKeys) })
			.groupBy('m.id')
			.getRawMany();

		const stillInServer: { [x: string]: boolean } = {};
		lastJoinAndLeave.forEach(jal => {
			if (!jal.lastLeftAt) {
				stillInServer[jal.id] = true;
				return;
			}
			if (!jal.lastJoinedAt) {
				stillInServer[jal.id] = false;
				return;
			}
			stillInServer[jal.id] = moment(jal.lastLeftAt).isBefore(
				moment(jal.lastJoinedAt)
			);
		});

		const keys = rawKeys.filter(
			k => !hideLeft || (guild.members.has(k) && stillInServer[k])
		);

		const oldKeys = [...keys].sort((a, b) => {
			const diff = invs[b].oldTotal - invs[a].oldTotal;
			return diff !== 0
				? diff
				: invs[a].name
				? invs[a].name.localeCompare(invs[b].name)
				: 0;
		});

		return { keys, oldKeys, invs, stillInServer };
	}
}
