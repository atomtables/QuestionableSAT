<script lang="ts">
    import Input from '$lib/components/Input.svelte';
    import Collapsible from '$lib/components/Collapsible.svelte';
    import Button from '$lib/components/Button.svelte';
    import {onMount, tick} from 'svelte';
    import { goto } from '$app/navigation';
    import { slide } from "svelte/transition";
    import type {LookupData} from "$lib/types/types";
    import {selectedDetails} from "$lib/clientstate/states.svelte";
    import {fade} from "svelte/transition";
    import {cubicIn} from "svelte/easing";
    import {lookup} from "$lib/clientstate/states.svelte";

    const setup = $state({
        test: null as number | null,
        section: null as number | null,
        topics: {} as Record<number, boolean>,
        subtopics: {} as Record<number, boolean>,
        ignoreLive: true
    });

    let currentStep = $state(1);

    let { data }: {data: {lookup: LookupData}}
        = $props(); // assumes lookup.lookupData etc.

    onMount(() => {
        // reset on mount if needed
        console.log("mounted")
        const urlParams = new URLSearchParams(window.location.search);
        let left = urlParams.get("left")
        if (left) {
            console.log(left)
            for (let [k, v] of Object.entries(selectedDetails)) {
                setup[k] = v
            }
            console.log($state.snapshot(setup))

            tick().then(() => {
                for (let i = 0; i <= parseInt(left); i++) {
                    goNext()
                }
            })
            return;
        }
        setup.test = undefined;
        setup.section = undefined;
        setup.topics = {};
        setup.subtopics = {};
        setup.ignoreLive = true;
        currentStep = 1;
    });

    const verifyNext = $derived.by(() => {
        if (currentStep === 1 && typeof setup.test !== 'number') return true;
        if (currentStep === 2 && typeof setup.section !== 'number') return true;
        if (currentStep === 3 && !Object.values(setup.subtopics).some(v => v)) return true;
        return false;
    })
    function goNext() {
        if (currentStep === 1) {
            if (typeof setup.test !== 'number') return;
        }
        if (currentStep === 2) {
            if (typeof setup.section !== 'number') return;
            Object.values(lookup.lookupData.domain)[setup.section].forEach(v => {
                v.skill.forEach(({id}) => {
                    setup.subtopics[id] = true
                })
            })
        }
        if (currentStep === 3) {
            if (!Object.values(setup.subtopics).some(v => v)) return;
            Object.entries(setup.subtopics).forEach(([k, v]) => {
                if (v) {
                    Object.values(lookup.lookupData.domain)[setup.section].forEach(x => {
                        x.skill.forEach(({id}) => {
                            // @ts-ignore
                            if (parseInt(id) === parseInt(k)) {
                                setup.topics[x.id] = true
                            }
                        })
                    })
                }
            })
        }
        if (currentStep < 4) currentStep += 1;
    }
    function goPrev() {
        if (currentStep > 1) currentStep -= 1;
    }
    function submit() {
        for (let [k, v] of Object.entries(setup)) {
            selectedDetails[k] = v
        }
        goto('/questiongets');
    }
</script>

<div class="flex flex-col w-screen h-screen items-center justify-center bg-neutral-900/50 backdrop-blur-sm p-10 bg-opacity-50 text-white min-h-screen" in:fade={{easing: cubicIn, duration: 200}}>
    <div class="max-w-3xl mx-auto w-full space-y-8">
        <div class="flex flex-col items-center gap-5">
            <div class="font-bold font-sans">
                QuestionableSAT
            </div>
            <div class="flex justify-between items-center w-full">
                <div class="flex-1 text-center">
                    <div class="text-xl font-bold" class:opacity-50={currentStep !== 1}>1. Exam</div>
                </div>
                <div class="flex-1 text-center">
                    <div class="text-xl font-bold" class:opacity-50={currentStep !== 2}>2. Section</div>
                </div>
                <div class="flex-1 text-center">
                    <div class="text-xl font-bold" class:opacity-50={currentStep !== 3}>3. Topics</div>
                </div>
                <div class="flex-1 text-center">
                    <div class="text-xl font-bold" class:opacity-50={currentStep !== 4}>4. Review</div>
                </div>
                <div class="flex-1 text-center">
                    <div class="text-xl font-bold" class:opacity-50={currentStep !== 5}>5. Start</div>
                </div>
            </div>
        </div>

        <!-- Step 1: Choose Exam -->
        {#if currentStep === 1}
            <div class="space-y-4 bg-gray-800 rounded-lg p-6 shadow-md" transition:slide>
                <div class="text-2xl font-bold">Choose your exam</div>
                <div class="text-gray-300">Select the exam from the options that CollegeBoard has made publicly available below.</div>

                {#each lookup.lookupData.assessment as { id, text }, i}
                    <div class="flex items-center gap-3">
                        <Input
                                type="radio"
                                radioGroup="assessment"
                                radioId={i}
                                bind:value={setup.test}
                                class="w-min"
                        />
                        <span class="text-lg">{text}</span>
                    </div>
                {/each}
                <a href="/everything" class="text-gray-300 hover:underline text-sm">Just show me everything.</a>
            </div>
        {/if}

        <!-- Step 2: Choose Section -->
        {#if currentStep === 2}
            <div class="space-y-4 bg-gray-800 rounded-lg p-6 shadow-md" transition:slide>
                <div class="text-2xl font-bold">Choose your test section</div>
                <div class="text-gray-300">Get the most out of your practice by selecting the section you want to focus on.</div>

                {#each lookup.lookupData.test as { id, text }, i}
                    <div class="flex items-center gap-3">
                        <Input
                                type="radio"
                                radioGroup="section"
                                radioId={i}
                                bind:value={setup.section}
                                class="w-min accent-indigo-500"
                        />
                        <span class="text-lg">{text}</span>
                    </div>
                {/each}
                <a href="/everything" class="text-gray-300 hover:underline text-sm">Just show me everything.</a>
            </div>
        {/if}

        <!-- Step 3: Topics & Subtopics -->
        {#if currentStep === 3}
            <div class="space-y-4 bg-gray-800 rounded-lg p-6 shadow-md" transition:slide>
                <div class="text-2xl font-bold">Choose Topics & Subtopics</div>
                <div class="text-gray-300">Focus on the section and topics you want to work on.</div>

                {#if typeof setup.section === 'number'}
                    <div class="max-h-60 overflow-y-auto space-y-3 mt-4">
                        <!--// @ts-ignore -->
                        {#each (Object.values(lookup.lookupData.domain)[setup.section]) as topic}
                            <div class="flex flex-col space-y-2">
                                {#if topic.skill}
                                    <Collapsible
                                            title={topic.text}
                                            description={`${topic.skill.filter(s => setup.subtopics[s.id]).length}/${topic.skill.length} selected`}
                                    >
                                        {#snippet shelf()}
                                            <Button transparent class="-mt-2.5" onclick={() => {
                                                let reset = true;
                                                for (let skill of topic.skill) {
                                                    if (!setup.subtopics[skill.id]) reset = false;
                                                    setup.subtopics[skill.id] = true;
                                                }
                                                if (reset) {
                                                    for (let skill of topic.skill) {
                                                        if (!setup.subtopics[skill.id]) reset = false;
                                                        setup.subtopics[skill.id] = false;
                                                    }
                                                }
                                            }}>
                                                select/reset
                                            </Button>
                                        {/snippet}
                                        {#each topic.skill as skill}
                                            <div class="flex items-center gap-3 ml-4">
                                                <Input
                                                        type="checkbox"
                                                        bind:value={setup.subtopics[skill.id]}
                                                        class="w-min accent-indigo-500"
                                                />
                                                <span class="text-base">{skill.text}</span>
                                            </div>
                                        {/each}
                                    </Collapsible>
                                {/if}
                            </div>
                        {/each}
                    </div>

                    <div class="flex items-center gap-3 mt-4">
                        <Input
                                type="checkbox"
                                bind:value={setup.ignoreLive}
                                class="w-min accent-indigo-500"
                        />
                        <span class="text-lg">Do not show problems that are already in Bluebook® Practice tests.</span>
                    </div>

                {:else}
                    <div class="text-gray-400 mt-4 italic">Please choose a section first.</div>
                {/if}
                <a href="/everything" class="text-gray-300 hover:underline text-sm">Just show me everything.</a>
            </div>
        {/if}

        <!-- Step 4: Review -->
        {#if currentStep === 4}
            <div class="space-y-4 bg-gray-800 rounded-lg p-6 shadow-md" transition:slide>
                <div class="text-2xl font-bold">Review & Confirm</div>

                <div class="space-y-2">
                    <p><span class="font-semibold">Exam:</span>
                        {setup.test !== null ? lookup.lookupData.assessment[setup.test].text : '—'
                        }
                    </p>
                    <p><span class="font-semibold">Section:</span>
                        {setup.section !== null ? lookup.lookupData.test[setup.section].text : '—'}
                    </p>
                </div>

                <div>
                    <h3 class="font-semibold mt-4">Topics selected:</h3>
                    <ul class="list-disc list-inside ml-4">
                        {#each Object.entries(setup.topics).filter(([_, v]) => v) as [topicId, _]}
                            { "" /* @ts-ignore */ }
                            {@const topic = Object.values(lookup.lookupData.domain)[setup.section].find(t => parseInt(t.id) === parseInt(topicId))}
                            <li>
                                {
                                    topic.text
                                } ({topic.skill.filter(s => setup.subtopics[s.id]).length}/{topic.skill.length} selected)
                            </li>
                        {/each}
                    </ul>
                </div>

                <div class="mt-2">
                    <p><span class="font-semibold">Ignore questions that are in Bluebook® tests:</span> {setup.ignoreLive ? 'Yes' : 'No'}</p>
                </div>
                <a href="/everything" class="text-gray-300 hover:underline text-sm">Just show me everything.</a>
            </div>
        {/if}

        <!-- Navigation Buttons -->
        <div class="flex justify-between items-center mt-6">
            <Button
                    onclick={goPrev}
                    disabled={currentStep === 1}
            >
                Previous
            </Button>

            {#if currentStep < 4}
                <Button
                        onclick={goNext}
                        disabled={verifyNext}
                >
                    Next
                </Button>
            {:else}
                <Button
                        onclick={submit}
                >
                    I'm ready
                </Button>
            {/if}
        </div>

    </div>
</div>
