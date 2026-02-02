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
		// Fetch a random episode with full transcript for initial view
		const randomRes = await fetch(`${apiUrl}/api/episodes/random`);
		if (!randomRes.ok) {
			throw new Error(`Failed to fetch random episode: ${randomRes.status}`);
		}
		const randomEpisodeBasic: EpisodeListItem = await randomRes.json();

		// Fetch full episode details including transcript
		const episodeRes = await fetch(`${apiUrl}/api/episodes/${randomEpisodeBasic.id}`);
		if (!episodeRes.ok) {
			throw new Error(`Failed to fetch episode details: ${episodeRes.status}`);
		}
		const currentEpisode: Episode = await episodeRes.json();

		// Fetch episode list for the guest drawer
		const episodesRes = await fetch(`${apiUrl}/api/episodes?limit=50`);
		if (!episodesRes.ok) {
			throw new Error(`Failed to fetch episodes: ${episodesRes.status}`);
		}
		const episodesData: EpisodesResponse = await episodesRes.json();

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
