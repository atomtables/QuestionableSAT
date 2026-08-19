<script lang="ts">
    import {onMount} from "svelte";
    import {goto} from "$app/navigation";
    import Bluebook from "$lib/components/platformspecific/Bluebook.svelte";
    import Dialog from "$lib/components/Dialog.svelte";
    import type {LookupData, Question, QuestionDetail, QuestionDetailMCQ} from "$lib/types/types";
    import { alert } from "$lib/components/Dialog.svelte"
    import {lookup, questions, selectedDetails} from "$lib/clientstate/states.svelte";
    import Button from "$lib/components/Button.svelte";
    import {slide} from "svelte/transition";
    import { loadQuestion } from "$lib/helpers/loadend";

    const debugRandom = (...args: unknown[]) => console.debug("[questiongets/random]", ...args);
    const errorRandom = (...args: unknown[]) => console.error("[questiongets/random]", ...args);

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
    let selectedOption: number | undefined = $state()
    let decreased: boolean = $state(false)

    let timetogo: boolean = $state(false)

    let currentQuestionHistory: [QuestionDetail, Question, {
        correct: boolean,
        selected: string,
        timeInt: number
    }][] = $state([])

    function getRandomFromArray<T>(arr: Array<T>) {
        if (!arr.length) {
            throw new Error("[questiongets/random] getRandomFromArray was called with an empty array.");
        }
        const picked = arr[Math.floor(Math.random() * arr.length)];
        debugRandom("Picked random candidate", { length: arr.length, picked });
        return picked;
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
        debugRandom("getNextQuestion() invoked", {
            currentQuestionNumberIndex,
            currentQuestionNumber,
            timetogo,
            currentStreak,
            ignoreViewed,
            tries,
            maxStreak,
            historyLength: currentQuestionHistory.length,
        });
        let seenInSessions: string[];
        try {
            seenInSessions = JSON.parse(localStorage.getItem("seen") ?? "[]");
            debugRandom("Loaded seen session cache", { count: seenInSessions.length });
        } catch {
            seenInSessions = []
            console.warn("seenInSessions wasn't set to a value parsable by JSON... resetting.")
            localStorage.setItem("seen", JSON.stringify([]))
            errorRandom("Seen session cache was invalid JSON and had to be reset.");
        }
        const allQuestions = await questions[0];
        debugRandom("Question bank resolved", { totalQuestions: allQuestions.length });
        let bank: Question[] = allQuestions
            .filter(v => appliedFilters(v)) // fits the filters the user has applied
            .filter(v => !currentQuestionHistory.some(x => x[0].externalid === v.external_id) || !currentQuestionHistory.some(x => x[0].externalid === v.ibn)) // ignore seen questions
        debugRandom("Filtered bank ready", { filteredCount: bank.length, ignoreViewed, selectedDetails });
        if (ignoreViewed) {
            bank = bank.filter(v => !seenInSessions.includes(v.external_id))
            debugRandom("Applied viewed-question filter", { remainingCount: bank.length });
        }
        if (bank.length < 1) {
            errorRandom("No questions were available after filtering.", {
                ignoreViewed,
                selectedDetails,
                historyLength: currentQuestionHistory.length,
            });
            await alert("Out of questions", "You have reached the end of your selected questions.")
            throw new Error("[questiongets/random] No questions were available after filtering.");
        }

        let loaded: QuestionDetail | null = null;
        let lastLoadError: unknown = null;
        const maxAttempts = Math.max(5, bank.length * 2);
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            const random = getRandomFromArray(bank);
            debugRandom("Attempting to load candidate question", {
                attempt,
                maxAttempts,
                external_id: random.external_id,
                ibn: random.ibn,
                primary_class_cd: random.primary_class_cd,
                skill_desc: random.skill_desc,
            });
            try {
                const candidate = await loadQuestion(random);
                if (!candidate) {
                    debugRandom("loadQuestion returned null; retrying with a different candidate.", {
                        attempt,
                        external_id: random.external_id,
                        ibn: random.ibn,
                    });
                    continue;
                }
                loaded = candidate;
                currentQuestionOutside = random;
                currentQuestion = candidate;
                debugRandom("Loaded question successfully", {
                    attempt,
                    questionType: candidate.type,
                    externalid: candidate.externalid,
                    keys: candidate.keys,
                });
                break;
            } catch (error) {
                lastLoadError = error;
                errorRandom("loadQuestion threw while loading a candidate question.", {
                    attempt,
                    external_id: random.external_id,
                    ibn: random.ibn,
                    error,
                });
            }
        }
        if (!loaded) {
            await alert("Unable to load question", "We found questions in your filtered bank, but could not load a valid question detail object.");
            throw lastLoadError ?? new Error("[questiongets/random] Could not load a valid question after multiple attempts.");
        }
        currentQuestionNumber++;
        currentQuestionNumberIndex++;
        selectedOption = undefined
        decreased = false
        timerInt = 0
        timer = '0:00'
        debugRandom("Question prepared for display", {
            currentQuestionNumber,
            currentQuestionNumberIndex,
            externalid: currentQuestion?.externalid,
            outsideExternalId: currentQuestionOutside?.external_id,
        });
        timerHandler = setInterval(() => {
            timerInt++;
            timer = `${Math.floor(timerInt / 60)}:${timerInt % 60 < 10 ? '0' + (timerInt % 60).toString() : (timerInt % 60).toString()}`
        }, 1000)
    }
    async function submitHandler(): Promise<[boolean, number]> {
        debugRandom("submitHandler() invoked", {
            currentQuestionNumber,
            currentQuestionNumberIndex,
            questionType: currentQuestion?.type,
            externalid: currentQuestion?.externalid,
            selectedOption,
            timerInt,
        });
        if (!currentQuestion) {
            throw new Error("[questiongets/random] submitHandler was called without a currentQuestion.");
        }
        if (selectedOption === undefined || selectedOption === null) {
            throw new Error("[questiongets/random] submitHandler was called without a selectedOption.");
        }
        let seenInSessions: string[];
        try {
            seenInSessions = JSON.parse(localStorage.getItem("seen") ?? "[]");
        } catch {
            seenInSessions = []
            console.warn("seenInSessions wasn't set to a value parsable by JSON... resetting.")
            localStorage.setItem("seen", JSON.stringify([]))
            errorRandom("Seen session cache was invalid JSON and had to be reset during submit.");
        }
        debugRandom("Submitting question answer", {
            questionKeys: currentQuestion.keys,
            selectedOption,
            answerOptionsLength: currentQuestion.type === "mcq" ? currentQuestion.answerOptions.length : null,
        });
        clearInterval(timerHandler)
        if (currentQuestion.type === "mcq") {
            const selectedAnswer = currentQuestion.answerOptions[selectedOption as number];
            if (!selectedAnswer) {
                throw new Error(`[questiongets/random] Selected option ${selectedOption} is out of bounds for the current MCQ.`);
            }
            currentQuestionHistory.push([currentQuestion, currentQuestionOutside, {
                correct: currentQuestion.keys.includes(selectedAnswer.id),
                selected: selectedAnswer.id,
                timeInt: timerInt
            }])
        } else {
            currentQuestionHistory.push([currentQuestion, currentQuestionOutside, {
                correct: currentQuestion.keys.includes(selectedOption.toString()),
                selected: selectedOption.toString(),
                timeInt: timerInt
            }])
        }
        seenInSessions.push(currentQuestion.externalid)
        localStorage.setItem("seen", JSON.stringify(seenInSessions))
        const isCorrect = currentQuestion.type === 'mcq' ?
            currentQuestion.keys.includes(currentQuestion.answerOptions[selectedOption as number]?.id) :
            currentQuestion.keys.includes(selectedOption.toString());
        debugRandom("Answer submission evaluated", { isCorrect, selectedOption, timerInt, currentStreak, tries, maxStreak });
        if (isCorrect) {
            currentStreak += 1
            if (maxStreak && currentStreak >= maxStreak) {
                debugRandom("Max streak reached; finishing session.", { currentStreak, maxStreak });
                return [true, -1]
            }
            return [true, 0]
        } else {
            decreased = true
            currentStreak = 0
            debugRandom("Answer was incorrect.", { tries, currentStreak, decreased });
            return [false, tries]
        }
    }
    async function exit() {
        debugRandom("exit() invoked", { timetogo, currentQuestionNumber, currentQuestionNumberIndex, historyLength: currentQuestionHistory.length });
        timetogo = true
        clearTimeout(timerHandler)
    }


    onMount(() => {
        const urlParams = new URLSearchParams(window.location.search);
        debugRandom("onMount() URL parameters", Object.fromEntries(urlParams.entries()));
        tries = parseInt(urlParams.get("tries"))
        ignoreViewed = urlParams.get("ignoreViewed") || true
        maxStreak = isNaN(parseInt(urlParams.get("streak"))) ? 0 : parseInt(urlParams.get("streak"))

        debugRandom("Parsed runtime settings", { tries, ignoreViewed, maxStreak });

        if (isNaN(tries)) {
            errorRandom("Missing or invalid tries parameter. Redirecting back to question gets.");
            goto("/questiongets")
        }

        getNextQuestion()

        return () => {
            debugRandom("onMount() cleanup", { currentQuestionNumber, currentQuestionNumberIndex, historyLength: currentQuestionHistory.length });
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
