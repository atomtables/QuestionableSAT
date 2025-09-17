<script>
    /** throwaway Page because snippets don't hold their water (each can't have state) */
    import Dropdown from "$lib/components/Dropdown.svelte";
    import Button from "$lib/components/Button.svelte";
    import {slide} from "svelte/transition";

    let { title, description, children, display = $bindable() } = $props()
</script>

<div class="w-full from-cyan-700 to-slate-700 bg-gradient-to-r {display ? 'py-3' : 'pt-3'} px-2 transition-all">
    <div class="flex flex-row items-end">
        <div class="text-2xl font-bold pb-2">
            {title}
        </div>
        <div class="text-sm pl-2 pb-2.75">
            {description}
        </div>
        <div class="grow"></div>
        <div class="grow"></div>
        <div class="flex flex-row">
            <Button
                    transparent
                    class="w-8 h-8 mb-2 font-mono hover:bg-neutral-500/25 active:bg-neutral-500/50 grid place-items-center transition-colors"
                    onclick={() => display = !display}
            >
                <span class="text-xl/0 mb-2">⌄</span>
            </Button>
        </div>
    </div>
    {#if display}
        <div transition:slide={{ duration: 250 }}>
            {@render children?.()}
        </div>
    {/if}
</div>