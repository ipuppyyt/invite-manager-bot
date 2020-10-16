const { spawn } = require('child_process');

const config = require('../config.json');

let debug = false;

let child = spawn(
	'node',
	[`--inspect${debug ? '-brk' : ''}=44444`, './bin/bot.js', '--no-rabbitmq', config.devToken, 1, 1],
	{
		stdio: 'inherit'
	}
);
