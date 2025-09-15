<script lang="ts">
    import {onMount} from "svelte";
    import {goto} from "$app/navigation";
    import Bluebook from "$lib/components/platformspecific/Bluebook.svelte";
    import Dialog from "$lib/components/Dialog.svelte";
    import type {LookupData, Question, QuestionDetail} from "$lib/types/types";
    import { alert } from "$lib/components/Dialog.svelte"
    import {selectedDetails} from "$lib/clientstate/states.svelte";
    import Input from "$lib/components/Input.svelte";
    import Button from "$lib/components/Button.svelte";
    import {slide} from "svelte/transition";
    import Spinner from "$lib/components/Spinner.svelte";

    let {
        data
    }: {
        data: {
            lookup: LookupData,
            questions: Promise<Question[]>
        }
    } = $props();

    let start = $state()
    let tries: number = $state()
    let ignoreViewed = $state()
    let maxStreak: number = $state()
    let currentStreak = $state(0)
    let timerInt: number = $state()
    let timer: string = $state()
    let timerHandler: number = $state()

    let currentScoreTarget: number = $state()
    let currentQuestionNumber: number = $state(0)
    let currentQuestion: QuestionDetail = $state()
    let currentQuestionOutside: Question = $state()
    let selectedOption: number = $state()
    let scoreTargetIncrease: number = $state()
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
    async function getNextQuestion() {
        // filter by matching score target
        let seenInSessions: string[];
        try {
            seenInSessions = JSON.parse(localStorage.getItem("seen"));
        } catch {
            seenInSessions = []
            console.warn("seenInSessions wasn't set to a value parsable by JSON... resetting.")
            localStorage.setItem("seen", JSON.stringify([]))
        }
        let bank: Question[] = (await data.questions)
            .filter(v => appliedFilters(v)) // fits the filters the user has applied
            .filter(v => v.score_band_range_cd < currentScoreTarget + 1.5 && v.score_band_range_cd > currentScoreTarget - 1.5) // within score range
            .filter(v => !currentQuestionHistory.some(x => x[0].externalid === v.external_id)) // ignore seen questions
        if (ignoreViewed) {
            bank = bank.filter(v => !seenInSessions.includes(v.external_id))
        }
        if (bank.length < 1) {
            await alert("Out of questions", "You have reached the end of your selected questions.")
        }
        let random = getRandomFromArray(bank)
        let val = null;
        while (true) {
            console.log(random.external_id)
            val = await (await fetch(`/get/question?id=${random.external_id}`)).json()
            if (val?.type !== 'mcq') { // no support for gridins
                random = getRandomFromArray(bank)
                continue
            };
            currentQuestion = val
            break;
        }
        currentQuestionOutside = random
        currentQuestionNumber++;
        selectedOption = undefined
        scoreTargetIncrease = random.score_band_range_cd / 20
        decreased = false
        timerInt = 0
        timer = '0:00'
        timerHandler = setInterval(() => {
            timerInt++;
            timer = `${Math.floor(timerInt / 60)}:${timerInt % 60 < 10 ? '0' + (timerInt % 60).toString() : (timerInt % 60).toString()}`
        }, 1000)
        seenInSessions.push(currentQuestion.externalid)
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
        clearInterval(timerHandler)
        currentQuestionHistory.push([currentQuestion, currentQuestionOutside, {
            correct: currentQuestion.keys.includes(currentQuestion.answerOptions[selectedOption].id),
            selected: currentQuestion.answerOptions[selectedOption].id,
            timeInt: timerInt
        }])
        if (currentQuestion.keys.includes(currentQuestion.answerOptions[selectedOption].id)) {
            currentScoreTarget += scoreTargetIncrease
            currentStreak += 1
            if (maxStreak && currentStreak >= maxStreak)
                return [true, -1]
            return [true, 0]
        } else {
            if (!decreased) currentScoreTarget -= scoreTargetIncrease
            decreased = true
            currentStreak = 0
            return [false, tries]
        }
        localStorage.setItem("seen", JSON.stringify(seenInSessions))
    }
    async function exit() {
        timetogo = true
        clearTimeout(timerHandler)
    }

    onMount(() => {
        const urlParams = new URLSearchParams(window.location.search);
        start = urlParams.get("start")
        tries = parseInt(urlParams.get("tries"))
        ignoreViewed = urlParams.get("ignoreViewed") || true
        maxStreak = isNaN(parseInt(urlParams.get("streak"))) ? 0 : parseInt(urlParams.get("streak"))

        if (!start || isNaN(tries)) goto("/questiongets")

        if (start === 'e') {
            currentScoreTarget = 3.0
        } else if (start === 'm') {
            currentScoreTarget = 5.0
        } else if (start === 'h') {
            currentScoreTarget = 7.0
        }

        getNextQuestion()
    })

    let currentlyReviewing = $state(null)
    let currentlyReviewed = $derived(currentlyReviewing !== null && currentlyReviewing + 1)
    let currentlyTimered = $derived(`${Math.floor(currentQuestionHistory[currentlyReviewing][2].timeInt / 60)}:${currentQuestionHistory[currentlyReviewing][2].timeInt % 60 < 10 ? '0' + (currentQuestionHistory[currentlyReviewing][2].timeInt % 60).toString() : (currentQuestionHistory[currentlyReviewing][2].timeInt % 60).toString()}`)
    let currentlySelectedHistory = $derived(currentQuestionHistory[currentlyReviewing][0].answerOptions.findIndex(v => v.id === currentQuestionHistory[currentlyReviewing][2].selected))
</script>

{#if timetogo}
    {#if currentlyReviewing !== null}
        <div class="z-10000" transition:slide|global>
            <Bluebook
                    bind:timer={currentlyTimered}
                    bind:question={currentQuestionHistory[currentlyReviewing][0]}
                    bind:questionOutside={currentQuestionHistory[currentlyReviewing][1]}
                    bind:currentQuestionNumber={currentlyReviewed}
                    nextQuestionHandler={() => null}
                    bind:selectedOption={currentlySelectedHistory}
                    submitHandler={() => null}
                    exitHandler={() => null}
                    total={null}
                    history={{
                selected: currentQuestionHistory[currentlyReviewing][2].selected,
                exit: () => currentlyReviewing = null
            }}
            />
        </div>
    {:else}
        <div class="w-screen h-screen flex flex-col items-center justify-center backdrop-blur-2xl bg-neutral-900/50 text-white" transition:slide|global>
            <div class="flex flex-col p-5 gap-2 m-5 w-2/3 backdrop-blur-2xl bg-blue-700/50">
                <div class="text-4xl font-bold">
                    Nice going! Finished your practice session.
                </div>
                <div>
                    You answered <b>{currentQuestionHistory.length} questions</b> and got <b>{currentQuestionHistory.filter(v => v[2].correct).length} correct</b>
                </div>
                <table class="pt-4 max-h-96 overflow-y-auto">
                    <thead>
                        <tr class="">
                            <td>#</td>
                            <td>Class</td>
                            <td>Skill</td>
                            <td>Difficulty</td>
                            <td>Correct</td>
                            <td>Time taken</td>
                        </tr>
                    </thead>
                    <tbody>
                        {#each currentQuestionHistory as [_, data, {correct, timeInt}], i}
                            <tr class="hover:bg-blue-800 active:bg-blue-700 transition-colors cursor-pointer" onclick={() => currentlyReviewing = i} aria-roledescription="Review question">
                                <td>{i + 1}</td>
                                <td>{data.primary_class_cd_desc}</td>
                                <td>{data.skill_desc}</td>
                                <td>{data.difficulty === 'E' ? 'Easy' : data.difficulty === 'M' ? 'Medium' : "Hard"}</td>
                                <td>{correct ? 'Correct' : 'Incorrect'}</td>
                                <td>{`${Math.floor(timeInt / 60)}:${timeInt % 60 < 10 ? '0' + (timeInt % 60).toString() : (timeInt % 60).toString()}`}</td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
                <div>
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
                    bind:currentQuestionNumber
                    nextQuestionHandler={getNextQuestion}
                    bind:selectedOption
                    {submitHandler}
                    exitHandler={exit}
                    total={null}
                    history={null}
            />
        </div>
    {:else}
        <Dialog open={true} title="Loading it in..." loading />
    {/if}
{/if}
