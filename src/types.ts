import { VoiceConnection, VoiceConnectionManager } from 'eris';

export enum BotType {
	regular = 'regular',
	pro = 'pro',
	custom = 'custom'
}

export interface BasicUser {
	id: string;
	createdAt: number;
	username: string;
	avatarURL: string;
	discriminator: string;
}

export enum GuildPermission {
	ADMINISTRATOR = 'administrator',
	READ_MESSAGES = 'readMessages',
	SEND_MESSAGES = 'sendMessages',
	MANAGE_MESSAGES = 'manageMessages',
	EMBED_LINKS = 'embedLinks',
	MANAGE_GUILD = 'manageGuild',
	MANAGE_CHANNELS = 'manageChannels',
	VIEW_AUDIT_LOGS = 'viewAuditLogs',
	MANAGE_ROLES = 'manageRoles',
	CREATE_INSTANT_INVITE = 'createInstantInvite',
	BAN_MEMBERS = 'banMembers',
	KICK_MEMBERS = 'kickMembers',
	ADD_REACTIONS = 'addReactions',
	MANAGE_EMOJIS = 'manageEmojis',
	READ_MESSAGE_HISTORY = 'readMessageHistory'
}

export enum GuildFeature {
	INVITE_SPLASH = 'INVITE_SPLASH',
	VIP_REGIONS = 'VIP_REGIONS',
	VANITY_URL = 'VANITY_URL',
	VERIFIED = 'VERIFIED',
	PARTNERED = 'PARTNERED',
	PUBLIC = 'PUBLIC',
	COMMERCE = 'COMMERCE',
	NEWS = 'NEWS',
	DISCOVERABLE = 'DISCOVERABLE',
	FEATURABLE = 'FEATURABLE',
	ANIMATED_ICON = 'ANIMATED_ICON',
	BANNER = 'BANNER',
	PUBLIC_DISABLED = 'PUBLIC_DISABLED'
}

export enum PromptResult {
	SUCCESS,
	FAILURE,
	TIMEOUT
}

export enum CommandGroup {
	Invites = 'Invites',
	Ranks = 'Ranks',
	Config = 'Config',
	EasyConfig = 'EasyConfig',
	Info = 'Info',
	Premium = 'Premium',
	Moderation = 'Moderation',
	Report = 'Report',
	Other = 'Other'
}

export enum ShardCommand {
	CACHE = 'CACHE',
	CUSTOM = 'CUSTOM',
	DIAGNOSE = 'DIAGNOSE',
	FLUSH_CACHE = 'FLUSH_CACHE',
	SUDO = 'SUDO',
	OWNER_DM = 'OWNER_DM',
	USER_DM = 'USER_DM',
	LEAVE_GUILD = 'LEAVE_GUILD',
	STATUS = 'STATUS',
	RELOAD_MUSIC_NODES = 'RELOAD_MUSIC_NODES'
}

export enum ChartType {
	joins = 'joins',
	leaves = 'leaves',
	joinsAndLeaves = 'joinsAndLeaves'
}

export enum BotCommand {
	config = 'config',
	botConfig = 'botConfig',
	inviteCodeConfig = 'inviteCodeConfig',
	memberConfig = 'memberConfig',
	permissions = 'permissions',
	interactiveConfig = 'interactiveConfig',
	setJoinChannel = 'setJoinChannel',

	botInfo = 'botInfo',
	credits = 'credits',
	getBot = 'getBot',
	help = 'help',
	members = 'members',
	ping = 'ping',
	prefix = 'prefix',
	setup = 'setup',
	support = 'support',

	export = 'export',
	premium = 'premium',
	tryPremium = 'tryPremium'

	/*report = 'report',*/
}

export enum InvitesCommand {
	createInvite = 'createInvite',
	addInvites = 'addInvites',
	clearInvites = 'clearInvites',
	info = 'info',
	inviteCodes = 'inviteCodes',
	inviteDetails = 'inviteDetails',
	invites = 'invites',
	leaderboard = 'leaderboard',
	removeInvites = 'removeInvites',
	restoreInvites = 'restoreInvites',
	subtractFakes = 'subtractFakes',
	subtractLeaves = 'subtractLeaves',

	addRank = 'addRank',
	fixRanks = 'fixRanks',
	ranks = 'ranks',
	removeRank = 'removeRank',

	graph = 'graph'
}

export enum ModerationCommand {
	punishmentConfig = 'punishmentConfig',
	strikeConfig = 'strikeConfig',

	check = 'check',
	caseDelete = 'caseDelete',
	caseView = 'caseView',
	caseEdit = 'caseEdit',

	ban = 'ban',
	mute = 'mute',
	kick = 'kick',
	softBan = 'softBan',
	strike = 'strike',
	unban = 'unban',
	unhoist = 'unhoist',
	unmute = 'unmute',
	warn = 'warn',
	lockdown = 'lockdown',

	clean = 'clean',
	cleanText = 'cleanText',
	cleanShort = 'cleanShort',
	purgeSafe = 'purgeSafe',
	purgeUntil = 'purgeUntil',
	purge = 'purge'
}

export enum ManagementCommand {
	placeholder = 'placeholder',
	reactionRole = 'reactionRole',
	makeMentionable = 'makeMentionable',
	mentionRole = 'mentionRole'
}

export enum ChannelType {
	GUILD_TEXT = 0,
	DM = 1,
	GUILD_VOICE = 2,
	GROUP_DM = 3,
	GUILD_CATEGORY = 4
}

export interface BasicInvite {
	code: string;
	channel: {
		id: string;
		name: string;
	};
}
export interface BasicMember {
	nick?: string;
	user: {
		id: string;
		username: string;
		discriminator: string;
		avatarURL: string;
	};
}

export interface GatewayInfo {
	url: string;
	shards: number;
	session_start_limit: {
		total: number;
		remaining: number;
		reset_after: number;
	};
}
