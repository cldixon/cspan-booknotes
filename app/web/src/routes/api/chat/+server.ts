import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, fetch, cookies }) => {
	const apiUrl = env.API_URL || 'http://localhost:3000';
	const body = await request.json();

	// Get or create a session token for tracking
	let sessionToken = cookies.get('session_token');
	if (!sessionToken) {
		sessionToken = crypto.randomUUID();
		cookies.set('session_token', sessionToken, {
			path: '/',
			maxAge: 60 * 60 * 24 * 365, // 1 year
			httpOnly: true,
			sameSite: 'lax'
		});
	}

	try {
		const res = await fetch(`${apiUrl}/api/chat/resume`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				...body,
				sessionToken
			})
		});

		if (!res.ok) {
			return new Response(JSON.stringify({ error: 'Failed to resume conversation' }), {
				status: res.status,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// Pass through the SSE stream
		return new Response(res.body, {
			headers: {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache',
				Connection: 'keep-alive'
			}
		});
	} catch (e) {
		console.error('Error proxying chat request:', e);
		return new Response(JSON.stringify({ error: 'Failed to connect to API' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};
