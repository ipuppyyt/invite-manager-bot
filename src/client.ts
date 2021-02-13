import chalk from 'chalk';
import Eris, { Client, Embed, Guild, Member, Message, TextChannel } from 'eris';
import i18n from 'i18n';
import moment, { Moment } from 'moment';

import { Cache } from './framework/cache/Cache';
import { GuildSettingsCache } from './framework/cache/GuildSettingsCache';
import { MemberSettingsCache } from './framework/cache/MemberSettingsCache';
import { PermissionsCache } from './framework/cache/PermissionsCache';
import { GuildSettingsKey } from './framework/models/GuildSetting';
import { LogAction } from './framework/models/Log';
import { IMRequestHandler } from './framework/RequestHandler';
import { CommandsService } from './framework/services/Commands';
import { DatabaseService } from './framework/services/DatabaseService';
import { MessagingService } from './framework/services/Messaging';
import { RabbitMqService } from './framework/services/RabbitMq';
import { SocketioService } from './framework/services/Socket';
import { SchedulerService } from './framework/services/Scheduler';
import { IMService } from './framework/services/Service';
import { InviteCodeSettingsCache } from './invites/cache/InviteCodeSettingsCache';
import { InvitesCache } from './invites/cache/InvitesCache';
import { LeaderboardCache } from './invites/cache/LeaderboardCache';
import { RanksCache } from './invites/cache/RanksCache';
import { VanityUrlCache } from './invites/cache/VanityUrlCache';
import { CaptchaService } from './invites/services/Captcha';
import { InvitesService } from './invites/services/Invites';
import { TrackingService } from './invites/services/Tracking';
import { ReactionRoleCache } from './management/cache/ReactionRoleCache';
import { ManagementService } from './management/services/ManagementService';
import { PunishmentCache } from './moderation/cache/PunishmentsCache';
import { StrikesCache } from './moderation/cache/StrikesCache';
import { ModerationService } from './moderation/services/Moderation';
import { botDefaultSettings, BotSettingsObject, guildDefaultSettings } from './settings';
import { BotType, ChannelType } from './types';

i18n.configure({
	locales: ['cs', 'de', 'en', 'es', 'fr', 'it', 'ja', 'nl', 'pl', 'pt', 'pt_BR', 'ro', 'ru', 'tr'],
	defaultLocale: 'en',
	// syncFiles: true,
	directory: __dirname + '/../i18n/bot',
	objectNotation: true,
	logDebugFn: function (msg: string) {
		console.log('debug', msg);
	},
	logWarnFn: function (msg: string) {
		console.error('warn', msg);
	},
	logErrorFn: function (msg: string) {
		console.error('error', msg);
	}
});

export interface ClientOptions {
	version: string;
	token: string;
	type: BotType;
	instance: string;
	shardId: number;
	shardCount: number;
	flags: string[];
	config: any;
}

export interface ClientCacheObject {
	[key: string]: Cache<any>;

	inviteCodes: InviteCodeSettingsCache;
	invites: InvitesCache;
	vanity: VanityUrlCache;
	leaderboard: LeaderboardCache;
	ranks: RanksCache;
	members: MemberSettingsCache;
	permissions: PermissionsCache;
	punishments: PunishmentCache;
	guilds: GuildSettingsCache;
	strikes: StrikesCache;
	reactionRoles: ReactionRoleCache;
}

export interface ClientServiceObject {
	[key: string]: IMService;

	database: DatabaseService;
	rabbitmq: RabbitMqService;
	socket: SocketioService;
	message: MessagingService;
	moderation: ModerationService;
	scheduler: SchedulerService;
	commands: CommandsService;
	captcha: CaptchaService;
	invites: InvitesService;
	tracking: TrackingService;
	management: ManagementService;
}

export class IMClient extends Client {
	public version: string;
	public config: any;
	public flags: string[];
	public type: BotType;
	public instance: string;
	public settings: BotSettingsObject;
	public hasStarted: boolean = false;

	public shardId: number;
	public shardCount: number;

	public requestHandler: IMRequestHandler;
	public service: ClientServiceObject;
	private startingServices: IMService[];
	public cache: ClientCacheObject;

	// Service shortcuts
	public db: DatabaseService;
	public rabbitmq: RabbitMqService;
	public socket: SocketioService;
	public msg: MessagingService;
	public mod: ModerationService;
	public scheduler: SchedulerService;
	public cmds: CommandsService;
	public captcha: CaptchaService;
	public invs: InvitesService;
	public tracking: TrackingService;
	public management: ManagementService;
	// End service shortcuts

	public startedAt: Moment;
	public gatewayConnected: boolean;
	public activityInterval: NodeJS.Timer;
	public stats: {
		wsEvents: number;
		wsWarnings: number;
		wsErrors: number;
		cmdProcessed: number;
		cmdErrors: number;
	};

	public disabledGuilds: Set<string> = new Set();

	public constructor({ version, token, type, instance, shardId, shardCount, flags, config }: ClientOptions) {
		super(token, {
			allowedMentions: {
				everyone: false,
				roles: true,
				users: true
			},
			firstShardID: shardId - 1,
			lastShardID: shardId - 1,
			maxShards: shardCount,
			disableEvents: {
				TYPING_START: true,
				PRESENCE_UPDATE: true,
				VOICE_STATE_UPDATE: true,
				USER_UPDATE: true
			},
			restMode: true,
			messageLimit: 2,
			getAllUsers: false,
			compress: true,
			guildCreateTimeout: 60000
		});

		this.stats = {
			wsEvents: 0,
			wsWarnings: 0,
			wsErrors: 0,
			cmdProcessed: 0,
			cmdErrors: 0
		};

		this.requestHandler = new IMRequestHandler(this);
		this.version = version;
		this.type = type;
		this.instance = instance;
		this.shardId = shardId;
		this.shardCount = shardCount;
		this.flags = flags;
		this.config = config;
		this.shardId = shardId;
		this.shardCount = shardCount;

		this.service = {
			database: new DatabaseService(this),
			rabbitmq: new RabbitMqService(this),
			socket: new SocketioService(this),
			message: new MessagingService(this),
			moderation: new ModerationService(this),
			scheduler: new SchedulerService(this),
			commands: new CommandsService(this),
			captcha: new CaptchaService(this),
			invites: new InvitesService(this),
			tracking: new TrackingService(this),
			management: new ManagementService(this)
		};
		this.startingServices = Object.values(this.service);
		this.cache = {
			inviteCodes: new InviteCodeSettingsCache(this),
			invites: new InvitesCache(this),
			vanity: new VanityUrlCache(this),
			leaderboard: new LeaderboardCache(this),
			ranks: new RanksCache(this),
			members: new MemberSettingsCache(this),
			permissions: new PermissionsCache(this),
			punishments: new PunishmentCache(this),
			guilds: new GuildSettingsCache(this),
			strikes: new StrikesCache(this),
			reactionRoles: new ReactionRoleCache(this)
		};

		// Setup service shortcuts
		this.db = this.service.database;
		this.rabbitmq = this.service.rabbitmq;
		this.msg = this.service.message;
		this.mod = this.service.moderation;
		this.scheduler = this.service.scheduler;
		this.cmds = this.service.commands;
		this.captcha = this.service.captcha;
		this.invs = this.service.invites;
		this.tracking = this.service.tracking;
		this.management = this.service.management;

		this.on('ready', this.onClientReady);
		this.on('guildCreate', this.onGuildCreate);
		this.on('guildDelete', this.onGuildDelete);
		this.on('guildUnavailable', this.onGuildUnavailable);
		this.on('guildMemberAdd', this.onGuildMemberAdd);
		this.on('guildMemberRemove', this.onGuildMemberRemove);
		this.on('connect', this.onConnect);
		this.on('shardDisconnect', this.onDisconnect);
		this.on('warn', this.onWarn);
		this.on('error', this.onError);
		this.on('rawWS', this.onRawWS);
	}

	public async init() {
		// Services
		await Promise.all(Object.values(this.service).map((s) => s.init()));
	}

	public async waitForStartupTicket() {
		const start = process.uptime();
		const interval = setInterval(
			() => console.log(`Waiting for ticket since ${chalk.blue(Math.floor(process.uptime() - start))} seconds...`),
			10000
		);

		await this.service.socket.waitForStartupTicket();

		//await this.service.rabbitmq.waitForStartupTicket();
		clearInterval(interval);
	}

	private async onClientReady(): Promise<void> {
		if (this.hasStarted) {
			console.error('BOT HAS ALREADY STARTED, IGNORING EXTRA READY EVENT');
			return;
		}

		// This is for convenience, the services could also subscribe to 'ready' event on client
		await Promise.all(Object.values(this.service).map((s) => s.onClientReady()));

		this.hasStarted = true;
		this.startedAt = moment();

		const set = await this.db.getBotSettings(this.user.id);
		this.settings = set ? set.value : { ...botDefaultSettings };

		console.log(chalk.green(`Client ready! Serving ${chalk.blue(this.guilds.size)} guilds.`));

		// Init all caches
		await Promise.all(Object.values(this.cache).map((c) => c.init()));

		const bannedGuilds = await this.db.getBannedGuilds(this.guilds.map((g) => g.id));

		// Insert guilds into db
		await this.db.saveGuilds(
			this.guilds.map((g) => ({
				id: g.id,
				name: g.name,
				icon: g.iconURL,
				memberCount: g.memberCount,
				deletedAt: null
			}))
		);

		// Do some checks for all guilds
		this.guilds.forEach(async (guild) => {
			const bannedGuild = bannedGuilds.find((g) => g.id === guild.id);

			// Check if the guild was banned
			if (bannedGuild) {
				const dmChannel = await this.getDMChannel(guild.ownerID);
				await dmChannel
					.createMessage(
						`Hi! Thanks for inviting me to your server \`${guild.name}\`!\n\n` +
							'It looks like this guild was banned from using the Invitelogger classic bot.\n' +
							'If you believe this was a mistake please contact staff on our support server.\n\n' +
							`${this.config.bot.links.support}\n\n` +
							'I will be leaving your server now, thanks for having me!\n' +
							`Reason: \`${bannedGuild.banReason}\``
					)
					.catch(() => undefined);
				await guild.leave();
				return;
			}
		});

		await this.setActivity();
		this.activityInterval = setInterval(() => this.setActivity(), 1 * 60 * 1000);
	}

	public serviceStartupDone(service: IMService) {
		this.startingServices = this.startingServices.filter((s) => s !== service);
		if (this.startingServices.length === 0) {
			console.log(chalk.green(`All services ready`));
			this.rabbitmq.endStartup().catch((err) => console.error(err));
		}
	}

	private async onGuildCreate(guild: Guild): Promise<void> {
		const channel = await this.getDMChannel(guild.ownerID);
		const dbGuild = await this.db.getGuild(guild.id);

		if (!dbGuild) {
			await this.db.saveGuilds([
				{
					id: guild.id,
					name: guild.name,
					icon: guild.iconURL,
					memberCount: guild.memberCount,
					createdAt: new Date(guild.createdAt),
					deletedAt: null,
					banReason: null
				}
			]);

			const defChannel = await this.getDefaultChannel(guild);
			const newSettings = {
				...guildDefaultSettings,
				[GuildSettingsKey.joinMessageChannel]: defChannel ? defChannel.id : null
			};

			await this.db.saveGuildSettings({
				guildId: guild.id,
				value: newSettings
			});
		} else if (dbGuild.banReason !== null) {
			await channel
				.createMessage(
					`Hi! Thanks for inviting me to your server \`${guild.name}\`!\n\n` +
						'It looks like this guild was banned from using the Invitelogger classic bot.\n' +
						'If you believe this was a mistake please contact staff on our support server.\n\n' +
						`${this.config.bot.links.support}\n\n` +
						'I will be leaving your server now, thanks for having me!\n' +
						`Reason: \`${dbGuild.banReason}\``
				)
				.catch(() => undefined);
			await guild.leave();
			return;
		}

		// Clear the deleted timestamp if it's still set
		// We have to do this before checking premium or it will fail
		if (dbGuild && dbGuild.deletedAt) {
			dbGuild.deletedAt = null;
			await this.db.saveGuilds([dbGuild]);
		}

		// Insert tracking data
		await this.tracking.insertGuildData(guild);

		// Send welcome message to owner with setup instructions
		channel
			.createMessage(
				'Hi! Thanks for inviting me to your server `' +
					guild.name +
					'`!\n\n' +
					'I am now tracking all invites on your server.\n\n' +
					'To get help setting up join messages or changing the prefix, please run the `!setup` command.\n\n' +
					'You can see a list of all commands using the `!help` command.\n\n' +
					`That's it! Enjoy the bot and if you have any questions feel free to join our support server!\n` +
					'https://discord.gg/CxE6gyT'
			)
			.catch(() => undefined);
	}

	private async onGuildDelete(guild: Guild): Promise<void> {
		// If we're disabled it means the pro bot is in that guild,
		// so don't delete the guild
		if (this.disabledGuilds.has(guild.id)) {
			return;
		}

		// If this is the pro bot and the guild has the regular bot do nothing
		if (this.type === BotType.pro && guild.members.has(this.config.bot.ids.regular)) {
			return;
		}

		// Remove the guild (only sets the 'deletedAt' timestamp)
		await this.db.saveGuilds([
			{
				id: guild.id,
				name: guild.name,
				icon: guild.iconURL,
				memberCount: guild.memberCount,
				deletedAt: new Date()
			}
		]);
	}

	private async onGuildMemberAdd(guild: Guild, member: Member) {
		const guildId = guild.id;

		// Ignore disabled guilds
		if (this.disabledGuilds.has(guildId)) {
			return;
		}

		if (member.user.bot) {
			// Check if it's our pro bot
			if (this.type === BotType.regular && member.user.id === this.config.bot.ids.pro) {
				console.log(`DISABLING BOT FOR ${guildId} BECAUSE PRO VERSION IS ACTIVE`);
				this.disabledGuilds.add(guildId);
			}
			return;
		}
	}

	private async onGuildMemberRemove(guild: Guild, member: Member) {
		// If the pro version of our bot left, re-enable this version
		if (this.type === BotType.regular && member.user.id === this.config.bot.ids.pro) {
			this.disabledGuilds.delete(guild.id);
			console.log(`ENABLING BOT IN ${guild.id} BECAUSE PRO VERSION LEFT`);
		}
	}

	private async getDefaultChannel(guild: Guild) {
		// get "original" default channel
		if (guild.channels.has(guild.id)) {
			return guild.channels.get(guild.id);
		}

		// Check for a "general" channel, which is often default chat
		const gen = guild.channels.find((c) => c.name === 'general');
		if (gen) {
			return gen;
		}

		// First channel in order where the bot can speak
		return guild.channels
			.filter((c) => c.type === ChannelType.GUILD_TEXT /*&&
					c.permissionsOf(guild.self).has('SEND_MESSAGES')*/)
			.sort((a, b) => a.position - b.position || a.id.localeCompare(b.id))[0];
	}

	public async logModAction(guild: Guild, embed: Embed) {
		const modLogChannelId = (await this.cache.guilds.get(guild.id)).modLogChannel;

		if (modLogChannelId) {
			const logChannel = guild.channels.get(modLogChannelId) as TextChannel;
			if (logChannel) {
				await this.msg.sendEmbed(logChannel, embed);
			}
		}
	}

	public async logAction(guild: Guild, message: Message, action: LogAction, data: any) {
		const logChannelId = (await this.cache.guilds.get(guild.id)).logChannel;

		if (logChannelId) {
			const logChannel = guild.channels.get(logChannelId) as TextChannel;
			if (logChannel) {
				const content = message.content.substr(0, 1000) + (message.content.length > 1000 ? '...' : '');

				let json = JSON.stringify(data, null, 2);
				if (json.length > 1000) {
					json = json.substr(0, 1000) + '...';
				}

				const embed = this.msg.createEmbed({
					title: 'Log Action',
					fields: [
						{
							name: 'Action',
							value: action,
							inline: true
						},
						{
							name: 'Cause',
							value: `<@${message.author.id}>`,
							inline: true
						},
						{
							name: 'Command',
							value: content
						},
						{
							name: 'Data',
							value: '`' + json + '`'
						}
					]
				});
				await this.msg.sendEmbed(logChannel, embed);
			}
		}

		this.db.saveLog(guild, message.author, {
			id: null,
			guildId: guild.id,
			memberId: message.author.id,
			action,
			message: message.content,
			data,
			createdAt: new Date(),
			updatedAt: new Date()
		});
	}

	public async setActivity() {
		const status: Eris.Status = this.config.bot.activity.status;

		const type: Eris.BotActivityType =
			this.config.bot.activity.type === 'playing'
				? 0
				: this.config.bot.activity.type === 'streaming'
				? 1
				: this.config.bot.activity.type === 'listening'
				? 2
				: this.config.bot.activity.type === 'watching'
				? 3
				: 0;

		const name: string = this.config.bot.activity.message + ` | s${this.shardId}`;
		const url: string = this.config.bot.activity.url;

		this.editStatus(status, { name, type, url });
	}

	private async onConnect() {
		console.error('DISCORD CONNECT');
		this.gatewayConnected = true;
		await this.rabbitmq.sendStatusToManager();
	}

	private async onDisconnect(err: Error) {
		console.error('DISCORD DISCONNECT');
		this.gatewayConnected = false;
		await this.rabbitmq.sendStatusToManager(err);

		if (err) {
			console.error(err);
		}
	}

	private async onGuildUnavailable(guild: Guild) {
		console.error('DISCORD GUILD_UNAVAILABLE:', guild.id);
	}

	private async onWarn(warn: string) {
		console.error('DISCORD WARNING:', warn);
		this.stats.wsWarnings++;
	}

	private async onError(error: Error) {
		console.error('DISCORD ERROR:', error);
		this.stats.wsErrors++;
	}

	private async onRawWS() {
		this.stats.wsEvents++;
	}
}
