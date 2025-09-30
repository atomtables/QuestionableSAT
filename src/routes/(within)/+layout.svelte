<script>
    import { onMount } from "svelte";
    import { lookup } from '$lib/clientstate/states.svelte';
    import Dialog, { wait } from "$lib/components/Dialog.svelte";

    let { children } = $props();

    const tryCatch = (expression) => {
        try {
            return expression()
        } catch (e) {
            return null;
        }
    }
</script>

{#if tryCatch(() => Object.entries(lookup?.lookupData).length) > 0}
    {@render children()}
{:else}
    <Dialog open={true} title="Loading..." description="Getting the topics available from Collegeboard. This shouldn't take long..." loading/>
{/if}