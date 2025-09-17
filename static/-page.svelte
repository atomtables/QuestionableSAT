<script>
    import Input from "$lib/components/Input.svelte";
    import {slide} from "svelte/transition";
    import Collapsible from "$lib/components/Collapsible.svelte";
    import Button from "$lib/components/Button.svelte";
    import {selectedDetails} from "$lib/clientstate/states.svelte.ts";
    import {onMount} from "svelte";
    import {goto} from "$app/navigation";

    let {data} = $props();
    let mounted = $state(false)

    onMount(() => {
        mounted = true
        selectedDetails.topics = {}
        selectedDetails.subtopics = {}
        selectedDetails.ignoreLive = true
    })

    let lastOpened = $state({})
</script>

<div class="flex flex-col gap-5 backdrop-blur-2xl transition-colors {mounted && 'bg-neutral-900/50 backdrop-blur-2xl'} pt-[64px]">
    <div class="flex flex-col gap-5">
        <div class="flex flex-col lg:flex-row">
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
                {#each data.lookup.lookupData.assessment as {id, text}, i}
                    <div class="flex flex-row justify-center items-center gap-2 -my-2">
                        <Input type="radio" class="w-min" radioGroup="assessment" radioId={i} bind:value={selectedDetails.test} />
                        <div class="w-full">{text}</div>
                    </div>
                {/each}
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
                {#each data.lookup.lookupData.test as {id, text}, i}
                    <div class="flex flex-row justify-center items-center gap-2 -my-2">
                        <Input type="radio" class="w-min" radioGroup="assessment" radioId={i} bind:value={selectedDetails.section} />
                        <div class="w-full">{text}</div>
                    </div>
                {/each}
            </div>
        </div>
        <div class="flex flex-col lg:max-h-120 lg:overflow-y-scroll p-4 gap-4 text-white backdrop-blur-2xl m-4 flex-1 transition-all duration-300 {typeof selectedDetails.test !== 'number' && 'opacity-50 touch-none pointer-events-none'}">
            <div class="flex flex-col lg:justify-between lg:flex-row">
                <div class="flex flex-col gap-4">
                    <div class="text-lg font-bold font-sans border-2 rounded-full w-8 h-8 flex items-center justify-center">
                        3
                    </div>
                    <div class="text-4xl font-bold">
                        Choose topics and subtopics
                    </div>
                    <div class="pl-0.5">
                        Get the most out of your practice by selecting the section and topics you want to focus on.
                    </div>
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
                <div>
                    {#if selectedDetails.topics}
                        {#each Object.keys(selectedDetails.topics) as key, i}
                            {#if selectedDetails.topics[key] && typeof selectedDetails.section === 'number'}
                                {@const value = Object.values(data.lookup.lookupData.domain)[selectedDetails.section]?.[key - 1]}
                                <div transition:slide>
                                    {#if value && value.skill}
                                        <div transition:slide>
                                            <Collapsible title={value.text} description={`${Object.entries(selectedDetails.subtopics).filter(([k, v]) => value.skill.some(x => x.id === k.id) && v).length} selected`}>
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

        </div>
    </div>
    {#if selectedDetails.topics && Object.values(selectedDetails.topics).some(v => v === true)}
        <div transition:slide class="pb-5">
            <Button onclick={() => goto("/questiongets")}>I'm ready.</Button>
        </div>
    {/if}
</div>