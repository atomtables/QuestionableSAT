<script>
    import Button from "$lib/components/Button.svelte";
    import { goto } from "$app/navigation";
    import { fade } from "svelte/transition";
    import { cubicIn } from "svelte/easing";
    import { onMount } from "svelte";
    import { onlineStatus, setLookup } from "$lib/clientstate/states.svelte";

    let scrollY = $state(0);
    let innerHeight = $state(0);

    onMount(() => {
        const handleScroll = () => (scrollY = window.scrollY);
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    });
</script>

<svelte:window bind:scrollY bind:innerHeight />

<div class="w-full h-screen bg-neutral-900/50 backdrop-blur-3xl text-white flex flex-col justify-center items-center text-center px-6 fixed" style="opacity: {Math.max(0, 1 - scrollY / (innerHeight * 0.7))}" transition:fade={{ easing: cubicIn, duration: 50 }}>
    <!-- Main content centered -->
    <div class="max-w-4xl mx-auto space-y-6">
        <div class="-mb-0">
            <a href="/" class="hover:underline transition-opacity hover:opacity-75 font-sans font-bold">QuestionableSAT</a>
        </div>
        <h1 class="text-5xl md:text-6xl font-bold leading-tight">
            Break free of the clutches of
            <span class="text-blue-400">standardized exam prep</span>
        </h1>

        <p class="text-xl md:text-2xl text-gray-300 leading-relaxed max-w-3xl mx-auto">Don't let the system dictate your worth, don't let prep centers take your money, and don't allow stress to consume your life. Practice and preparation is all you need to succeed.</p>

        <div class="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button onclick={() => goto("/topics")} class="text-white font-bold">Get Started</Button>
            <Button onclick={() => window.scrollTo({ top: document.getElementById("one").offsetTop, behavior: "smooth" })} class="text-white">Explore</Button>
        </div>
    </div>

    <div class="absolute bottom-8 left-1/2 transform -translate-x-1/2 motion-safe:animate-bounce duration-3000">
        <div class="flex flex-col items-center text-gray-400">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
            </svg>
        </div>
    </div>
</div>

<div class="min-h-screen bg-neutral-900/50 backdrop-blur-3xl text-white" style="margin-top: 100vh;" id="one">
    <div class="relative py-20 px-6">
        <div class="max-w-6xl mx-auto">
            <h2 class="text-4xl md:text-5xl font-bold text-center mb-16">Everything you need to score high</h2>

            <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                <div class="p-6 rounded-xl bg-neutral-800/50 border border-white/10 backdrop-blur-sm hover:bg-neutral-700/50 transition-all">
                    <h3 class="text-xl font-bold mb-3">Guided Practice</h3>
                    <p class="text-gray-300">You can have QuestionableSAT give you random questions in however mode you want, all you have to do is select a topic and go from there.</p>
                </div>

                <div class="p-6 rounded-xl bg-neutral-800/50 border border-white/10 backdrop-blur-sm hover:bg-neutral-700/50 transition-all">
                    <h3 class="text-xl font-bold mb-3">Expert Mode</h3>
                    <p class="text-gray-300">If you're a power user and know what you want, you can directly access advanced filtering and a bank of questions however you need it. QuestionableSAT doesn't get in your way.</p>
                </div>

                <div class="p-6 rounded-xl bg-neutral-800/50 border border-white/10 backdrop-blur-sm hover:bg-neutral-700/50 transition-all">
                    <h3 class="text-xl font-bold mb-3">Offline Usability</h3>
                    <p class="text-gray-300">You can make your own offline archive of CollegeBoard questions and practice offline. In case the CollegeBoard website is down or inaccessible, you'll still have access to the material you need.</p>
                </div>

                <div class="p-6 rounded-xl bg-neutral-800/50 border border-white/10 backdrop-blur-sm hover:bg-neutral-700/50 transition-all">
                    <h3 class="text-xl font-bold mb-3">Official Content</h3>
                    <p class="text-gray-300">Whatever questions you get from CollegeBoard's SAT question bank are the same questions you'll get here. That's because this website directly hooks into the question bank.</p>
                </div>

                <div class="p-6 rounded-xl bg-neutral-800/50 border border-white/10 backdrop-blur-sm hover:bg-neutral-700/50 transition-all">
                    <h3 class="text-xl font-bold mb-3">No accounts</h3>
                    <p class="text-gray-300">Unlike some other sources you may know of, we don't require a single account, or for that matter, internet. You can make your own archive of SAT questions and practice whenever you want.</p>
                </div>

                <div class="p-6 rounded-xl bg-neutral-800/50 border border-white/10 backdrop-blur-sm hover:bg-neutral-700/50 transition-all">
                    <h3 class="text-xl font-bold mb-3">Made by one of you</h3>
                    <p class="text-gray-300">
                        I literally made this site because the CollegeBoard's preparation materials suck. In my <b>not very humble</b>
                        opinion, this website is really good at just getting out of your way and giving you questions.
                    </p>
                </div>
            </div>
            <div class="flex flex-col sm:flex-row gap-4 justify-center pt-16">
                <Button onclick={() => goto("/topics")} class="text-white font-bold">Guided Mode</Button>
                <Button onclick={() => goto("/everything")} class="text-white font-bold">Expert Mode</Button>
                <Button onclick={() => goto("/archiver")} class="text-white font-bold">Archive Creator</Button>
                <Button onclick={() => goto("/about")} class="text-white font-bold">About/Technical Explanation</Button>
                <Button onclick={() => {
                    onlineStatus[0] = !onlineStatus[0]
                    setLookup({})
                }} class="text-white font-bold">
                    {#if onlineStatus[0]}
                        Go offline
                    {:else}
                        Go online
                    {/if}
                </Button>
            </div>
        </div>
    </div>
</div>
