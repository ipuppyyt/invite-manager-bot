import { getRepository, Repository } from 'typeorm';

import { IMClient } from '../client';
import { Context } from '../commands/Command';
import { Member } from '../models/Member';

import { Resolver } from './Resolver';

const idRegex = /^(?:<@!?)?(\d+)>?$/;

export interface BasicUser {
	id: string;
	createdAt: number;
	username: string;
	discriminator: string;
}

export class UserResolver extends Resolver {
	private membersRepo: Repository<Member>;

	public constructor(client: IMClient) {
		super(client);

		this.membersRepo = getRepository(Member);
	}

	public async resolve(
		value: string,
		{ guild, t }: Context
	): Promise<BasicUser> {
		if (!value) {
			return;
		}

		let user: BasicUser;
		// Check if we're resolving by id or name & discriminator
		if (idRegex.test(value)) {
			const id = value.match(idRegex)[1];
			// First try our local cache
			user = this.client.users.get(id);
			// Then try the rest API
			if (!user) {
				user = await this.client.getRESTUser(id).then(() => undefined);
			}
			// Then try our database
			if (!user) {
				user = await this.membersRepo.findOne({ where: { id } }).then(u => ({
					...u,
					username: u.name,
					createdAt: (u.createdAt as Date).getTime()
				}));
			}
			if (!user) {
				throw Error(t('arguments.user.notFound'));
			}
		} else {
			const fullName = value.toLowerCase();
			const [username, discriminator] = fullName.split('#');

			// First try to find an exact match in our cache
			let users: BasicUser[] = this.client.users.filter(
				u =>
					u.username.toLowerCase() === username &&
					u.discriminator === discriminator
			);

			// Then try to find an approximate match in our guild
			if (guild && users.length === 0) {
				users = guild.members
					.filter(m => {
						const mName = m.username.toLowerCase() + '#' + m.discriminator;
						return mName.includes(fullName) || fullName.includes(mName);
					})
					.map(m => m.user);
			}

			// Next allow for partial match in our cache
			if (users.length === 0) {
				users = this.client.users.filter(u => {
					const uName = u.username.toLowerCase() + '#' + u.discriminator;
					return uName.includes(fullName) || fullName.includes(uName);
				});
			}

			// Try to find exact match in DB
			if (users.length === 0) {
				users = await this.membersRepo
					.find({
						where: { name: username, ...(discriminator && { discriminator }) }
					})
					.then(us =>
						us.map(u => ({
							...u,
							username: u.name,
							createdAt: (u.createdAt as Date).getTime()
						}))
					);
			}

			// Try to find partial match in DB
			if (users.length === 0) {
				users = await this.membersRepo
					.find({
						where: {
							name: `%${username}%`,
							...(discriminator && { discriminator: `%${discriminator}%` })
						}
					})
					.then(us =>
						us.map(u => ({
							...u,
							username: u.name,
							createdAt: (u.createdAt as Date).getTime()
						}))
					);
			}

			if (users.length === 1) {
				user = users[0];
			} else if (users.length === 0) {
				throw Error(t('arguments.user.notFound'));
			} else {
				throw Error(
					t('arguments.user.multiple', {
						users: users
							.slice(0, 10)
							.map(u => `\`${u.username}#${u.discriminator}\``)
							.join(', ')
					})
				);
			}
		}

		return user;
	}
}
