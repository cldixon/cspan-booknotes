<script lang="ts">
	import { onMount } from 'svelte';

	let apiMessage = 'Loading...';
	let apiTimestamp = '';
	let error = '';

	const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

	onMount(async () => {
		try {
			const response = await fetch(`${API_URL}/api/hello`);
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			const data = await response.json();
			apiMessage = data.message;
			apiTimestamp = data.timestamp;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Unknown error';
			apiMessage = 'Failed to connect to API';
		}
	});
</script>

<div class="container">
	<header>
		<h1>CSPAN Booknotes</h1>
		<p>Resume conversations with Brian Lamb and his guests</p>
	</header>

	<main>
		<div class="api-test">
			<h2>API Connection Test</h2>
			{#if error}
				<p class="error">Error: {error}</p>
			{:else}
				<p class="success">{apiMessage}</p>
				{#if apiTimestamp}
					<p class="timestamp">Server Time: {new Date(apiTimestamp).toLocaleString()}</p>
				{/if}
			{/if}
		</div>

		<div class="info">
			<p>Welcome to the CSPAN Booknotes interactive chat experience.</p>
			<p>This is a minimal skeleton deployment. More features coming soon!</p>
		</div>
	</main>
</div>

<style>
	.container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
		font-family: system-ui, -apple-system, sans-serif;
	}

	header {
		text-align: center;
		margin-bottom: 2rem;
		border-bottom: 2px solid #000;
		padding-bottom: 1rem;
	}

	h1 {
		font-family: monospace;
		color: #1a1a1a;
		font-size: 2.5rem;
		margin: 0;
	}

	h2 {
		font-family: monospace;
		color: #333;
		font-size: 1.5rem;
	}

	.api-test {
		background: #f5f5f5;
		border: 2px solid #333;
		padding: 1.5rem;
		margin-bottom: 2rem;
		border-radius: 4px;
	}

	.success {
		color: #0a6900;
		font-weight: bold;
		font-size: 1.2rem;
	}

	.error {
		color: #d00;
		font-weight: bold;
	}

	.timestamp {
		color: #666;
		font-size: 0.9rem;
		margin-top: 0.5rem;
	}

	.info {
		color: #333;
		line-height: 1.6;
	}
</style>
