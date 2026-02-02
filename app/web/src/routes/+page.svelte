<script lang="ts">
	import { onMount } from 'svelte';

	let { data } = $props();

	let drawerOpen = $state(false);
	let searchQuery = $state('');
	let transcriptArea: HTMLElement;

	// Current episode state (can be changed via drawer)
	let currentEpisode = $state(data.currentEpisode);

	// Filter episodes based on search
	let filteredEpisodes = $derived(
		data.episodes.filter((ep) => {
			if (!searchQuery) return true;
			const query = searchQuery.toLowerCase();
			return (
				ep.guest.toLowerCase().includes(query) ||
				ep.title.toLowerCase().includes(query) ||
				(ep.book_title && ep.book_title.toLowerCase().includes(query))
			);
		})
	);

	function formatDate(dateStr: string | null): string {
		if (!dateStr) return '';
		return new Date(dateStr).toLocaleDateString('en-US', {
			month: 'short',
			year: 'numeric'
		});
	}

	function selectEpisode(episode: typeof data.episodes[0]) {
		// Fetch full episode data
		fetchEpisode(episode.id);
		drawerOpen = false;
	}

	async function fetchEpisode(id: string) {
		try {
			const res = await fetch(`/api/episode/${id}`);
			if (res.ok) {
				currentEpisode = await res.json();
				// Scroll to bottom after data loads
				setTimeout(scrollToBottom, 100);
			}
		} catch (e) {
			console.error('Failed to fetch episode:', e);
		}
	}

	function scrollToBottom() {
		if (transcriptArea) {
			transcriptArea.scrollTop = transcriptArea.scrollHeight;
		}
	}

	// Scroll to bottom on mount
	onMount(() => {
		scrollToBottom();
	});
</script>

<div class="app">
	<!-- Header -->
	<header class="header">
		<div>
			<div class="logo-text">BOOKNOTES</div>
			<div class="logo-subtext">with Brian Lamb</div>
		</div>
		<div class="cspan-badge">C-SPAN</div>
	</header>

	<main class="main-container">
		{#if data.error}
			<div class="error-box">
				<p>Error: {data.error}</p>
			</div>
		{:else if currentEpisode}
			<!-- Interview Container -->
			<section class="interview-container" class:drawer-open={drawerOpen}>
				<!-- Chyron Header -->
				<div class="chyron-header">
					<div class="participant-chyron host">
						<div class="chyron-row">
							<div class="chyron-photo">👤</div>
							<div class="chyron-text">
								<div class="chyron-name">Brian Lamb</div>
								<div class="chyron-title">Host, Booknotes</div>
							</div>
						</div>
					</div>

					<div class="header-center">
						<div class="live-badge">● LIVE</div>
					</div>

					<div class="participant-chyron guest">
						<div class="chyron-row">
							<div class="chyron-photo">👤</div>
							<div class="chyron-text">
								<div class="chyron-name">{currentEpisode.guest}</div>
								<div class="chyron-title">Author</div>
							</div>
						</div>
					</div>
				</div>

				<!-- Transcript Area -->
				<div class="transcript-area" bind:this={transcriptArea}>
					<div class="transcript-content">
						{#each currentEpisode.transcript as turn}
							<div class="transcript-entry">
								<div
									class="speaker-label"
									class:speaker-lamb={turn.speaker.toLowerCase().includes('lamb')}
									class:speaker-guest={!turn.speaker.toLowerCase().includes('lamb')}
								>
									<span class="speaker-dot"></span>
									{turn.speaker}
								</div>
								<div class="transcript-text">
									{turn.text}
								</div>
							</div>
						{/each}

						<!-- Typing indicator -->
						<div class="typing-indicator">
							<div class="typing-dots">
								<span></span>
								<span></span>
								<span></span>
							</div>
							Waiting to resume conversation...
						</div>
					</div>
				</div>

				<!-- Guest Drawer -->
				<div class="guest-drawer">
					<div class="drawer-header">
						<span class="drawer-title">Select a Guest</span>
						<button class="drawer-close" onclick={() => (drawerOpen = false)}>×</button>
					</div>
					<div class="drawer-search">
						<input
							type="text"
							class="search-input"
							placeholder="Search guests, books, topics..."
							bind:value={searchQuery}
						/>
					</div>
					<div class="guest-list">
						{#each filteredEpisodes as episode}
							<button
								class="guest-list-item"
								class:selected={currentEpisode && episode.id === currentEpisode.id}
								onclick={() => selectEpisode(episode)}
							>
								<div class="guest-list-photo">👤</div>
								<div class="guest-list-info">
									<div class="guest-list-name">{episode.guest}</div>
									<div class="guest-list-title">{episode.title}</div>
								</div>
								<div class="guest-list-date">{formatDate(episode.air_date)}</div>
							</button>
						{/each}
					</div>
				</div>

				<!-- Controls Area -->
				<div class="controls-area">
					<div class="input-label">Call In — Suggest a Topic</div>
					<div class="topic-input-row">
						<input type="text" class="topic-input" placeholder="e.g., television's effect on politics..." />
						<button class="submit-btn">Call In</button>
					</div>
					<div class="action-row">
						<button class="action-btn">▶ Continue</button>
						<button class="action-btn">↺ Restart</button>
						<button class="action-btn guest-btn" onclick={() => (drawerOpen = !drawerOpen)}>
							👤 Change Guest
						</button>
					</div>
				</div>
			</section>

			<div class="footer">
				Booknotes Archive — AI conversation inspired by C-SPAN's Booknotes (1989–2004)
			</div>
		{/if}
	</main>
</div>

<style>
	/* Reset and base */
	:global(body) {
		margin: 0;
		padding: 0;
		font-family: 'Trebuchet MS', 'Segoe UI', sans-serif;
		background: #1a1a2e;
		color: #f0f0f0;
		min-height: 100vh;
	}

	.app {
		min-height: 100vh;
	}

	/* C-SPAN classic color palette */
	:root {
		--cspan-blue-dark: #1a1a4e;
		--cspan-blue-mid: #2a3a7c;
		--cspan-blue-light: #4a6cb3;
		--cspan-gold: #c9a227;
		--cspan-tan: #d4c5a0;
		--cspan-red: #8b2332;
		--cspan-cream: #f5f0e1;
		--cspan-white: #ffffff;
	}

	/* Top header bar */
	.header {
		background: linear-gradient(180deg, #2a3a7c 0%, #1a1a4e 100%);
		border-bottom: 4px solid var(--cspan-gold);
		padding: 10px 15px;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.logo-text {
		font-family: Georgia, 'Times New Roman', serif;
		font-size: 20px;
		font-weight: bold;
		color: var(--cspan-white);
		letter-spacing: 2px;
		text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
	}

	.logo-subtext {
		font-size: 9px;
		color: var(--cspan-tan);
		letter-spacing: 1px;
		text-transform: uppercase;
	}

	.cspan-badge {
		background: var(--cspan-red);
		color: white;
		padding: 3px 10px;
		font-size: 10px;
		font-weight: bold;
		letter-spacing: 1px;
		border: 2px solid var(--cspan-gold);
	}

	/* Main container */
	.main-container {
		max-width: 700px;
		margin: 0 auto;
		padding: 12px;
	}

	.error-box {
		background: #fee;
		border: 2px solid #d00;
		padding: 1.5rem;
		color: #d00;
		font-weight: bold;
	}

	/* Interview container */
	.interview-container {
		background: #111;
		border: 3px solid var(--cspan-blue-mid);
		box-shadow: 3px 3px 0 rgba(0, 0, 0, 0.5);
	}

	/* Chyron header */
	.chyron-header {
		display: flex;
		background: linear-gradient(180deg, #1a1a2e 0%, #0d0d1a 100%);
		border-bottom: 3px solid var(--cspan-gold);
		position: relative;
	}

	.participant-chyron {
		flex: 1;
		padding: 10px 12px;
		border-top: 3px solid;
		border-image: linear-gradient(90deg, var(--cspan-red), var(--cspan-white), var(--cspan-blue-light)) 1;
	}

	.participant-chyron.host {
		border-right: 1px solid #333;
	}

	.participant-chyron.guest {
		text-align: right;
	}

	.chyron-row {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.participant-chyron.guest .chyron-row {
		flex-direction: row-reverse;
	}

	.chyron-photo {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		background: #333;
		border: 2px solid var(--cspan-blue-light);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 14px;
		color: #666;
		flex-shrink: 0;
	}

	.participant-chyron.guest .chyron-photo {
		border-color: var(--cspan-gold);
	}

	.chyron-text {
		min-width: 0;
	}

	.chyron-name {
		font-family: Georgia, serif;
		font-size: 14px;
		font-weight: bold;
		color: var(--cspan-cream);
	}

	.chyron-title {
		font-size: 9px;
		color: var(--cspan-tan);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.header-center {
		position: absolute;
		left: 50%;
		top: 50%;
		transform: translate(-50%, -50%);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
	}

	.live-badge {
		background: var(--cspan-red);
		color: white;
		padding: 2px 6px;
		font-size: 8px;
		font-weight: bold;
		animation: pulse 2s infinite;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.7;
		}
	}

	/* Transcript area */
	.transcript-area {
		background: var(--cspan-cream);
		min-height: 350px;
		max-height: 450px;
		overflow-y: auto;
	}

	.transcript-content {
		padding: 16px;
	}

	.transcript-entry {
		margin-bottom: 16px;
		padding-bottom: 16px;
		border-bottom: 1px dotted #ccc;
	}

	.transcript-entry:last-child {
		border-bottom: none;
		margin-bottom: 0;
	}

	.speaker-label {
		font-family: Georgia, serif;
		font-weight: bold;
		font-size: 11px;
		margin-bottom: 5px;
		display: flex;
		align-items: center;
		gap: 6px;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.speaker-lamb {
		color: var(--cspan-blue-mid);
	}

	.speaker-guest {
		color: var(--cspan-red);
	}

	.speaker-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.speaker-lamb .speaker-dot {
		background: var(--cspan-blue-mid);
	}

	.speaker-guest .speaker-dot {
		background: var(--cspan-red);
	}

	.transcript-text {
		font-size: 15px;
		line-height: 1.65;
		color: #333;
		padding-left: 14px;
	}

	/* Typing indicator */
	.typing-indicator {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 0;
		color: #888;
		font-style: italic;
		font-size: 12px;
	}

	.typing-dots {
		display: flex;
		gap: 3px;
	}

	.typing-dots span {
		width: 5px;
		height: 5px;
		background: var(--cspan-blue-mid);
		border-radius: 50%;
		animation: typing 1.4s infinite;
	}

	.typing-dots span:nth-child(2) {
		animation-delay: 0.2s;
	}
	.typing-dots span:nth-child(3) {
		animation-delay: 0.4s;
	}

	@keyframes typing {
		0%,
		60%,
		100% {
			transform: translateY(0);
			opacity: 0.4;
		}
		30% {
			transform: translateY(-3px);
			opacity: 1;
		}
	}

	/* Controls area */
	.controls-area {
		background: linear-gradient(180deg, #2a3a7c 0%, #1a1a4e 100%);
		padding: 12px;
		border-top: 3px solid var(--cspan-gold);
	}

	.input-label {
		font-size: 9px;
		color: var(--cspan-tan);
		text-transform: uppercase;
		letter-spacing: 1px;
		margin-bottom: 6px;
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.input-label::before {
		content: '☎';
		font-size: 11px;
	}

	.topic-input-row {
		display: flex;
		gap: 8px;
	}

	.topic-input {
		flex: 1;
		padding: 10px 12px;
		font-size: 14px;
		border: 2px solid var(--cspan-blue-light);
		background: var(--cspan-cream);
		font-family: inherit;
		box-shadow: inset 2px 2px 4px rgba(0, 0, 0, 0.1);
	}

	.topic-input:focus {
		outline: none;
		border-color: var(--cspan-gold);
	}

	.submit-btn {
		background: linear-gradient(180deg, #c9a227 0%, #9a7b1c 100%);
		color: #1a1a4e;
		border: 2px solid #7a5c12;
		padding: 10px 16px;
		font-weight: bold;
		font-size: 11px;
		cursor: pointer;
		text-transform: uppercase;
		letter-spacing: 1px;
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.4),
			2px 2px 0 rgba(0, 0, 0, 0.3);
		white-space: nowrap;
	}

	.submit-btn:hover {
		background: linear-gradient(180deg, #d4af37 0%, #a8891f 100%);
	}

	.submit-btn:active {
		transform: translate(1px, 1px);
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.4),
			1px 1px 0 rgba(0, 0, 0, 0.3);
	}

	/* Action buttons row */
	.action-row {
		display: flex;
		justify-content: center;
		flex-wrap: wrap;
		gap: 8px;
		margin-top: 10px;
	}

	.action-btn {
		background: linear-gradient(180deg, #4a6cb3 0%, #2a3a7c 100%);
		color: var(--cspan-cream);
		border: 2px solid var(--cspan-blue-dark);
		padding: 6px 12px;
		font-size: 10px;
		cursor: pointer;
		text-transform: uppercase;
		letter-spacing: 1px;
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.2),
			2px 2px 0 rgba(0, 0, 0, 0.3);
		display: flex;
		align-items: center;
		gap: 5px;
	}

	.action-btn:hover {
		background: linear-gradient(180deg, #5a7cc3 0%, #3a4a8c 100%);
	}

	.action-btn.guest-btn {
		background: linear-gradient(180deg, #8b2332 0%, #6a1a26 100%);
		border-color: #5a151e;
	}

	.action-btn.guest-btn:hover {
		background: linear-gradient(180deg, #9b3342 0%, #7a2a36 100%);
	}

	/* Guest drawer */
	.guest-drawer {
		display: none;
		background: var(--cspan-cream);
		border-top: 3px solid var(--cspan-gold);
	}

	.interview-container.drawer-open .guest-drawer {
		display: block;
	}

	.interview-container.drawer-open .controls-area {
		border-top: none;
	}

	.drawer-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 10px 12px;
		background: linear-gradient(180deg, #e8e0d0 0%, #d4c5a0 100%);
		border-bottom: 2px solid #ccc;
	}

	.drawer-title {
		font-family: Georgia, serif;
		font-size: 13px;
		font-weight: bold;
		color: var(--cspan-blue-dark);
	}

	.drawer-close {
		background: none;
		border: none;
		font-size: 18px;
		cursor: pointer;
		color: #666;
		padding: 0 5px;
	}

	.drawer-close:hover {
		color: var(--cspan-red);
	}

	.drawer-search {
		padding: 10px 12px;
		background: #f5f0e1;
		border-bottom: 1px solid #ddd;
	}

	.search-input {
		width: 100%;
		padding: 8px 10px;
		font-size: 13px;
		border: 2px solid var(--cspan-blue-mid);
		background: white;
		font-family: inherit;
	}

	.search-input:focus {
		outline: none;
		border-color: var(--cspan-gold);
	}

	.search-input::placeholder {
		color: #999;
		font-style: italic;
	}

	.guest-list {
		max-height: 200px;
		overflow-y: auto;
	}

	.guest-list-item {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 10px 12px;
		cursor: pointer;
		border: none;
		border-bottom: 1px solid #ddd;
		background: var(--cspan-cream);
		transition: background 0.1s ease;
		width: 100%;
		text-align: left;
		font-family: inherit;
	}

	.guest-list-item:hover {
		background: #fff9e6;
	}

	.guest-list-item.selected {
		background: linear-gradient(90deg, #fff9e6 0%, #f5e6b3 100%);
		border-left: 4px solid var(--cspan-gold);
		padding-left: 8px;
	}

	.guest-list-photo {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		background: #333;
		border: 2px solid var(--cspan-blue-mid);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 12px;
		color: #666;
		flex-shrink: 0;
	}

	.guest-list-item.selected .guest-list-photo {
		border-color: var(--cspan-gold);
	}

	.guest-list-info {
		flex: 1;
		min-width: 0;
	}

	.guest-list-name {
		font-family: Georgia, serif;
		font-size: 13px;
		font-weight: bold;
		color: #1a1a4e;
	}

	.guest-list-title {
		font-size: 10px;
		color: #666;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.guest-list-date {
		font-size: 9px;
		color: var(--cspan-red);
		font-weight: bold;
		flex-shrink: 0;
	}

	/* Footer */
	.footer {
		text-align: center;
		padding: 10px;
		color: #666;
		font-size: 9px;
		margin-top: 12px;
	}

	/* Mobile responsive */
	@media (max-width: 500px) {
		.header {
			padding: 8px 12px;
		}

		.logo-text {
			font-size: 16px;
		}

		.cspan-badge {
			font-size: 8px;
			padding: 2px 6px;
		}

		.main-container {
			padding: 8px;
		}

		.chyron-photo {
			width: 30px;
			height: 30px;
			font-size: 12px;
		}

		.chyron-name {
			font-size: 12px;
		}

		.chyron-title {
			font-size: 8px;
		}

		.transcript-content {
			padding: 12px;
		}

		.transcript-text {
			font-size: 14px;
			padding-left: 10px;
		}

		.topic-input {
			padding: 8px 10px;
			font-size: 14px;
		}

		.submit-btn {
			padding: 8px 12px;
			font-size: 10px;
		}

		.action-btn {
			padding: 5px 10px;
			font-size: 9px;
		}
	}
</style>
