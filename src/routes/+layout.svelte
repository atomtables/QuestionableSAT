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

{@render children?.()}
