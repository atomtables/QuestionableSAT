<script>
    import {onMount} from "svelte";
    import {goto} from "$app/navigation";
    import Bluebook from "$lib/components/platformspecific/Bluebook.svelte";

    let start = $state()
    let tries = $state()
    let ignoreViewed = $state()
    let maxStreak = $state()

    onMount(() => {
        const urlParams = new URLSearchParams(window.location.search);
        start = urlParams.get("start")
        tries = parseInt(urlParams.get("tries"))
        ignoreViewed = urlParams.get("ignoreViewed") || true
        maxStreak = isNaN(parseInt(urlParams.get("streak"))) ? 0 : parseInt(urlParams.get("streak"))

        if (!start || isNaN(tries)) goto("/questiongets")
    })
</script>

<Bluebook />

