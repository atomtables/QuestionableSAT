<script>
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import Button from "$lib/components/Button.svelte";
	import { onNavigate } from '$app/navigation';

	let { children, data } = $props();

	onNavigate((navigation) => {
		if (!document.startViewTransition) return;

		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="fixed z-999 w-full bg-blue-800/40 backdrop-blur-xl text-white p-4 flex flex-row justify-between items-center">
	<div class="text-white font-bold text-2xl">
		QuestionableSAT
	</div>
	<div class="flex flex-row flex-nowrap gap-2">
		{#each data.lookup.lookupData?.assessment as {id, text}}
			<Button>
				{text}
			</Button>
		{/each}
	</div>
</div>
{@render children?.()}
