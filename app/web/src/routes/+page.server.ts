import { env } from '$env/dynamic/private';

export async function load({ fetch }) {
	const apiUrl = env.API_URL || 'http://localhost:3000';

	try {
		const response = await fetch(`${apiUrl}/api/hello`);
		if (!response.ok) {
			return {
				apiMessage: 'Failed to connect to API',
				apiTimestamp: '',
				error: `HTTP error! status: ${response.status}`
			};
		}
		const data = await response.json();
		return {
			apiMessage: data.message,
			apiTimestamp: data.timestamp,
			error: ''
		};
	} catch (e) {
		return {
			apiMessage: 'Failed to connect to API',
			apiTimestamp: '',
			error: e instanceof Error ? e.message : 'Unknown error'
		};
	}
}
