<script>
    import Input from "$lib/components/Input.svelte";
    import {slide} from "svelte/transition";
    import Collapsible from "$lib/components/Collapsible.svelte";
    import Button from "$lib/components/Button.svelte";
    import {selectedDetails} from "$lib/clientstate/states.svelte.js";
    import {onMount} from "svelte";
    import {goto} from "$app/navigation";

    let {data} = $props();

    onMount(() => {
        selectedDetails.topics = {}
        selectedDetails.subtopics = {}
        selectedDetails.ignoreLive = true
    })

    let lastOpened = $state({})
</script>

<div class="flex flex-col gap-5 items-center justify-center lg:min-h-screen bg-neutral-900/30 backdrop-blur-2xl">
    <div class="block lg:hidden h-[64px]">

    </div>
    <div class="flex flex-col lg:flex-row gap-5 items-center">
        <div class="flex flex-col lg:max-h-120 lg:overflow-y-scroll p-4 gap-4 text-white backdrop-blur-2xl m-4 flex-1">
            <div class="text-lg font-bold font-sans border-2 rounded-full w-8 h-8 flex items-center justify-center">
                1
            </div>
            <div class="text-4xl font-bold">
                Choose your exam
            </div>
            <div class="pl-0.5">
                Select the exam from the options that CollegeBoard has made publicly available below.
            </div>
            <Input name="Exam" type="dropdown" bind:value={selectedDetails.test} class="w-full" elements={data.lookup.lookupData?.assessment.map(a => a.text)} />
        </div>
        <div class="flex flex-col lg:max-h-120 lg:overflow-y-scroll p-4 gap-4 text-white backdrop-blur-2xl m-4 flex-1 transition-all duration-300 {typeof selectedDetails.test !== 'number' && 'opacity-50 touch-none pointer-events-none'}">
            <div class="text-lg font-bold font-sans border-2 rounded-full w-8 h-8 flex items-center justify-center">
                2
            </div>
            <div class="text-4xl font-bold">
                Choose your test section and topics
            </div>
            <div class="pl-0.5">
                Get the most out of your practice by selecting the section and topics you want to focus on.
            </div>
            <Input
                    name="Section"
                    type="dropdown"
                    bind:value={selectedDetails.section}
                    class="w-full"
                    elements={data.lookup.lookupData?.test.map(a => a.text)}
            />
            {#if typeof selectedDetails.section === 'number'}
                <div class="flex flex-col gap-0 max-h-60 overflow-y-auto -mt-4 pl-0.5" transition:slide>
                    {#each Object.values(data.lookup.lookupData?.domain)[selectedDetails.section] as topic}
                        <div class="flex flex-row justify-center items-center gap-2">
                            <Input
                                    type="checkbox"
                                    bind:value={selectedDetails.topics[parseInt(topic.id)]}
                                    action={(v) => v ? lastOpened = {[topic.id]: true} : lastOpened = {[Object.keys(selectedDetails.topics).at(-1)]: true}}
                                    class="flex flex-row w-min"
                            />
                            <div class="w-full">{topic.text}</div>
                        </div>
                    {/each}
                </div>
            {/if}
        </div>
        <div class="flex flex-col lg:max-h-120 lg:overflow-y-scroll p-4 gap-4 text-white backdrop-blur-2xl m-4 flex-1 {typeof selectedDetails.section !== 'number' && 'opacity-50 touch-none pointer-events-none'}">
            <div class="text-lg font-bold font-sans border-2 rounded-full w-8 h-8 flex items-center justify-center">
                3
            </div>
            <div class="text-4xl font-bold">
                Choose subtopics to focus on
            </div>
            <div class="pl-0.5">
                We would recommend choosing all subjects, but if you know where you need practice, then work hard.
            </div>
            {#if selectedDetails.topics}
                {#each Object.keys(selectedDetails.topics) as key, i}
                    {#if selectedDetails.topics[key] && typeof selectedDetails.section === 'number'}
                        {@const value = Object.values(data.lookup.lookupData.domain)[selectedDetails.section]?.[key - 1]}
                        <div transition:slide>
                            {#if value && value.skill}
                                <div transition:slide>
                                    <Collapsible title={value.text} display={lastOpened[key]}>
                                        {#each value.skill as {id, text}}
                                            <div class="flex flex-row justify-center items-center gap-2">
                                                <Input
                                                        type="checkbox"
                                                        bind:value={selectedDetails.subtopics[id]}
                                                        class="flex flex-row w-min"
                                                        defaultValue={true}
                                                />
                                                <div class="w-full">{text}</div>
                                            </div>
                                        {/each}
                                    </Collapsible>
                                </div>
                            {/if}
                        </div>
                    {/if}
                {/each}
            {/if}
            <div class="flex flex-row justify-center items-center gap-2">
                <Input
                        type="checkbox"
                        bind:value={selectedDetails.ignoreLive}
                        class="flex flex-row w-min"
                />
                <div class="w-full">Do not show problems that are already in Bluebook® Practice tests.</div>
            </div>
        </div>
    </div>
    {#if selectedDetails.topics && Object.values(selectedDetails.topics).some(v => v === true)}
        <div transition:slide class="pb-5">
            <Button onclick={() => goto("/questiongets")}>I'm ready.</Button>
        </div>
    {/if}
</div>