# InviteManager Discord Bot

## Description

This is the code repository for the invitelogger classic Discord Bot. 
This fork is made to maintain the code of inviteManager and keep the incredible work of its devs alive. I'm not a perfect developer, I'm currently learning so don't hesitate to PR/contact me for code advices and improvements.

## Docs

[Click here to view the documentation](https://docs.invitemanager.co)

## Self hosting quick setup

### Requirements

- NodeJS (tested using v12)
- Database (tested using `MySQL` 5.7+, ⚠`MariaDB` 10.2+ shouldn't work )

### Setup

1. `npm install`
1. Setup databases
   1. Use the `scripts/db/setup_db0.sql` script to set up the global database `im_0`
   1. Use the `scripts/db/setup_dbx.sql` script to set up the data databases `im_1`, `im_2`, ... (you need at least one)
1. Copy the `config.example.json` to `config.json` and fill in required data
1. `npm run build`
1. `npm start`


### ⚠ Disclaimer

This repo is for invitelogger classic and may not run for selfhosters (for exemple you can't selfhost my manager).
Please use the last releases and not download master branch to avoid dev breach and others bugs.
Please do not remove developers and translators name in `credits` command.
