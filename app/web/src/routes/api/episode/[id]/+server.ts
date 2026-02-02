import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, fetch }) => {
	const apiUrl = env.API_URL || 'http://localhost:3000';

	try {
		const res = await fetch(`${apiUrl}/api/episodes/${params.id}`);
		if (!res.ok) {
			return json({ error: 'Episode not found' }, { status: 404 });
		}
		const episode = await res.json();
		return json(episode);
	} catch (e) {
		return json({ error: 'Failed to fetch episode' }, { status: 500 });
	}
};
