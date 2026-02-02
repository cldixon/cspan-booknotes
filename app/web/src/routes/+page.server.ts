import { env } from '$env/dynamic/private';

interface TranscriptTurn {
	speaker: string;
	text: string;
}

interface RelatedEpisode {
	id: string;
	title: string;
	guest: string;
}

interface Episode {
	id: string;
	title: string;
	guest: string;
	air_date: string | null;
	summary: string | null;
	book_title: string | null;
	book_isbn: string | null;
	url: string | null;
	transcript: TranscriptTurn[];
	related_episodes: RelatedEpisode[];
}

interface EpisodeListItem {
	id: string;
	title: string;
	guest: string;
	air_date: string | null;
	summary: string | null;
	book_title: string | null;
}

interface EpisodesResponse {
	episodes: EpisodeListItem[];
	total: number;
	limit: number;
	offset: number;
	hasMore: boolean;
}

export async function load({ fetch }) {
	const apiUrl = env.API_URL || 'http://localhost:3000';

	try {
		// Fetch all episodes for the guest drawer, sorted by guest last name
		const episodesRes = await fetch(`${apiUrl}/api/episodes?sort=guest_last_name`);
		if (!episodesRes.ok) {
			throw new Error(`Failed to fetch episodes: ${episodesRes.status}`);
		}
		const episodesData: EpisodesResponse = await episodesRes.json();

		// Default to Christopher Hitchens episode
		const defaultEpisodeId = '51559-1';

		// Fetch full episode details including transcript
		const episodeRes = await fetch(`${apiUrl}/api/episodes/${defaultEpisodeId}`);
		if (!episodeRes.ok) {
			throw new Error(`Failed to fetch episode details: ${episodeRes.status}`);
		}
		const currentEpisode: Episode = await episodeRes.json();

		return {
			currentEpisode,
			episodes: episodesData.episodes,
			total: episodesData.total,
			error: ''
		};
	} catch (e) {
		return {
			currentEpisode: null,
			episodes: [],
			total: 0,
			error: e instanceof Error ? e.message : 'Unknown error'
		};
	}
}
