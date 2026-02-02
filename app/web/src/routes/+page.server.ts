import { env } from '$env/dynamic/private';

export function load() {
	return {
		apiUrl: env.API_URL || 'http://localhost:3000'
	};
}
