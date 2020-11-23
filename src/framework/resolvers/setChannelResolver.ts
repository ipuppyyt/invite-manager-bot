import { IMClient } from '../../client';
import { setChannelSettingsTypes } from '../../settings';
import { Context } from '../commands/Command';

import { ChannelResolver, Resolver, StringResolver } from '.';

export class setChannelResolver extends Resolver {
	private resolvers: { [key in setChannelSettingsTypes]: Resolver };

	public constructor(client: IMClient) {
		super(client);

		this.resolvers = {
			Channel: new ChannelResolver(client),
			String: new StringResolver(client)
		};
	}

	public resolve(value: any, context: Context, [key]: [string]): Promise<any> {
		if (typeof value === typeof undefined || value.length === 0) {
			return undefined;
		}
		if (value === 'none' || value === 'empty' || value === 'null') {
			return null;
		}
		if (value === 'default') {
			return null;
		}

		const resolver = this.resolvers['Channel'];
		return resolver.resolve(value, context, [key]);
	}
}
