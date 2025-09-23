<script lang="ts">
    import Dialog, {wait} from "$lib/components/Dialog.svelte";
    import {onMount} from "svelte";
    import Spinner from "$lib/components/Spinner.svelte";
    import type {LookupData, Question} from "$lib/types/types";
    import {selectedDetails} from "$lib/clientstate/states.svelte";
    import Input from "$lib/components/Input.svelte";
    import {slide} from "svelte/transition";
    import Button from "$lib/components/Button.svelte";
    import {goto} from "$app/navigation";
    import Collapsible from "$lib/components/Collapsible.svelte";

    let {
        data
    }: {
        data: {
            lookup: LookupData,
            questions: Promise<Question[]>
        }
    } = $props();

    onMount(() => {
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

    let startDiff: number = $state(1)
    let maxTries = $state(0)
    let hideQuestions = $state(true)
    let answerNumber: string = $state('15')
    const lookAt = $derived(answerNumber === null || !isNaN(parseInt(answerNumber)))
    let viewedQuestions = $derived.by(() => {
        let seenInSessions: string[];
        try {
            seenInSessions = JSON.parse(localStorage.getItem("seen"));
            if (seenInSessions === null) throw new Error()
        } catch {
            seenInSessions = []
            console.warn("seenInSessions wasn't set to a value parsable by JSON... resetting.")
            localStorage.setItem("seen", JSON.stringify([]))
        }
        return seenInSessions
    })

    let openResetDialog = $state(false);
    let maxQuestions = $state("20");
    const lookAtQ = $derived(maxQuestions === null || !isNaN(parseInt(maxQuestions)))
    let time = $state("30");
    const lookAtT = $derived(time === null || !isNaN(parseInt(time)))
    const continu = async () => {
        if (value === -1)
            await goto(`/questiongets/khanstyle?start=${['e','m','h'][startDiff]}&tries=${maxTries}&ignoreViewed=${hideQuestions}&streak=${answerNumber}`)
        else if (value === 1) {
            console.log(time, parseInt(time), parseInt(time) * 60)
            await goto(`/questiongets/practicetest?questions=${parseInt(maxQuestions)}&time=${parseInt(time) * 60}&ignoreViewed=${hideQuestions}`)
        }
    }
</script>

<div class="flex flex-col w-screen h-screen items-center justify-center bg-neutral-900/50 backdrop-blur-sm p-10 bg-opacity-50 text-white min-h-screen">
    <div class="max-w-3xl mx-auto w-full space-y-8">
        <div class="flex flex-col items-center gap-5">
            <div class="font-bold font-sans">
                QuestionableSAT
            </div>
            <div class="flex justify-between items-center w-full">
                <div class="flex-1 text-center">
                    <div class="text-xl font-bold opacity-50">1. Exam</div>
                </div>
                <div class="flex-1 text-center">
                    <div class="text-xl font-bold opacity-50">2. Section</div>
                </div>
                <div class="flex-1 text-center">
                    <div class="text-xl font-bold opacity-50">3. Topics</div>
                </div>
                <div class="flex-1 text-center">
                    <div class="text-xl font-bold opacity-50">4. Review</div>
                </div>
                <div class="flex-1 text-center">
                    <div class="text-xl font-bold">5. Start</div>
                </div>
            </div>
        </div>

        <div class="space-y-2 bg-gray-800 rounded-lg p-6 shadow-md" transition:slide={{duration: 50}}>
            {#await data.questions}
                <div class="flex flex-row gap-2 p-5 items-center justify-center">
                    <Spinner/>
                    <div>Loading your questions. This may take a while.</div>
                </div>
            {:then questions}
                {@const filtered = questions.filter(v => appliedFilters(v))}
                <div class="text-2xl font-bold">Start your test</div>
                <div class="text-gray-300">
                    You have {filtered.length} questions available to go through right now,
                    out of which
                    <button class="underline cursor-pointer" onclick={async () => openResetDialog = true}>you have
                        viewed {viewedQuestions.filter(v => questions.some(x => x.external_id === v || x.ibn === v)).length + '.'}
                    </button>
                </div>
                <div class="pt-0">
                    Preparation doesn't just have to be exactly like a test. You should choose the best way to prepare
                    that'll
                    help you master the skill you're having trouble with.
                </div>
                <div class="flex flex-row justify-center items-center px-1 gap-2">
                    <Input type="radio" radioGroup="testType" radioId={-1} class="w-min" bind:value/>
                    <div class="w-full">Answer questions that get progressively harder as you answer correctly.</div>
                </div>
                <div class="flex flex-row justify-center items-center px-1 gap-2">
                    <Input type="radio" radioGroup="testType" radioId={1} class="w-min" bind:value/>
                    <div class="w-full">Answer a fixed amount of questions similar to (but not) a practice test.</div>
                </div>
                {#if value === -1}
                    <div class="flex flex-col" transition:slide>
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
                                    name="Maximum streak before finishing session"
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
                                    name="Maximum tries to answer a question before showing the answer"
                                    type="dropdown"
                                    elements={["None", 1, 2, 3]}
                            />
                        </div>
                        <div class="flex flex-row justify-center items-center px-1 gap-2">
                            <Input
                                    bind:value={hideQuestions}
                                    type="checkbox"
                                    class="flex flex-row w-min"
                            />
                            <div class="w-full">Hide questions that have been seen in other sessions.</div>
                        </div>
                    </div>
                {:else if value === 1}
                    <div class="flex flex-col" transition:slide>
                        <div class="flex flex-col justify-center -my-1">
                            <Input
                                    bind:value={maxQuestions}
                                    name="Amount of questions"
                                    type="text"
                            />
                            {#if !lookAtQ}
                                <div class="text-red-500 pl-1 -mt-2">
                                    Must be a number
                                </div>
                            {/if}
                        </div>
                        <div class="flex flex-col justify-center -my-1">
                            <Input
                                    bind:value={time}
                                    name="Minutes the test should take"
                                    type="text"
                            />
                            {#if !lookAtT}
                                <div class="text-red-500 pl-1 -mt-2">
                                    Must be a number
                                </div>
                            {/if}
                        </div>
                        <div class="flex flex-row justify-center items-center px-1 gap-2">
                            <Input
                                    bind:value={hideQuestions}
                                    type="checkbox"
                                    class="flex flex-row w-min"
                            />
                            <div class="w-full">Hide questions that have been seen in other sessions.</div>
                        </div>
                    </div>
                {/if}
            {/await}
        </div>

        <!-- Navigation Buttons -->
        <div class="flex justify-between items-center mt-6">
            <Button
                    onclick={() => goto(`/topics?left=3`)}
            >
                Previous
            </Button>

            <Button
                    disabled={!lookAt}
                    onclick={() => continu()}
            >
                I'm ready
            </Button>
        </div>

    </div>
</div>

<Dialog actions={[{name: "Close", close: true, action() {openResetDialog = false}}]} open={openResetDialog}
        title="Your seen questions" description="You have seen {viewedQuestions.length} questions in total.">
    <div>
        QuestionableSAT keeps track of the questions you view, so you can practice with unique questions each time. You
        can disable this setting, or reset the questions you've seen if you want to start with a blank slate.
    </div>
    <div class="py-2">
        <Button onclick={() => (localStorage.setItem("seen", JSON.stringify([])), viewedQuestions = [])}>
            Reset all seen questions
        </Button>
    </div>
</Dialog>