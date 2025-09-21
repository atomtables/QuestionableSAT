<script lang="ts">
    import bookmarked from "$lib/assets/bookmarked.svg"
    import {onMount} from "svelte";
    import {goto} from "$app/navigation";
    import Bluebook from "$lib/components/platformspecific/Bluebook.svelte";
    import Dialog from "$lib/components/Dialog.svelte";
    import type {LookupData, Question, QuestionDetail, QuestionDetailMCQ} from "$lib/types/types";
    import { alert } from "$lib/components/Dialog.svelte"
    import {selectedDetails} from "$lib/clientstate/states.svelte";
    import Input from "$lib/components/Input.svelte";
    import Button from "$lib/components/Button.svelte";
    import {slide} from "svelte/transition";
    import Spinner from "$lib/components/Spinner.svelte";
    import {loadMCQQuestionThroughJSON} from "$lib/helpers/loadjson";

    let {
        data
    }: {
        data: {
            lookup: LookupData,
            questions: Promise<Question[]>
        }
    } = $props();

    let amtQuestions: number = $state()
    let amtTime = $state(0)
    let ignoreViewed = $state(false)

    let questions: [Question, QuestionDetail, {
        selected: string,
        review: boolean
    }][] = $state([])
    let currentQuestionIndex = $state(0)
    let currentQuestionIndexForDisplay = $derived(currentQuestionIndex + 1)
    let currentQuestion: [Question,QuestionDetail,{selected:string, review:boolean}] =
        $derived(currentQuestionIndex !== -1 ? ((currentQuestionIndex < questions.length) ? questions[currentQuestionIndex] : null) : [null, null, {selected: null,review:false}])
    let timetogo = $state(false)
    let fake = $derived(null)

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
    async function getQuestion(loadedQuestions: string[]): Promise<[Question, QuestionDetail]> {
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
            .filter(v => !loadedQuestions.some(x => x === v.external_id || x === v.ibn))
        if (ignoreViewed) {
            bank = bank.filter(v => !seenInSessions.includes(v.external_id))
        }
        if (bank.length < 1) {
            await alert("Out of questions", "You have reached the end of your selected questions.")
            return
        }
        let random: Question = getRandomFromArray(bank)
        let val: QuestionDetail = null;
        while (true) {
            let res = await fetch("https://qbank-api.collegeboard.org/msreportingquestionbank-prod/questionbank/digital/get-question", {
                credentials: "omit",
                headers: {
                    "Accept": "application/json, text/plain, */*",
                    "Accept-Language": "en-US,en;q=0.5",
                    "Content-Type": "application/json",
                },
                referrer: "https://satsuitequestionbank.collegeboard.org/",
                body: JSON.stringify({
                    external_id: random.external_id
                }),
                method: "POST",
                mode: "cors"
            })
            val = await (res).json()
            if (!res.ok || val.type === undefined) {
                // maybe we need to load in via json
                if (random.ibn) {
                    val = await loadMCQQuestionThroughJSON(random.ibn)
                    if (val === null) {
                        bank = bank.filter(v => v.uId !== random.uId)
                        random = getRandomFromArray(bank)
                        continue
                    }
                }
            }
            if (random === null || val === null) continue;
            return [random, val]
        }
    }
    async function getQuestions() {
        let loadedQuestions: string[] = []
        for (let i = 0; i < amtQuestions; i++) {
            let res = getQuestion(loadedQuestions)
            res.then(res => {
                questions.push([...res, {
                    selected: "",
                    review: false
                }])
                loadedQuestions.push(questions.at(-1)[0].external_id)
            })
        }
    }
    async function nextQuestion() {
        if (currentQuestionIndexForDisplay === amtQuestions) {
            currentQuestionIndex = -1
        } else {
            currentQuestionIndex++;
        }
    }
    async function prevQuestion() {
        if (currentQuestionIndex === -1) {
            currentQuestionIndex = amtQuestions - 1
        } else {
            currentQuestionIndex--;
        }
    }

    let currentQuestionHistory: [QuestionDetail, Question, {
        correct: boolean,
        selected: string,
        reviewed: boolean
    }][] = $state([])
    async function submitHandler() {
        for (let [dat, question, {selected, review}] of questions) {
            console.log(dat, question, selected, review)
            currentQuestionHistory.push([
                question, dat, {
                    correct: question.type === 'mcq' ? question.keys.includes(question.answerOptions[selected]?.id || null) : question.keys.includes(selected),
                    selected: question.type === 'mcq' ? question.answerOptions[selected]?.id : selected,
                    reviewed: review
                }
            ])
        }
        timetogo = true;
        clearInterval(timerHandler)
    }

    let timerInt: number = $state()
    let timer: string = $state()
    let timerHandler: number = $state()

    onMount(() => {
        const urlParams = new URLSearchParams(window.location.search);
        amtQuestions = parseInt(urlParams.get("questions"))
        amtTime = parseInt(urlParams.get("time"))
        ignoreViewed = !!(urlParams.get("ignoreViewed")) || true

        if (isNaN(amtQuestions) || isNaN(amtTime)) goto("/questiongets")

        timerInt = amtTime
        timer = `${amtTime}:00`
        timerHandler = setInterval(() => {
            timerInt--;
            timer = `${Math.floor(timerInt / 60)}:${timerInt % 60 < 10 ? '0' + (timerInt % 60).toString() : (timerInt % 60).toString()}`
            if (timerInt === -1) {
                submitHandler();
            }
        }, 1000)

        if (questions.length < 1) getQuestions();

        return () => {
            clearInterval(timerHandler)
        }
    })
    let currentlyReviewing = $state(null)
    let currentlyReviewed = $derived(currentlyReviewing !== null && currentlyReviewing + 1)
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
                    timer={null}
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
            />
        </div>
    {:else}
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
                                <td>Marked?</td>
                            </tr>
                            </thead>
                            <tbody>
                            {#each currentQuestionHistory as [_, data, {correct, reviewed}], i}
                                <tr class="hover:bg-blue-800/50 active:bg-blue-700/50 transition-colors cursor-pointer" onclick={() => currentlyReviewing = i} aria-roledescription="Review question">
                                    <td>{i + 1}</td>
                                    <td>{data.primary_class_cd_desc}</td>
                                    <td>{data.skill_desc}</td>
                                    <td>{data.difficulty === 'E' ? 'Easy' : data.difficulty === 'M' ? 'Medium' : "Hard"}</td>
                                    <td>{correct ? '✅' : '❌'}</td>
                                    <td>{#if reviewed}Bookmarked{/if}</td>
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
    {#if (questions.length === amtQuestions && currentQuestion) || currentQuestionIndex === -1}
        <div transition:slide|global class="z-10000">
            <Bluebook
                    bind:timer={timer}
                    bind:question={currentQuestion[1]}
                    bind:questionOutside={currentQuestion[0]}
                    bind:currentQuestionNumberShow={currentQuestionIndexForDisplay}
                    previousQuestionHandler={prevQuestion}
                    nextQuestionHandler={nextQuestion}
                    bind:currentQuestionNumber={currentQuestionIndex}
                    bind:selectedOption={currentQuestion[2].selected}
                    {submitHandler}
                    exitHandler={() => null}
                    bind:questionShouldBeReviewed={currentQuestion[2].review}
                    total={amtQuestions}
                    history={null}
                    bind:status={fake}
            >
                {#snippet overviewSnippet()}
                    <div class="max-w-4xl flex flex-col items-center justify-center m-auto">
                        <h2 class="text-4xl font-bold font-sans">Questions and Answers</h2>
                        <div class="grid grid-cols-8">
                            {#each questions as [_, __, {selected, review}], i}
                                <button onclick={() => currentQuestionIndex = i}
                                        class="relative cursor-pointer w-14 h-14 text-3xl font-bold font-sans flex items-center justify-center {isNaN(parseInt(selected)) ? 'border-dashed border-2 border-black text-black hover:bg-blue-100' : 'bg-blue-900 text-white'}  m-3">
                                    {i+1}
                                    {#if review}
                                        <img src={bookmarked} alt="bookmarked" class="bg-white h-6 absolute -right-2 -top-2">
                                    {/if}
                                </button>
                            {/each}
                        </div>
                    </div>
                {/snippet}
                {#snippet miniOverviewSnippet()}
                    <div class="text-2xl font-bold pt-5">Questions and Answers</div>
                    <div class="grid grid-cols-8 w-full gap-2 p-5">
                        {#each questions as [_, __, {selected, review}], i}
                            <button onclick={() => currentQuestionIndex = i}
                                    class="relative cursor-pointer w-8 h-8 text-base font-bold font-sans flex items-center justify-center {currentQuestionIndex === i && 'bg-blue-200'} {isNaN(parseInt(selected)) ? 'border-dashed border-2 border-black text-blue-900 hover:bg-blue-100' : 'bg-blue-900 !text-white'}">
                                {i+1}
                                {#if review}
                                    <img src={bookmarked} alt="bookmarked" class="bg-white h-4 absolute -right-1 -top-1">
                                {/if}
                            </button>
                        {/each}
                    </div>
                    <div class="pb-5">
                        <Button resetStyling class="border-blue-700 border-2 text-blue-700 hover:text-white hover:bg-blue-600 active:bg-blue-500 cursor-pointer transition-colors font-bold px-3 rounded-full py-1" onclick={() => currentQuestionIndex = -1}>
                            Go to Review Page
                        </Button>
                    </div>
                {/snippet}
            </Bluebook>
        </div>
    {:else}
        <Dialog open={true} title="Getting your first question..." loading />
    {/if}
{/if}