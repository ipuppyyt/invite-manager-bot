import { io, Socket } from 'socket.io-client';

import { IMService } from './Service';

export class SocketioService extends IMService {
	private socket: Socket;
	private waitingForTicket: boolean;
	public connected: boolean;
	private canceled: boolean = false;

	public async init() {
		console.log('Init Websocket');
		this.connected = false;
		this.waitingForTicket = true;
		if (this.client.flags.includes('--no-socket') || this.client.config.socketio.url == '') {
			this.canceled = true;
			return console.log('Websocket init canceled');
		}

		await this.initConnection();
	}

	private async initConnection() {
		return new Promise(async (resolve, reject) => {
			this.socket = io(this.client.config.socketio.url);

			this.socket.on('connect', (data: any) => {
				this.socket.emit('welcome', {
					id: this.client.shardId,
					type: 'classicShard',
					key: this.client.config.socketio.key
				});
			});
			this.socket.on('clientError', function (data: any) {
				console.error(data.msg);
			});
			this.socket.on('connected', (data: any) => {
				console.log('####################### Socket connected #######################');
				this.connected = true;
				resolve(true);
			});
			this.socket.on('disconnect', function (data: any) {
				this.connected = false;
			});

			this.socket.on('classicServerBan', async (data: { id: string; reason: string }) => {
				let dbGuild = await this.client.db.getGuild(data.id);

				this.client.cache.guilds;
				console.log(dbGuild);
				if (!dbGuild) return;

				dbGuild.banReason = data.reason;
				await this.client.db.saveGuild(dbGuild);

				let guild = this.client.guilds.get(data.id);
				const dmChannel = await this.client.getDMChannel(guild.ownerID);
				await dmChannel
					.createMessage(
						`Hi! Thanks for using me to your server \`${guild.name}\`!\n\n` +
							'It looks like this guild was banned from using the Invitelogger classic bot.\n' +
							'If you believe this was a mistake please contact staff on our support server.\n\n' +
							`${this.client.config.bot.links.support}\n\n` +
							'I will be leaving your server now, thanks for having me!\n' +
							`Reason: \`${dbGuild.banReason}\``
					)
					.catch(() => undefined);
				await guild.leave();
			});

			/*
			this.socket.on('yggdrasilLoad', (data: any) => {
				if (this.waitingForTicket) {
					this.socket.emit('requestStartTicket');
				}
			});*/

			setInterval(() => {
				this.sendStatusToManager();
			}, 5000);

			// load will be blocked if no socket connection
			setTimeout(() => {
				if (!this.connected) {
					console.log("UNABLE TO CONNECT TO MANAGER WEBSOCKET, PLEASE KEEP SOCKET URL EMPTY WHEN YOU HAVEN'T ANY");
				}
			}, 1000);
		});
	}

	public async sendStatusToManager(err?: Error) {
		this.socket.emit('postStats', {
			id: 'status',
			state: this.waitingForTicket ? 'waiting' : !this.client.hasStarted ? 'starting' : 'running',
			startedAt: this.client.startedAt?.toISOString(),
			gateway: this.client.gatewayConnected,
			guilds: this.client.guilds.size,
			error: err ? err.message : null,
			tracking: this.getTrackingStatus(),
			cache: this.getCacheSizes(),
			metrics: this.getMetrics()
		});
	}

	public async waitForStartupTicket() {
		return new Promise(async (resolve, reject) => {
			if (this.canceled) {
				console.log('SOCKET DISABLED, FORCE ALLOW TICKETS');
				resolve(false);
			} else {
				if (this.connected) {
					console.log('TICKET ASKED');
					await this.askTicket();

					resolve(false);
				} else {
					console.log('NO SOCKET TO ASK TICKET');

					setTimeout(() => {
						this.waitForStartupTicket();
					}, 10000);
				}
			}
		});
	}
	public async finishLoad() {
		if (!this.canceled) {
			this.socket.emit('ticketFinishLoad');
		}
	}

	private async askTicket() {
		return new Promise(async (resolve, reject) => {
			this.socket.emit('requestStartTicket');

			this.socket.on('sendTicket', (ticket: any) => {
				console.log('TICKET RECIEVED');
				this.waitingForTicket = false;
				resolve(true);
			});
		});
	}

	private getTrackingStatus() {
		return {
			pendingGuilds: this.client.tracking.pendingGuilds.size,
			initialPendingGuilds: this.client.tracking.initialPendingGuilds
		};
	}

	private getCacheSizes() {
		let channelCount = this.client.groupChannels.size + this.client.privateChannels.size;
		let roleCount = 0;

		this.client.guilds.forEach((g) => {
			channelCount += g.channels.size;
			roleCount += g.roles.size;
		});

		return {
			guilds: this.client.guilds.size,
			users: this.client.users.size,
			channels: channelCount,
			roles: roleCount,
			ranks: this.client.cache.ranks.getSize(),
			settings: this.client.cache.guilds.getSize(),
			premium: this.client.cache.premium.getSize(),
			permissions: this.client.cache.permissions.getSize(),
			strikes: this.client.cache.strikes.getSize(),
			punishments: this.client.cache.punishments.getSize(),
			inviteCodes: this.client.cache.inviteCodes.getSize(),
			members: this.client.cache.members.getSize(),
			messages: this.client.mod.getMessageCacheSize()
		};
	}
	private getMetrics() {
		const req = this.client.requestHandler;

		return {
			wsEvents: this.client.stats.wsEvents,
			wsWarnings: this.client.stats.wsWarnings,
			wsErrors: this.client.stats.wsErrors,
			cmdProcessed: this.client.stats.cmdProcessed,
			cmdErrors: this.client.stats.cmdErrors,
			httpRequests: [...req.requestStats.entries()].map(([url, stats]) => ({ url, stats })),
			httpRequestsQueued: Object.keys(req.ratelimits)
				.filter((endpoint) => req.ratelimits[endpoint]._queue.length > 0)
				.reduce((acc, endpoint) => acc.concat([{ endpoint, count: req.ratelimits[endpoint]._queue.length }]), [])
		};
	}
}
