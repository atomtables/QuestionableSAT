<!-- TODO: this entire page !!! -->
<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import { goto } from "$app/navigation";
    import Bluebook from "$lib/components/platformspecific/Bluebook.svelte";
    import Dialog from "$lib/components/Dialog.svelte";
    import { type LookupData, type Question, type QuestionDetail } from "$lib/types/types";
    import { alert } from "$lib/components/Dialog.svelte";
    import { questions } from "$lib/clientstate/states.svelte";
    import { slide } from "svelte/transition";
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

    let questionID = $state("");
    let params = $state("");
    let timer = $state("");
    let timerHandler = $state<number | undefined>(undefined);

    let currentQuestionNumber: number = $state(1);
    let currentQuestionNumberIndex: number = $state(0);
    let currentQuestion = $state<QuestionDetail | undefined>(undefined);
    let currentQuestionOutside = $state<Question>({} as Question);
    let selectedOption = $state<number | undefined>(undefined);

    async function getNextQuestion() {
        debugJustOne("getNextQuestion() invoked; redirecting out of single-question flow.");
        await exit();
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
            seenInSessions = JSON.parse(localStorage.getItem("seen") ?? "[]");
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
        questionID = urlParams.get("start") ?? "";
        params = urlParams.get("jsonparams") ?? "";

        if (!questionID) {
            errorJustOne("Missing questionID in URL; redirecting to topics.");
            await goto("/topics");
            await alert("Error", "This question link is invalid. Please request the person who sent you the link to send you a valid link.");
            return;
        }
        try {
            let qs = await questions[0];
            debugJustOne("Question bank resolved", { totalQuestions: qs.length, questionID });
            // console.log(qs);
            currentQuestionOutside = qs.find((q) => q.external_id === questionID);
            // console.log(currentQuestionOutside, questionID);
            if (!currentQuestionOutside) {
                errorJustOne("Question ID was not found in the resolved bank.", { questionID });
                await goto("/topics");
                await alert("Error", "This question link is invalid. Please request the person who sent you the link to send you a valid link.");
                return;
            }
            currentQuestion = await loadQuestion(currentQuestionOutside);
            debugJustOne("Question detail loaded", {
                questionID,
                currentQuestionType: currentQuestion?.type,
                externalid: currentQuestion?.externalid,
            });
            if (!currentQuestion || !currentQuestionOutside) {
                errorJustOne("Loaded question detail was missing after loadQuestion.", { questionID, currentQuestion, currentQuestionOutside });
                await goto("/topics");
                await alert("Error", "This question link is invalid. Please request the person who sent you the link to send you a valid link.");
                return;
            }
        } catch (e) {
            errorJustOne("Unexpected error while preparing the single question page.", { error: e, questionID, params });
        }
    });
    onDestroy(() => {
        debugJustOne("onDestroy() cleanup", { questionID, timerHandler });
        clearInterval(timerHandler);
    });

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
            previousQuestionHandler={async () => {}}
        />
    </div>
{:else}
    <Dialog open={true} title="Getting your first question..." loading />
{/if}
