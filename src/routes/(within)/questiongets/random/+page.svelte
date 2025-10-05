<script lang="ts">
    import {onMount} from "svelte";
    import {goto} from "$app/navigation";
    import Bluebook from "$lib/components/platformspecific/Bluebook.svelte";
    import Dialog from "$lib/components/Dialog.svelte";
    import type {LookupData, Question, QuestionDetail, QuestionDetailMCQ} from "$lib/types/types";
    import { alert } from "$lib/components/Dialog.svelte"
    import {lookup, questions, selectedDetails} from "$lib/clientstate/states.svelte";
    import Input from "$lib/components/Input.svelte";
    import Button from "$lib/components/Button.svelte";
    import {slide} from "svelte/transition";
    import Spinner from "$lib/components/Spinner.svelte";
    import {loadMCQQuestionThroughJSON} from "$lib/helpers/loadjson";
    import { loadQuestion } from "$lib/helpers/loadend";

    let {
        data
    }: {
        data: {
            lookup: LookupData,
            questions: Promise<Question[]>
        }
    } = $props();

    let tries: number = $state()
    let ignoreViewed = $state()
    let maxStreak: number = $state()
    let currentStreak = $state(0)
    let timerInt: number = $state()
    let timer: string = $state()
    let timerHandler: ReturnType<typeof setTimeout> = $state()

    let currentQuestionNumberIndex: number = $state(-1)
    let currentQuestionNumber: number = $state(0)
    let currentQuestion: QuestionDetail = $state()
    let currentQuestionOutside: Question = $state()
    let selectedOption: number = $state()
    let decreased: boolean = $state(false)

    let timetogo: boolean = $state(false)

    let currentQuestionHistory: [QuestionDetail, Question, {
        correct: boolean,
        selected: string,
        timeInt: number
    }][] = $state([])

    function getRandomFromArray<T>(arr: Array<T>) {
        return arr[Math.floor(Math.random() * arr.length)]
    }
    const lookupData = $derived(Object.values(lookup.lookupData.domain)[selectedDetails.section])
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
            (!selectedDetails.ignoreLive || (!lookup.mathLiveItems.includes(question.external_id) && !lookup.readingLiveItems.includes(question.external_id)))
    }
    async function getNextQuestion() {
        let seenInSessions: string[];
        try {
            seenInSessions = JSON.parse(localStorage.getItem("seen"));
        } catch {
            seenInSessions = []
            console.warn("seenInSessions wasn't set to a value parsable by JSON... resetting.")
            localStorage.setItem("seen", JSON.stringify([]))
        }
        let bank: Question[] = (await questions[0])
            .filter(v => appliedFilters(v)) // fits the filters the user has applied
            .filter(v => !currentQuestionHistory.some(x => x[0].externalid === v.external_id) || !currentQuestionHistory.some(x => x[0].externalid === v.ibn)) // ignore seen questions
        console.log(bank)
        if (ignoreViewed) {
            bank = bank.filter(v => !seenInSessions.includes(v.external_id))
        }
        if (bank.length < 1) {
            await alert("Out of questions", "You have reached the end of your selected questions.")
            return
        }
        let random = getRandomFromArray(bank)
        let val = null;
        while (true) {
            val = loadQuestion(random);
            if (val === null) continue;
            currentQuestion = val
            break;
        }
        currentQuestionOutside = random
        currentQuestionNumber++;
        currentQuestionNumberIndex++;
        selectedOption = undefined
        decreased = false
        timerInt = 0
        timer = '0:00'
        timerHandler = setInterval(() => {
            timerInt++;
            timer = `${Math.floor(timerInt / 60)}:${timerInt % 60 < 10 ? '0' + (timerInt % 60).toString() : (timerInt % 60).toString()}`
        }, 1000)
    }
    async function submitHandler(): Promise<[boolean, number]> {
        let seenInSessions: string[];
        try {
            seenInSessions = JSON.parse(localStorage.getItem("seen"));
        } catch {
            seenInSessions = []
            console.warn("seenInSessions wasn't set to a value parsable by JSON... resetting.")
            localStorage.setItem("seen", JSON.stringify([]))
        }
        console.log(currentQuestion.keys, selectedOption)
        clearInterval(timerHandler)
        currentQuestionHistory.push([currentQuestion, currentQuestionOutside, {
            correct: currentQuestion.type === 'mcq' ?
                currentQuestion.keys.includes(currentQuestion.answerOptions[selectedOption].id) :
                currentQuestion.keys.includes(selectedOption.toString()),
            selected: currentQuestion.type === 'mcq' ?
                currentQuestion.answerOptions[selectedOption].id :
                selectedOption.toString(),
            timeInt: timerInt
        }])
        seenInSessions.push(currentQuestion.externalid)
        localStorage.setItem("seen", JSON.stringify(seenInSessions))
        if (currentQuestion.type === 'mcq' ?
            currentQuestion.keys.includes(currentQuestion.answerOptions[selectedOption].id) :
            currentQuestion.keys.includes(selectedOption.toString())) {
            currentStreak += 1
            if (maxStreak && currentStreak >= maxStreak)
                return [true, -1]
            return [true, 0]
        } else {
            decreased = true
            currentStreak = 0
            return [false, tries]
        }
    }
    async function exit() {
        timetogo = true
        clearTimeout(timerHandler)
    }


    onMount(() => {
        const urlParams = new URLSearchParams(window.location.search);
        tries = parseInt(urlParams.get("tries"))
        ignoreViewed = urlParams.get("ignoreViewed") || true
        maxStreak = isNaN(parseInt(urlParams.get("streak"))) ? 0 : parseInt(urlParams.get("streak"))

        if (isNaN(tries)) goto("/questiongets")

        getNextQuestion()

        return () => {
            clearInterval(timerHandler)
        }
    })

    let currentlyReviewing = $state(null)
    let currentlyReviewed = $derived(currentlyReviewing !== null && currentlyReviewing + 1)
    let currentlyTimered = $derived(`${Math.floor(currentQuestionHistory[currentlyReviewing][2].timeInt / 60)}:${currentQuestionHistory[currentlyReviewing][2].timeInt % 60 < 10 ? '0' + (currentQuestionHistory[currentlyReviewing][2].timeInt % 60).toString() : (currentQuestionHistory[currentlyReviewing][2].timeInt % 60).toString()}`)
    let currentlySelectedHistory = $derived(
        currentQuestionHistory[currentlyReviewing][0].type === 'mcq' ?
        (currentQuestionHistory[currentlyReviewing][0] as QuestionDetailMCQ).answerOptions.findIndex(v => v.id === currentQuestionHistory[currentlyReviewing][2].selected) :
            currentQuestionHistory[currentlyReviewing][2].selected
    )
</script>

{#if timetogo}
    {#if currentlyReviewing !== null}
        <div class="z-10000" transition:slide|global>
            <Bluebook
                    bind:timer={currentlyTimered}
                    bind:question={currentQuestionHistory[currentlyReviewing][0]}
                    bind:questionOutside={currentQuestionHistory[currentlyReviewing][1]}
                    bind:currentQuestionNumber={currentlyReviewing}
                    bind:currentQuestionNumberShow={currentlyReviewed}
                    previousQuestionHandler={() => null}
                    nextQuestionHandler={() => null}
                    questionShouldBeReviewed={null}
                    bind:selectedOption={currentlySelectedHistory}
                    submitHandler={() => null}
                    exitHandler={() => null}
                    total={null}
                    history={{
                        selected: currentQuestionHistory[currentlyReviewing][2].selected,
                        exit: () => currentlyReviewing = null
                    }}
                    status={null}
            />
        </div>
    {:else}
        <div class="flex flex-col w-screen h-screen items-center justify-center bg-neutral-900/50 backdrop-blur-sm p-10 bg-opacity-50 text-white min-h-screen">
            <div class="max-w-3xl mx-auto w-full space-y-8">
                <div class="flex flex-col items-center gap-5">
                    <div class="font-bold font-sans">
                        <a href="/" class="hover:underline">QuestionableSAT</a>
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
                    <div class="text-2xl font-bold">
                        Nice going! Finished your practice session.
                    </div>
                    <div class="text-gray-300">
                        You answered <b>{currentQuestionHistory.length} questions</b> and got <b>{currentQuestionHistory.filter(v => v[2].correct).length} correct</b>
                    </div>
                    <div class="max-h-96 overflow-y-scroll w-full">
                        <table class="pt-4 w-full">
                            <thead>
                            <tr class="">
                                <td>#</td>
                                <td>Class</td>
                                <td>Skill</td>
                                <td>Difficulty</td>
                                <td>Result</td>
                                <td>Time taken</td>
                            </tr>
                            </thead>
                            <tbody>
                            {#each currentQuestionHistory as [_, data, {correct, timeInt}], i}
                                <tr class="hover:bg-blue-800/50 active:bg-blue-700/50 transition-colors cursor-pointer" onclick={() => currentlyReviewing = i} aria-roledescription="Review question">
                                    <td>{i + 1}</td>
                                    <td>{data.primary_class_cd_desc}</td>
                                    <td>{data.skill_desc}</td>
                                    <td>{data.difficulty === 'E' ? 'Easy' : data.difficulty === 'M' ? 'Medium' : "Hard"}</td>
                                    <td>{correct ? '✅' : '❌'}</td>
                                    <td>{`${Math.floor(timeInt / 60)}:${timeInt % 60 < 10 ? '0' + (timeInt % 60).toString() : (timeInt % 60).toString()}`}</td>
                                </tr>
                            {/each}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div class="flex justify-between items-center mt-6">
                    <Button onclick={() => goto("/")}>Exit</Button>
                    <Button onclick={() => goto("/topics")}>Try something else</Button>
                </div>

            </div>
        </div>
    {/if}
{:else}
    {#if currentQuestion}
        <div transition:slide|global class="z-10000">
            <Bluebook
                    bind:timer
                    bind:question={currentQuestion}
                    bind:questionOutside={currentQuestionOutside}
                    bind:currentQuestionNumberShow={currentQuestionNumber}
                    nextQuestionHandler={getNextQuestion}
                    bind:selectedOption
                    {submitHandler}
                    exitHandler={exit}
                    total={null}
                    history={null}
                    status={null}
                    questionShouldBeReviewed={null}
                    bind:currentQuestionNumber={currentQuestionNumberIndex}
                    previousQuestionHandler={() => null}
            />
        </div>
    {:else}
        <Dialog open={true} title="Getting your first question..." loading />
    {/if}
{/if}
