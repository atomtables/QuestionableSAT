<script lang="ts">
    import { wait } from "$lib/components/Dialog.svelte";
    import {onMount} from "svelte";
    import Spinner from "$lib/components/Spinner.svelte";
    import type {LookupData, Question} from "$lib/types/types";
    import {selectedDetails} from "$lib/clientstate/states.svelte";
    import Input from "$lib/components/Input.svelte";
    import { slide } from "svelte/transition";
    import Button from "$lib/components/Button.svelte";
    import {goto} from "$app/navigation";

    let {
        data
    }: {
        data: {
            lookup: LookupData,
            questions: Promise<Question[]>
        }
    } = $props();

    onMount(() => {
        wait(data.questions, "Loading in questions...", "This shouldn't take too long.")
    })
    const lookupData = $derived(Object.values(data.lookup.lookupData.domain)[selectedDetails.section])
    const appliedFilters = (question: Question) => {
        let skillsInSelectedSection = []
        for (let topic of lookupData) for (let skill of topic.skill) skillsInSelectedSection.push(skill)
        let selectedSubtopics = []
        for (let [id, selected] of Object.entries(selectedDetails.subtopics)) if (selected) selectedSubtopics.push(id)
        skillsInSelectedSection = skillsInSelectedSection.filter(v => selectedSubtopics.includes(v.id))

        let classesInSelectedSection = []
        for (let topic of lookupData) classesInSelectedSection.push(topic)
        let selectedClasses = []
        for (let [id, selected] of Object.entries(selectedDetails.topics)) if (selected) selectedClasses.push(id)
        classesInSelectedSection = classesInSelectedSection.filter(v => selectedClasses.some(x => x === v.id))

        return classesInSelectedSection.some(v => v.primaryClassCd === question.primary_class_cd) &&
            skillsInSelectedSection.some(v => v.text === question.skill_desc) &&
            (!selectedDetails.ignoreLive || (!data.lookup.mathLiveItems.includes(question.external_id) && !data.lookup.readingLiveItems.includes(question.external_id)))
    }
    let value = $state(0)

    let startDiff: number = $state()
    let maxTries = $state()
    let hideQuestions = $state(true)
    let answerNumber: string = $state('')
    const lookAt = $derived(answerNumber === null || !isNaN(parseInt(answerNumber)))
</script>
<div class="w-screen h-screen flex flex-col items-center justify-center backdrop-blur-2xl bg-neutral-900/50 text-white">
    {#await data.questions}
        <Spinner/>
    {:then questions}
        {@const filtered = questions.filter(v => appliedFilters(v))}
        <div class="flex flex-col p-5 gap-2 m-5 w-2/3 backdrop-blur-2xl bg-blue-700/50">
            <div class="text-4xl font-bold">
                Good choice! Loaded your questions.
            </div>
            <div>
                You have {filtered.length} questions available to go through right now,
                out of which you have viewed 0.
            </div>
            <div class="pt-4">
                Preparation doesn't just have to be exactly like a test. You should choose the best way to prepare that'll
                help you master the skill you're having trouble with.
            </div>
            <div class="flex flex-col py-2">
                <div class="text-2xl pb-2">
                    Select your preferred method of preparation
                </div>
                <div class="flex flex-row justify-center items-center gap-2">
                    <Input
                            bind:value
                            radioId={0}
                            type="radio"
                            class="flex flex-row w-min"
                    />
                    <div class="w-full">Answer questions one-by-one, getting progressively harder as you continue (recommended for specific topic practice)</div>
                </div>
                <div class="flex flex-row justify-center items-center gap-2">
                    <Input
                            bind:value
                            radioId={1}
                            type="radio"
                            class="flex flex-row w-min"
                    />
                    <div class="w-full">View random questions from your selected set one-by-one (recommended for general/unspecific question sets)</div>
                </div>
                <div class="flex flex-row justify-center items-center gap-2">
                    <Input
                            bind:value
                            radioId={2}
                            type="radio"
                            class="flex flex-row w-min"
                    />
                    <div class="w-full">View a set amount of questions at one time, going back and forth similar to a practice test.</div>
                </div>
            </div>
            {#if value === 0}
                <div class="flex flex-col bg-neutral-800/50 backdrop-blur-2xl p-2" transition:slide>
                    <div class="text-2xl font-bold pb-2">
                        Additional settings
                    </div>
                    <div class="flex flex-row justify-center items-center -my-1">
                        <Input
                                bind:value={startDiff}
                                name="Starting Difficulty"
                                type="dropdown"
                                elements={["Easy", "Medium", "Hard"]}
                        />
                    </div>
                    <div class="flex flex-col justify-center -my-1">
                        <Input
                                bind:value={answerNumber}
                                name="Maximum amount of questions to correctly answer before finishing"
                                type="text"
                        />
                        {#if !lookAt}
                            <div class="text-red-500 pl-1 -mt-2">
                                Must be a number
                            </div>
                        {/if}
                    </div>
                    <div class="flex flex-row justify-center items-center -my-1">
                        <Input
                                bind:value={maxTries}
                                name="Allow up to _ tries before showing the right answer"
                                type="dropdown"
                                elements={[0, 1, 2, 3]}
                        />
                    </div>
                    <div class="flex flex-row justify-center items-center px-1 gap-2">
                        <Input
                                bind:value={hideQuestions}
                                type="checkbox"
                                class="flex flex-row w-min"
                        />
                        <div class="w-full">Hide questions that have already previously been viewed.</div>
                    </div>
                </div>
            {/if}
            <Button disabled={!lookAt} onclick={() => goto(`/questiongets/khanstyle?start=${['e','m','h'][startDiff]}&tries=${maxTries}&ignoreViewed=${hideQuestions}&streak=${answerNumber}`)}>Let's do this!</Button>
        </div>
    {/await}
</div>
