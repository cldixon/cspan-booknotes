import { env } from '$env/dynamic/private';

interface Episode {
	id: string;
	title: string;
	guest: string;
	air_date: string | null;
	summary: string | null;
	book_title: string | null;
}

interface EpisodesResponse {
	episodes: Episode[];
	total: number;
	limit: number;
	offset: number;
	hasMore: boolean;
}

export async function load({ fetch }) {
	const apiUrl = env.API_URL || 'http://localhost:3000';

	try {
		// Fetch recent episodes
		const episodesRes = await fetch(`${apiUrl}/api/episodes?limit=10`);
		if (!episodesRes.ok) {
			throw new Error(`Failed to fetch episodes: ${episodesRes.status}`);
		}
		const episodesData: EpisodesResponse = await episodesRes.json();

		// Fetch a random episode
		const randomRes = await fetch(`${apiUrl}/api/episodes/random`);
		if (!randomRes.ok) {
			throw new Error(`Failed to fetch random episode: ${randomRes.status}`);
		}
		const randomEpisode: Episode = await randomRes.json();

		return {
			episodes: episodesData.episodes,
			total: episodesData.total,
			randomEpisode,
			error: ''
		};
	} catch (e) {
		return {
			episodes: [],
			total: 0,
			randomEpisode: null,
			error: e instanceof Error ? e.message : 'Unknown error'
		};
	}
}
