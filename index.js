const Discord = require('discord.js');
const client = new Discord.Client();
const config = require('./config.json');
const { spawn } = require('child_process');
const colors = require('colors');

let debug = false;

// init shard object
let shardsMap = new Map();

for (var actualshard = 1; actualshard <= config.controller.shardCount; actualshard++) {
	shardsMap.set(actualshard, { status: 'down', id: actualshard, port: config.controller.firstDebugPort + actualshard });
}

let channel;

//if the launch isn't managed by the manager the controller will control the launch himself
if (!config.controller.socket) {
	let isAShardLoading = false;
	let startQueue = [];
	async function checkQueue() {
		startQueue.forEach(async (shard) => {
			if (isAShardLoading) return;

			console.log('need to start the shard ' + shard);
			await shardStart(shard);

			startQueue.shift();
		});
	}
	setInterval(checkQueue, 10000);
} // if the launch is managed by the socket we can launch all shards at the same time
else {
	for (let [id, shard] of shardsMap) {
		shardStart(id);
	}
}

function shardStart(id) {
	return new Promise(async (resolve, reject) => {
		isAShardLoading = true;

		let shard = shardsMap.get(id);
		if (!shard) reject('Unknow shard');

		// change shard status
		shard.status = 'launching';
		shardsMap.set(id, shard);
		console.log('starting' + shard.id);

		const child = spawn('node', [
			`--inspect${debug ? '-brk' : ''}=${shard.port}`,
			'./bin/bot.js',
			'--no-rabbitmq',
			config.devToken,
			shard.id,
			config.controller.shardCount
		]);

		child.on('error', (error) => console.log(error));

		child.stdout.on('data', function (data) {
			console.log(('[SHARD'.black + id.toString().red + ']'.black).bgCyan + '  ' + data.toString());

			if (!config.controller.socket) {
				if (data.includes('Loaded all pending guilds!')) {
					shard = shardsMap.get(id);
					shard.status = 'ok';
					shardsMap.set(id, shard);

					channel.send('Shard ' + id + ' fully started');

					isAShardLoading = false;
					resolve();
				}
				if (data.includes('guilds in parallel during startup')) {
					shard = shardsMap.get(id);
					shard.status = 'loading';

					channel.send('Shard ' + id + ' started, begin loading');

					shardsMap.set(id, shard);
				}
			} else {
				if (data.includes('Loaded all pending guilds!')) {
					shard = shardsMap.get(id);
					shard.status = 'ok';
					shardsMap.set(id, shard);

					channel.send('Shard ' + id + ' fully started');
				}
				if (data.includes('guilds in parallel during startup')) {
					shard = shardsMap.get(id);
					shard.status = 'loading';

					channel.send('Shard ' + id + ' started, begin loading');

					shardsMap.set(id, shard);
				}
				resolve();
			}
		});

		child.on('close', (data) => {
			if (config.controller.autoRestart) {
				if (config.controller.socket) {
					shard.status = 'crashed';
					shardStart(id);
					channel.send('Shard ' + id + ' crashed');
				} else {
					shard.status = 'crashed';
					startQueue.push(shard.id);
					channel.send('Shard ' + id + ' crashed');
				}
			}
		});

		shard.child = child;
		shardsMap.set(id, shard);
	});
}

client.on('ready', () => {
	console.log(`Logged in as ${client.user.tag}!`);
	channel = client.channels.cache.get(config.controller.incidentChannel);
});

client.on('message', (message) => {
	if (message.content.toLowerCase() === '.startall') {
		if (!config.controller.owners.includes(message.author.id)) {
			message.reply("You're not allowed to do that");
			return;
		}

		let count = 0;
		for (let [id, shard] of shardsMap) {
			console.log(shard);
			if (shard.status == 'down') {
				// send this shard to the queue
				startQueue.push(shard.id);

				shard.status = 'queued';
				shardsMap.set(shard.id, shard);

				count++;
			}
		}
		message.channel.send('All downed shards has been queued to starting');
	}

	if (message.content.startsWith('.kill ')) {
		if (!config.controller.owners.includes(message.author.id)) {
			message.reply("You're not allowed to do that");
			return;
		}

		let shardId = message.content.toLowerCase().slice(6);

		let shard = shardsMap.get(parseInt(shardId));

		if (!shard) return message.channel.send('Unknow shard');

		if (!shard.child) return message.channel.send('Shard not started');

		shard.child.kill();
		shard.child = undefined;
		shard.status = 'down';

		shardsMap.set(shard.id, shard);
		message.channel.send('The given shard has been killed');
	}

	if (message.content.startsWith('.start ')) {
		if (!config.controller.owners.includes(message.author.id)) {
			message.reply("You're not allowed to do that");
			return;
		}

		let shardId = message.content.toLowerCase().slice(7);

		let shard = shardsMap.get(parseInt(shardId));

		if (!shard) return message.channel.send('Unknow shard');

		if (shard.child) return message.channel.send('Shard already started');

		// send this shard to the queue
		startQueue.push(shard.id);

		shard.status = 'queued';
		shardsMap.set(shard.id, shard);

		message.channel.send('The given shard has been queued');
	}

	if (message.content.startsWith('.help')) {
		if (!config.controller.owners.includes(message.author.id)) {
			message.reply("You're not allowed to do that");
			return;
		}

		let embed = new Discord.MessageEmbed();
		embed.setDescription(
			"Commands:\n .botstatus --> show bot's shards status\n.startAll --> start all downed shard\n.start <shardid> --> start a specific shard\n.stop <shardid> --> stop a specific shard"
		);
		embed.setFooter('We control the world');
		embed.setTimestamp();
		embed.setColor('#5400db');

		message.channel.send(embed);
	}

	if (message.content.toLowerCase() === '.botstatus') {
		let builder = '';

		for (let [id, shard] of shardsMap) {
			builder = builder + `**Shard: ${shard.id}** --> \`${shard.status}\`` + '\n';
		}

		let embed = new Discord.MessageEmbed();
		embed.setDescription(builder);
		embed.setFooter('We control the world');
		embed.setTimestamp();
		embed.setColor('#5400db');

		message.channel.send(embed);
	}
});

client.login(config.controller.botToken);
