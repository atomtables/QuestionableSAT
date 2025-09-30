<script>
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import Button from "$lib/components/Button.svelte";
	import { onNavigate } from '$app/navigation';
    import { onMount } from 'svelte';
    import { lookup, setLookup } from '$lib/clientstate/states.svelte';

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

	onMount(async () => {
		const lookupRes = await (await fetch("https://qbank-api.collegeboard.org/msreportingquestionbank-prod/questionbank/lookup", {
			"credentials": "omit",
			"headers": {
				"Accept": "application/json, text/plain, */*",
				"Accept-Language": "en-US,en;q=0.5",
			},
			"method": "GET"
		})).json();

		setLookup(lookupRes)
	})
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children?.()}
