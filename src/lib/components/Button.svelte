<script>
    import Spinner from "$lib/components/Spinner.svelte";

    let {
        children,
        onclick = () => new Promise(r => r()),
        class: className = '',
        type = 'button',
        disabled = false,
        transparent = false,
        destructive = false,
        disableLoading = false,
        resetStyling = false,
        ...etc
    } = $props();

    let resolving = $state(false);

    const handleClick = () => {
        if (disabled || resolving) return;

        new Promise(async (res) => {
            resolving = true;
            try {
                await Promise.resolve(onclick?.(new CustomEvent(`onClickButton-${name}`)));
            } finally {
                resolving = false;
            }
            res(true);
        })
    };
</script>

<button {type} {...etc} {disabled}
        class="{!resetStyling && `text-white rounded-full backdrop-blur-2xl px-5 py-2 ${disabled ? `cursor-not-allowed ${!transparent && 'dark:bg-gray-700 bg-blue-200/40'} text-gray-300` : `cursor-pointer ${!transparent ? 'dark:bg-blue-700/40 dark:hover:bg-blue-600/40 dark:active:bg-blue-500/40 bg-blue-300/40 hover:bg-blue-400/40 active:bg-blue-500/40' : 'hover:bg-neutral-400/25 active:bg-neutral-400/50'}`} ${destructive && 'dark:bg-red-700 dark:hover:bg-red-600 dark:active:bg-red-500 bg-red-300 hover:bg-red-400 active:bg-red-500'} ${resolving && !disableLoading && 'cursor-progress'} font-bold transition-all flex flex-row items-center justify-center`} {className}"
        onclick={handleClick}>
    <span class="flex flex-row">
        {#if resolving && !disableLoading}
            <Spinner size="24" class="mr-2" type={!transparent ? 'secondary' : 'primary'}/>
        {/if}
        {@render children?.()}
    </span>
</button>