<script lang="ts">
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

    let questionID: string = $state()
    let timerInt: number = $state()
    let timer: string = $state()
    let timerHandler: number = $state()

    let currentQuestionNumber: number = $state(1)
    let currentQuestionNumberIndex: number = $state(0)
    let currentQuestion: QuestionDetail = $state()
    let currentQuestionOutside: Question = $state()
    let selectedOption: number = $state()

    let currentQuestionHistory: [QuestionDetail, Question, {
        correct: boolean,
        selected: string,
        timeInt: number
    }][] = $state([])

    async function getNextQuestion() {
        exit()
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
        seenInSessions.push(currentQuestion.externalid)
        localStorage.setItem("seen", JSON.stringify(seenInSessions))
        if (currentQuestion.type === 'mcq' ?
            currentQuestion.keys.includes(currentQuestion.answerOptions[selectedOption].id) :
            currentQuestion.keys.includes(selectedOption.toString())) {
            return [true, 0]
        } else {
            return [false, 0]
        }
    }
    async function exit() {
        clearTimeout(timerHandler)
        goto("/")
    }


    onMount(() => {
        const urlParams = new URLSearchParams(window.location.search);
        questionID = urlParams.get("start")

        if (!questionID) goto("/questiongets")
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
