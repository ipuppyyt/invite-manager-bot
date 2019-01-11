import {
	BaseEntity,
	Column,
	CreateDateColumn,
	Entity,
	ManyToOne,
	PrimaryGeneratedColumn,
	UpdateDateColumn
} from 'typeorm';

import { Guild } from './Guild';

export enum SettingsKey {
	prefix = 'prefix',
	lang = 'lang',
	getUpdates = 'getUpdates',
	logChannel = 'logChannel',

	joinMessage = 'joinMessage',
	joinMessageChannel = 'joinMessageChannel',
	leaveMessage = 'leaveMessage',
	leaveMessageChannel = 'leaveMessageChannel',

	leaderboardStyle = 'leaderboardStyle',
	hideLeftMembersFromLeaderboard = 'hideLeftMembersFromLeaderboard',

	autoSubtractFakes = 'autoSubtractFakes',
	autoSubtractLeaves = 'autoSubtractLeaves',
	autoSubtractLeaveThreshold = 'autoSubtractLeaveThreshold',

	rankAssignmentStyle = 'rankAssignmentStyle',
	rankAnnouncementChannel = 'rankAnnouncementChannel',
	rankAnnouncementMessage = 'rankAnnouncementMessage',

	mutedRole = 'mutedRole',

	captchaVerificationOnJoin = 'captchaVerificationOnJoin',
	captchaVerificationWelcomeMessage = 'captchaVerificationWelcomeMessage',
	captchaVerificationSuccessMessage = 'captchaVerificationSuccessMessage',
	captchaVerificationFailedMessage = 'captchaVerificationFailedMessage',
	captchaVerificationTimeout = 'captchaVerificationTimeout',
	captchaVerificationLogEnabled = 'captchaVerificationLogEnabled',

	modLogChannel = 'modLogChannel',
	modPunishmentBanDeleteMessage = 'modPunishmentBanDeleteMessage',
	modPunishmentKickDeleteMessage = 'modPunishmentKickDeleteMessage',
	modPunishmentSoftbanDeleteMessage = 'modPunishmentSoftbanDeleteMessage',
	modPunishmentWarnDeleteMessage = 'modPunishmentWarnDeleteMessage',
	modPunishmentMuteDeleteMessage = 'modPunishmentMuteDeleteMessage',

	autoModEnabled = 'autoModEnabled',
	autoModModeratedChannels = 'autoModModeratedChannels',
	autoModModeratedRoles = 'autoModModeratedRoles',
	autoModIgnoredChannels = 'autoModIgnoredChannels',
	autoModIgnoredRoles = 'autoModIgnoredRoles',
	autoModDeleteBotMessage = 'autoModDeleteBotMessage',
	autoModDeleteBotMessageTimeoutInSeconds = 'autoModDeleteBotMessageTimeoutInSeconds',
	autoModLogEnabled = 'autoModLogEnabled',

	autoModDisabledForOldMembers = 'autoModDisabledForOldMembers',
	autoModDisabledForOldMembersThreshold = 'autoModDisabledForOldMembersThreshold',

	autoModInvitesEnabled = 'autoModInvitesEnabled',

	autoModLinksEnabled = 'autoModLinksEnabled',
	autoModLinksWhitelist = 'autoModLinksWhitelist',
	autoModLinksBlacklist = 'autoModLinksBlacklist',
	autoModLinksFollowRedirects = 'autoModLinksFollowRedirects',

	autoModWordsEnabled = 'autoModWordsEnabled',
	autoModWordsBlacklist = 'autoModWordsBlacklist',

	autoModAllCapsEnabled = 'autoModAllCapsEnabled',
	autoModAllCapsMinCharacters = 'autoModAllCapsMinCharacters',
	autoModAllCapsPercentageCaps = 'autoModAllCapsPercentageCaps',

	autoModDuplicateTextEnabled = 'autoModDuplicateTextEnabled',
	autoModDuplicateTextTimeframeInSeconds = 'autoModDuplicateTextTimeframeInSeconds',

	autoModQuickMessagesEnabled = 'autoModQuickMessagesEnabled',
	autoModQuickMessagesNumberOfMessages = 'autoModQuickMessagesNumberOfMessages',
	autoModQuickMessagesTimeframeInSeconds = 'autoModQuickMessagesTimeframeInSeconds',

	autoModMentionUsersEnabled = 'autoModMentionUsersEnabled',
	autoModMentionUsersMaxNumberOfMentions = 'autoModMentionUsersMaxNumberOfMentions',

	autoModMentionRolesEnabled = 'autoModMentionRolesEnabled',
	autoModMentionRolesMaxNumberOfMentions = 'autoModMentionRolesMaxNumberOfMentions',

	autoModEmojisEnabled = 'autoModEmojisEnabled',
	autoModEmojisMaxNumberOfEmojis = 'autoModEmojisMaxNumberOfEmojis',

	autoModHoistEnabled = 'autoModHoistEnabled'
}

export enum Lang {
	de = 'de',
	en = 'en',
	es = 'es',
	fr = 'fr',
	it = 'it',
	nl = 'nl',
	pt = 'pt',
	ro = 'ro',
	sv = 'sv'
}

export enum LeaderboardStyle {
	normal = 'normal',
	table = 'table',
	mentions = 'mentions'
}

export enum RankAssignmentStyle {
	all = 'all',
	highest = 'highest'
}

@Entity()
export class Setting extends BaseEntity {
	@PrimaryGeneratedColumn()
	public id: string;

	@CreateDateColumn()
	public createdAt: Date;

	@UpdateDateColumn()
	public updatedAt: Date;

	@Column({ nullable: true })
	public deletedAt: Date;

	@Column()
	public key: SettingsKey;

	@Column({ type: 'text' })
	public value: string;

	@Column({ nullable: true })
	public guildId: string;

	@ManyToOne(type => Guild, g => g.settings)
	public guild: Guild;
}
