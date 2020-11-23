import { io, Socket } from 'socket.io-client';

import { IMService } from './Service';

export class SocketioService extends IMService {
	private socket: Socket;
	private waitingForTicket: boolean;
	public connected: boolean;

	public async init() {
		this.connected = false;
		this.waitingForTicket = true;
		if (this.client.flags.includes('--no-socket')) {
			return;
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
				resolve();
			});
			this.socket.on('disconnect', function (data: any) {
				this.connected = false;
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

			// laod will be blocked if no socket connection
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
			if (this.connected) {
				console.log('TICKET ASKED');
				await this.askTicket();

				resolve();
			} else {
				console.log('NO SOCKET TO ASK TICKET');

				setTimeout(() => {
					this.waitForStartupTicket();
				}, 10000);
			}
		});
	}
	public async finishLoad() {
		this.socket.emit('ticketFinishLoad');
	}

	private async askTicket() {
		return new Promise(async (resolve, reject) => {
			this.socket.emit('requestStartTicket');

			this.socket.on('sendTicket', (ticket: any) => {
				console.log('TICKET RECIEVED');
				this.waitingForTicket = false;
				resolve();
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
