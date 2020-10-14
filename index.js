const Discord = require('discord.js');
const client = new Discord.Client();
const config = require('./config.json');
const { spawn } = require('child_process');
const colors = require('colors');

let isAShardLoading = false;
let startQueue = [];
let debug = false;

// init shard object
let shardsMap = new Map();
for (var actualshard = 1; actualshard <= config.controller.shardCount; actualshard++) {
	shardsMap.set(actualshard, { status: 'down', id: actualshard, port: config.controller.firstDebugPort + actualshard });
}

let channel;

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
		});

		child.on('close', (data) => {
			if (data == null) {
				shard = shardsMap.get(id);
				shard.status = 'down';
				shardsMap.set(id, shard);

				channel.send('Shard ' + id + ' stopped');
			} else {
				shard = shardsMap.get(id);
				shard.status = 'crashed';
				shardsMap.set(id, shard);

				// add the crashed shard to the reboot list
				startQueue.push(shard.id);

				channel.send('Shard ' + id + ' crashed');
			}
		});

		shard.child = child;
		shardsMap.set(id, shard);
	});
}

async function checkQueue() {
	startQueue.forEach(async (shard) => {
		if (isAShardLoading) return;

		console.log('need to start the shard ' + shard);
		await shardStart(shard);

		startQueue.shift();
	});
}
setInterval(checkQueue, 10000);

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
