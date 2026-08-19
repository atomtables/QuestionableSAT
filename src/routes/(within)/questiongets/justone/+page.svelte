<!-- TODO: this entire page !!! -->
<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import { goto } from "$app/navigation";
    import Bluebook from "$lib/components/platformspecific/Bluebook.svelte";
    import Dialog from "$lib/components/Dialog.svelte";
    import { isQuestionArray, type LookupData, type Question, type QuestionDetail, type QuestionDetailMCQ } from "$lib/types/types";
    import { alert } from "$lib/components/Dialog.svelte";
    import { questions, selectedDetails } from "$lib/clientstate/states.svelte";
    import Input from "$lib/components/Input.svelte";
    import Button from "$lib/components/Button.svelte";
    import { slide } from "svelte/transition";
    import Spinner from "$lib/components/Spinner.svelte";
    import { loadMCQQuestionThroughJSON } from "$lib/helpers/loadjson";
    import { loadQuestion } from "$lib/helpers/loadend";

    const debugJustOne = (...args: unknown[]) => console.debug("[questiongets/justone]", ...args);
    const errorJustOne = (...args: unknown[]) => console.error("[questiongets/justone]", ...args);

    let {
        data,
    }: {
        data: {
            lookup: LookupData;
            questions: Promise<Question[]>;
        };
    } = $props();

    let questionID: string = $state();
    let params: string = $state();
    let timerInt: number = $state();
    let timer: string = $state();
    let timerHandler: number = $state();

    let currentQuestionNumber: number = $state(1);
    let currentQuestionNumberIndex: number = $state(0);
    let currentQuestion: QuestionDetail = $state();
    let currentQuestionOutside: Question = $state();
    let selectedOption: number = $state();

    let currentQuestionHistory: [
        QuestionDetail,
        Question,
        {
            correct: boolean;
            selected: string;
            timeInt: number;
        },
    ][] = $state([]);

    async function getNextQuestion() {
        debugJustOne("getNextQuestion() invoked; redirecting out of single-question flow.");
        exit();
    }
    async function submitHandler(): Promise<[boolean, number]> {
        debugJustOne("submitHandler() invoked", {
            questionID,
            currentQuestionType: currentQuestion?.type,
            selectedOption,
        });
        if (!currentQuestion) {
            throw new Error("[questiongets/justone] submitHandler was called without a currentQuestion.");
        }
        if (selectedOption === undefined || selectedOption === null) {
            throw new Error("[questiongets/justone] submitHandler was called without a selectedOption.");
        }
        let seenInSessions: string[];
        try {
            seenInSessions = JSON.parse(localStorage.getItem("seen"));
        } catch {
            seenInSessions = [];
            console.warn("seenInSessions wasn't set to a value parsable by JSON... resetting.");
            localStorage.setItem("seen", JSON.stringify([]));
            errorJustOne("Seen question cache was invalid JSON and had to be reset during submit.");
        }
        clearInterval(timerHandler);
        seenInSessions.push(currentQuestion.externalid);
        localStorage.setItem("seen", JSON.stringify(seenInSessions));
        const isCorrect = currentQuestion.type === "mcq" ? currentQuestion.keys.includes(currentQuestion.answerOptions[selectedOption].id) : currentQuestion.keys.includes(selectedOption.toString());
        debugJustOne("Answer evaluated", { isCorrect, selectedOption, questionID: currentQuestion.externalid });
        if (isCorrect) {
            return [true, 0];
        } else {
            return [false, 0];
        }
    }
    async function exit() {
        debugJustOne("exit() invoked", { questionID, hasQuestion: !!currentQuestion, timerHandler });
        clearTimeout(timerHandler);
        goto("/");
    }

    onMount(async () => {
        const urlParams = new URLSearchParams(window.location.search);
        debugJustOne("onMount() URL parameters", Object.fromEntries(urlParams.entries()));
        questionID = urlParams.get("start");
        params = urlParams.get("jsonparams");

        if (!questionID) {
            errorJustOne("Missing questionID in URL; redirecting to topics.");
            goto("/topics").then(() => {
                alert("Error", "This question link is invalid. Please request the person who sent you the link to send you a valid link.");
            });
        }
        try {
            let qs = await questions[0];
            debugJustOne("Question bank resolved", { totalQuestions: qs.length, questionID });
            // console.log(qs);
            currentQuestionOutside = qs.find((q) => q.external_id === questionID);
            // console.log(currentQuestionOutside, questionID);
            if (!currentQuestionOutside) {
                errorJustOne("Question ID was not found in the resolved bank.", { questionID });
                goto("/topics").then(() => {
                    alert("Error", "This question link is invalid. Please request the person who sent you the link to send you a valid link.");
                });
            }
            currentQuestion = await loadQuestion(currentQuestionOutside);
            debugJustOne("Question detail loaded", {
                questionID,
                currentQuestionType: currentQuestion?.type,
                externalid: currentQuestion?.externalid,
            });
            if (!currentQuestion || !currentQuestionOutside) {
                errorJustOne("Loaded question detail was missing after loadQuestion.", { questionID, currentQuestion, currentQuestionOutside });
                goto("/topics").then(() => {
                    alert("Error", "This question link is invalid. Please request the person who sent you the link to send you a valid link.");
                });
            }
        } catch (e) {
            errorJustOne("Unexpected error while preparing the single question page.", { error: e, questionID, params });
        }
    });
    onDestroy(() => {
        debugJustOne("onDestroy() cleanup", { questionID, timerHandler });
        clearInterval(timerHandler);
    });

    let currentlyReviewing = $state(null);
    let currentlyReviewed = $derived(currentlyReviewing !== null && currentlyReviewing + 1);
    let currentlyTimered = $derived(`${Math.floor(currentQuestionHistory[currentlyReviewing][2].timeInt / 60)}:${currentQuestionHistory[currentlyReviewing][2].timeInt % 60 < 10 ? "0" + (currentQuestionHistory[currentlyReviewing][2].timeInt % 60).toString() : (currentQuestionHistory[currentlyReviewing][2].timeInt % 60).toString()}`);
    let currentlySelectedHistory = $derived(currentQuestionHistory[currentlyReviewing][0].type === "mcq" ? (currentQuestionHistory[currentlyReviewing][0] as QuestionDetailMCQ).answerOptions.findIndex((v) => v.id === currentQuestionHistory[currentlyReviewing][2].selected) : currentQuestionHistory[currentlyReviewing][2].selected);
</script>

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
