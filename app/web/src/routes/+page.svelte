<script lang="ts">
	import { onMount } from 'svelte';

	let { data } = $props();

	let drawerOpen = $state(false);
	let searchQuery = $state('');
	let topicInput = $state('');
	let isGenerating = $state(false);
	let transcriptArea: HTMLElement;

	// Current episode state (can be changed via drawer)
	let currentEpisode = $state(data.currentEpisode);

	// Generated turns that will be appended to the transcript display
	let generatedTurns = $state<Array<{ speaker: string; text: string; is_generated?: boolean }>>([]);

	// Currently typing turn (word by word effect)
	let typingTurn = $state<{ speaker: string; text: string; is_generated?: boolean } | null>(null);
	let typingText = $state('');

	// Combined transcript for display
	let displayTranscript = $derived([
		...(currentEpisode?.transcript || []),
		...generatedTurns
	]);

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
		fetchEpisode(episode.id);
		drawerOpen = false;
	}

	async function fetchEpisode(id: string) {
		try {
			const res = await fetch(`/api/episode/${id}`);
			if (res.ok) {
				currentEpisode = await res.json();
				generatedTurns = []; // Reset generated turns for new episode
				typingTurn = null;
				typingText = '';
				setTimeout(scrollToBottom, 100);
			}
		} catch (e) {
			console.error('Failed to fetch episode:', e);
		}
	}

	// Type out text word by word with natural variation
	async function typeText(text: string): Promise<void> {
		const words = text.split(' ');
		typingText = '';

		for (let i = 0; i < words.length; i++) {
			typingText += (i === 0 ? '' : ' ') + words[i];
			scrollToBottom();

			// Variable delay: shorter for small words, longer for punctuation
			const word = words[i];
			let delay = 30 + Math.random() * 40; // Base 30-70ms per word

			// Longer pauses for punctuation
			if (word.endsWith('.') || word.endsWith('?') || word.endsWith('!')) {
				delay += 150 + Math.random() * 100;
			} else if (word.endsWith(',') || word.endsWith(';') || word.endsWith(':')) {
				delay += 50 + Math.random() * 50;
			}

			await new Promise((resolve) => setTimeout(resolve, delay));
		}
	}

	// Animate a single turn with typing effect
	async function animateTurn(turn: { speaker: string; text: string; is_generated?: boolean }): Promise<void> {
		// Show the speaker label and start typing
		typingTurn = turn;
		typingText = '';

		// Small pause before typing starts
		await new Promise((resolve) => setTimeout(resolve, 300));

		// Type out the text
		await typeText(turn.text);

		// Small pause after completing
		await new Promise((resolve) => setTimeout(resolve, 200));

		// Move completed turn to generatedTurns
		generatedTurns = [...generatedTurns, turn];
		typingTurn = null;
		typingText = '';

		// Pause between speakers
		await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 500));
	}

	async function resumeConversation(topic: string | null = null) {
		if (!currentEpisode || isGenerating) return;

		isGenerating = true;

		// Queue to hold turns as they arrive from the stream
		const turnQueue: Array<{ speaker: string; text: string; is_generated?: boolean }> = [];
		let streamDone = false;

		try {
			const res = await fetch('/api/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					programId: currentEpisode.id,
					topic: topic
				})
			});

			if (!res.ok) {
				throw new Error('Failed to resume conversation');
			}

			// Process SSE stream in background
			const processStream = async () => {
				const reader = res.body?.getReader();
				const decoder = new TextDecoder();

				if (!reader) {
					throw new Error('No response body');
				}

				let buffer = '';

				while (true) {
					const { done, value } = await reader.read();
					if (done) break;

					buffer += decoder.decode(value, { stream: true });

					const lines = buffer.split('\n');
					buffer = lines.pop() || '';

					for (const line of lines) {
						if (line.startsWith('data: ')) {
							const jsonStr = line.slice(6);
							try {
								const eventData = JSON.parse(jsonStr);

								if (eventData.speaker && eventData.text) {
									turnQueue.push(eventData);
								} else if (eventData.sessionId) {
									console.log('Conversation saved:', eventData);
								} else if (eventData.error) {
									console.error('Stream error:', eventData.error);
								}
							} catch {
								// Ignore parse errors
							}
						}
					}
				}

				streamDone = true;
			};

			// Start stream processing
			const streamPromise = processStream();

			// Animate turns as they arrive
			const animateLoop = async () => {
				while (!streamDone || turnQueue.length > 0) {
					if (turnQueue.length > 0) {
						const turn = turnQueue.shift()!;
						await animateTurn(turn);
					} else {
						// Wait a bit for more turns
						await new Promise((resolve) => setTimeout(resolve, 100));
					}
				}
			};

			await Promise.all([streamPromise, animateLoop()]);

			// Clear topic input after successful generation
			topicInput = '';
		} catch (e) {
			console.error('Error resuming conversation:', e);
		} finally {
			isGenerating = false;
			typingTurn = null;
			typingText = '';
			scrollToBottom();
		}
	}

	function handleContinue() {
		resumeConversation(null);
	}

	function handleCallIn() {
		if (topicInput.trim()) {
			resumeConversation(topicInput.trim());
		} else {
			resumeConversation(null);
		}
	}

	function handleRestart() {
		generatedTurns = [];
		typingTurn = null;
		typingText = '';
		scrollToBottom();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleCallIn();
		}
	}

	function scrollToBottom() {
		if (transcriptArea) {
			transcriptArea.scrollTop = transcriptArea.scrollHeight;
		}
	}

	function closeDrawerOnEscape(e: KeyboardEvent) {
		if (e.key === 'Escape' && drawerOpen) {
			drawerOpen = false;
		}
	}

	onMount(() => {
		scrollToBottom();
		requestAnimationFrame(() => {
			scrollToBottom();
			requestAnimationFrame(scrollToBottom);
		});
		setTimeout(scrollToBottom, 100);
		setTimeout(scrollToBottom, 300);

		document.addEventListener('keydown', closeDrawerOnEscape);
		return () => document.removeEventListener('keydown', closeDrawerOnEscape);
	});
</script>

<div class="app">
	<!-- Header -->
	<header class="header">
		<div>
			<div class="logo-text">BOOKNOTES</div>
			<div class="logo-subtext">with Brian Lamb — Resumed</div>
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
			<section class="interview-container">
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
								<div class="chyron-title">Author, {currentEpisode.book_title || currentEpisode.title}</div>
							</div>
						</div>
					</div>
				</div>

				<!-- Transcript Area -->
				<div class="transcript-area" bind:this={transcriptArea}>
					<div class="transcript-content">
						{#each displayTranscript as turn}
							<div class="transcript-entry" class:generated={turn.is_generated}>
								<div
									class="speaker-label"
									class:speaker-lamb={turn.speaker.toLowerCase().includes('lamb')}
									class:speaker-guest={!turn.speaker.toLowerCase().includes('lamb')}
								>
									<span class="speaker-dot"></span>
									{turn.speaker}
									{#if turn.is_generated}
										<span class="generated-badge">AI</span>
									{/if}
								</div>
								<div class="transcript-text">
									{turn.text}
								</div>
							</div>
						{/each}

						<!-- Currently typing turn -->
						{#if typingTurn}
							<div class="transcript-entry generated typing-active">
								<div
									class="speaker-label"
									class:speaker-lamb={typingTurn.speaker.toLowerCase().includes('lamb')}
									class:speaker-guest={!typingTurn.speaker.toLowerCase().includes('lamb')}
								>
									<span class="speaker-dot"></span>
									{typingTurn.speaker}
									<span class="generated-badge">AI</span>
								</div>
								<div class="transcript-text">
									{typingText}<span class="typing-cursor">|</span>
								</div>
							</div>
						{/if}

						<!-- Typing indicator -->
						<div class="typing-indicator">
							<div class="typing-dots">
								<span></span>
								<span></span>
								<span></span>
							</div>
							{#if isGenerating && !typingTurn}
								Preparing response...
							{:else if isGenerating}
								Conversation in progress...
							{:else}
								Waiting to resume conversation...
							{/if}
						</div>
					</div>
				</div>

				<!-- Controls Area -->
				<div class="controls-area">
					<div class="input-label">Call In — Suggest a Topic</div>
					<div class="topic-input-row">
						<input
							type="text"
							class="topic-input"
							placeholder="e.g., television's effect on politics..."
							bind:value={topicInput}
							onkeydown={handleKeydown}
							disabled={isGenerating}
						/>
						<button class="submit-btn" onclick={handleCallIn} disabled={isGenerating}>
							{isGenerating ? '...' : 'Call In'}
						</button>
					</div>
					<div class="action-row">
						<button class="action-btn" onclick={handleContinue} disabled={isGenerating}>
							{isGenerating ? '● Generating...' : '▶ Continue'}
						</button>
						<button class="action-btn" onclick={handleRestart} disabled={isGenerating}>
							↺ Restart
						</button>
						<button class="action-btn guest-btn" onclick={() => (drawerOpen = true)} disabled={isGenerating}>
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

	<!-- Guest Selection Modal Overlay -->
	{#if drawerOpen}
		<div class="modal-overlay" onclick={() => (drawerOpen = false)}>
			<div class="guest-modal" onclick={(e) => e.stopPropagation()}>
				<div class="modal-header">
					<span class="modal-title">Select a Guest</span>
					<button class="modal-close" onclick={() => (drawerOpen = false)}>×</button>
				</div>
				<div class="modal-search">
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
				<div class="modal-footer">
					<span class="episode-count">{data.total} episodes available</span>
				</div>
			</div>
		</div>
	{/if}
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
		max-width: 200px;
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

	.transcript-entry.generated {
		background: linear-gradient(90deg, rgba(201, 162, 39, 0.1) 0%, transparent 100%);
		margin-left: -16px;
		margin-right: -16px;
		padding-left: 16px;
		padding-right: 16px;
		border-left: 3px solid var(--cspan-gold);
	}

	.transcript-entry.typing-active {
		background: linear-gradient(90deg, rgba(201, 162, 39, 0.2) 0%, rgba(201, 162, 39, 0.05) 100%);
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

	.generated-badge {
		font-size: 8px;
		background: var(--cspan-gold);
		color: var(--cspan-blue-dark);
		padding: 1px 4px;
		border-radius: 2px;
		margin-left: 4px;
	}

	.transcript-text {
		font-size: 15px;
		line-height: 1.65;
		color: #333;
		padding-left: 14px;
	}

	.typing-cursor {
		display: inline-block;
		animation: blink 0.8s infinite;
		color: var(--cspan-blue-mid);
		font-weight: bold;
	}

	@keyframes blink {
		0%, 50% {
			opacity: 1;
		}
		51%, 100% {
			opacity: 0;
		}
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

	.topic-input:disabled {
		opacity: 0.7;
		cursor: not-allowed;
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

	.submit-btn:hover:not(:disabled) {
		background: linear-gradient(180deg, #d4af37 0%, #a8891f 100%);
	}

	.submit-btn:active:not(:disabled) {
		transform: translate(1px, 1px);
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.4),
			1px 1px 0 rgba(0, 0, 0, 0.3);
	}

	.submit-btn:disabled {
		opacity: 0.7;
		cursor: not-allowed;
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

	.action-btn:hover:not(:disabled) {
		background: linear-gradient(180deg, #5a7cc3 0%, #3a4a8c 100%);
	}

	.action-btn:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	.action-btn.guest-btn {
		background: linear-gradient(180deg, #8b2332 0%, #6a1a26 100%);
		border-color: #5a151e;
	}

	.action-btn.guest-btn:hover:not(:disabled) {
		background: linear-gradient(180deg, #9b3342 0%, #7a2a36 100%);
	}

	/* Modal Overlay */
	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.75);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 20px;
	}

	.guest-modal {
		background: var(--cspan-cream);
		border: 3px solid var(--cspan-gold);
		box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
		width: 100%;
		max-width: 500px;
		max-height: 80vh;
		display: flex;
		flex-direction: column;
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 12px 16px;
		background: linear-gradient(180deg, #2a3a7c 0%, #1a1a4e 100%);
		border-bottom: 3px solid var(--cspan-gold);
	}

	.modal-title {
		font-family: Georgia, serif;
		font-size: 16px;
		font-weight: bold;
		color: var(--cspan-cream);
	}

	.modal-close {
		background: none;
		border: none;
		font-size: 24px;
		cursor: pointer;
		color: var(--cspan-cream);
		padding: 0 5px;
		line-height: 1;
	}

	.modal-close:hover {
		color: var(--cspan-gold);
	}

	.modal-search {
		padding: 12px 16px;
		background: #f5f0e1;
		border-bottom: 1px solid #ddd;
	}

	.search-input {
		width: 100%;
		padding: 10px 12px;
		font-size: 14px;
		border: 2px solid var(--cspan-blue-mid);
		background: white;
		font-family: inherit;
		box-sizing: border-box;
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
		flex: 1;
		overflow-y: auto;
		min-height: 200px;
		max-height: 400px;
	}

	.guest-list-item {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px 16px;
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
		padding-left: 12px;
	}

	.guest-list-photo {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		background: #333;
		border: 2px solid var(--cspan-blue-mid);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 14px;
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
		font-size: 14px;
		font-weight: bold;
		color: #1a1a4e;
	}

	.guest-list-title {
		font-size: 11px;
		color: #666;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.guest-list-date {
		font-size: 10px;
		color: var(--cspan-red);
		font-weight: bold;
		flex-shrink: 0;
	}

	.modal-footer {
		padding: 10px 16px;
		background: linear-gradient(180deg, #e8e0d0 0%, #d4c5a0 100%);
		border-top: 2px solid #ccc;
		text-align: center;
	}

	.episode-count {
		font-size: 11px;
		color: #666;
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
			max-width: 120px;
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

		.modal-overlay {
			padding: 10px;
		}

		.guest-modal {
			max-height: 90vh;
		}
	}
</style>
