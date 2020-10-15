const { spawn } = require('child_process');

const config = require('../config.json');
const { Webhook } = require('discord-webhook-node');
const hook = new Webhook(
	'https://discordapp.com/api/webhooks/743059954809700395/2FX9m-lsdquI9-ddMDVWFf-u5xwMmDbfdaWNPFgOyJWt1BHKRFSCMfC9eQEHzcDg5DFt'
);

let totalShards = 1;
let shards = {};

for (var actualshard = 0; actualshard < totalShards + 1; actualshard++) {
	let shard = actualshard;
	let debugport = 19400 + actualshard;
	console.log(actualshard + ' launching');
	hook.info('**Launching**', 'shard ' + shard + ' is launching', 'test');

	const debug = process.argv[2] || false;

	let child = spawn(
		'node',
		[
			`--inspect${debug ? '-brk' : ''}=${debugport}`,
			'./bin/bot.js',
			'--no-rabbitmq',
			config.devToken,
			shard,
			totalShards
		],
		{
			stdio: 'inherit'
		}
	);

	child.on('error', (error) => console.log(error));

	child.on('close', () => {
		console.log('Shard ' + actualshard + 'seems to have dropped');
		hook.error('**Error**', 'Shard ' + shard, 'seems to have dropped');

		if (debug) {
			console.log('STARTING AND WAITING FOR DEBUGGER');
		}

		child = spawn(
			'node',
			[
				`--inspect${debug ? '-brk' : ''}=${debugport}`,
				'./bin/bot.js',
				'--no-rabbitmq',
				config.devToken,
				shard,
				totalShards
			],
			{
				stdio: 'inherit'
			}
		);
	});
}
