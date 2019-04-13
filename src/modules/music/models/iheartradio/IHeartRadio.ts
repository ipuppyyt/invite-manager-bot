import { IMClient } from '../../../../client';
import { MusicPlatformTypes } from '../../../../types';
import { MusicPlatform } from '../MusicPlatform';

import { IHeartMusicItem } from './IHeartMusicItem';

const iheart = require('iheart');

export class IHeartRadio extends MusicPlatform {
	public supportsRewind: boolean = false;
	public supportsSeek: boolean = false;
	public supportsLyrics: boolean = false;
	public supportsSearch: boolean = true;

	public constructor(client: IMClient) {
		super(client);
	}

	public isPlatformUrl(url: string): boolean {
		return url.startsWith('iheart');
	}

	public getPlatform(): MusicPlatformTypes {
		return MusicPlatformTypes.iHeartRADIO;
	}

	public getByLink(link: string): Promise<IHeartMusicItem> {
		throw new Error('Method not implemented.');
	}

	public async search(
		searchTerm: string,
		maxResults: number = 10
	): Promise<IHeartMusicItem[]> {
		const matches = await iheart.search(searchTerm);

		return matches.stations.map(
			(station: any) =>
				new IHeartMusicItem(this, {
					id: null,
					title: station.name,
					imageUrl: station.newlogo,
					link: '',
					station: station
				})
		);
	}
}