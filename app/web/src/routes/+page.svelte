<script lang="ts">
	let { data } = $props();

	function formatDate(dateStr: string | null): string {
		if (!dateStr) return 'Unknown date';
		return new Date(dateStr).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}

	function truncate(text: string | null, length: number): string {
		if (!text) return '';
		if (text.length <= length) return text;
		return text.slice(0, length) + '...';
	}
</script>

<div class="container">
	<header>
		<h1>CSPAN Booknotes</h1>
		<p>Resume conversations with Brian Lamb and his guests</p>
	</header>

	<main>
		{#if data.error}
			<div class="error-box">
				<p class="error">Error: {data.error}</p>
			</div>
		{:else}
			<!-- Database Stats -->
			<div class="stats">
				<p>Connected to database: <strong>{data.total} episodes</strong> available</p>
			</div>

			<!-- Random Episode Highlight -->
			{#if data.randomEpisode}
				<section class="random-episode">
					<h2>Random Episode</h2>
					<div class="episode-card featured">
						<h3>{data.randomEpisode.guest}</h3>
						<p class="book-title">{data.randomEpisode.title}</p>
						<p class="air-date">{formatDate(data.randomEpisode.air_date)}</p>
						<p class="summary">{truncate(data.randomEpisode.summary, 200)}</p>
						<p class="episode-id">ID: {data.randomEpisode.id}</p>
					</div>
				</section>
			{/if}

			<!-- Recent Episodes -->
			<section class="recent-episodes">
				<h2>Recent Episodes</h2>
				<div class="episodes-grid">
					{#each data.episodes as episode}
						<div class="episode-card">
							<h3>{episode.guest}</h3>
							<p class="book-title">{episode.title}</p>
							<p class="air-date">{formatDate(episode.air_date)}</p>
						</div>
					{/each}
				</div>
			</section>
		{/if}
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
		margin-bottom: 1rem;
	}

	h3 {
		margin: 0 0 0.5rem 0;
		color: #1a1a1a;
	}

	.error-box {
		background: #fee;
		border: 2px solid #d00;
		padding: 1.5rem;
		margin-bottom: 2rem;
		border-radius: 4px;
	}

	.error {
		color: #d00;
		font-weight: bold;
		margin: 0;
	}

	.stats {
		background: #e8f5e9;
		border: 2px solid #2e7d32;
		padding: 1rem 1.5rem;
		margin-bottom: 2rem;
		border-radius: 4px;
	}

	.stats p {
		margin: 0;
		color: #1b5e20;
	}

	.random-episode {
		margin-bottom: 2rem;
	}

	.episode-card {
		background: #f5f5f5;
		border: 2px solid #333;
		padding: 1rem 1.5rem;
		border-radius: 4px;
	}

	.episode-card.featured {
		background: #fff8e1;
		border-color: #f57c00;
	}

	.book-title {
		font-style: italic;
		color: #555;
		margin: 0.25rem 0;
	}

	.air-date {
		font-size: 0.875rem;
		color: #666;
		margin: 0.25rem 0;
	}

	.summary {
		margin: 0.75rem 0;
		line-height: 1.5;
		color: #333;
	}

	.episode-id {
		font-family: monospace;
		font-size: 0.75rem;
		color: #888;
		margin: 0.5rem 0 0 0;
	}

	.recent-episodes {
		margin-bottom: 2rem;
	}

	.episodes-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 1rem;
	}
</style>
