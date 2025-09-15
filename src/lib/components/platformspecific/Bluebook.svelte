<script lang="ts">
    import stylus from "$lib/assets/stylus.svg"
    import more from "$lib/assets/more.svg"
    import bookmarkable from "$lib/assets/bookmarkable.svg"
    import type {Question, QuestionDetail} from "$lib/types/types";
    import {alert} from "$lib/components/Dialog.svelte"
    import Button from "$lib/components/Button.svelte";
    import {onMount} from "svelte";
    import Dropdown from "$lib/components/Dropdown.svelte";

    let maxTries: number = $state()
    let currentTries: number = $state(0)
    let shown: boolean = $state(false)
    let isCorrect: string = $state(null)
    let isWrong: string = $state(null)
    let hideTimer: boolean = $state(false)
    let oldHideTimer: boolean = $state(false)
    let timeToExit: boolean = $state(false)

    let {
        question = $bindable(),
        currentQuestionNumber = $bindable(),
        total,
        selectedOption = $bindable(),
        submitHandler,
        nextQuestionHandler,
        timer = $bindable(),
        questionOutside = $bindable(),
        exitHandler,
        history = null
    }: {
        question: QuestionDetail,
        currentQuestionNumber: number,
        total: number | null,
        selectedOption: number,
        submitHandler: () => Promise<[boolean, number | null]>,
        nextQuestionHandler: () => Promise<void>,
        timer: string,
        questionOutside: Question,
        exitHandler: () => Promise<void>,
        history: {
            selected: string,
            exit: () => void
        } | null
    } = $props()

    $effect(() => {
        console.log($state.snapshot(question.correct_answer))
    })

    onMount(() => {
        if (history) {
            shown = true
            isCorrect = question.keys[0]
            if (history.selected !== isCorrect) {
                isWrong = history.selected
            }
        }
    })
</script>

<div class="w-screen h-screen z-1000 flex flex-nowrap flex-col bg-white">
    <div class="header flex flex-row justify-between font-sans px-4 py-3 shrink-0 bg-blue-100">
        <div class="text-left flex flex-col gap-2">
            <div class="text-2xl font-bold">
                Questions and Answers
            </div>
            <div class="">
                Directions
            </div>
        </div>
        <div class="text-center absolute right-1/2 translate-x-1/2 gap-2 flex flex-col">
            <div class="text-2xl font-semibold">
                {!hideTimer ? timer : '_'}
            </div>
            <button onclick={() => hideTimer = !hideTimer} class="select-none cursor-pointer rounded-full px-3 font-bold text-sm border-1 border-black">
                Hide
            </button>
        </div>
        <div class="text-right flex flex-col items-right gap-1">
            <div class="text-xs font-bold">
                100%
            </div>
            <div class="flex-1 flex items-center justify-center flex-row gap-3">
                {#if !history}
                    <button class="flex flex-col items-center justify-center text-sm">
                        <img src={stylus} alt="pencil" class="invert w-6 h-6" />
                        Annotate
                    </button>
                    <Dropdown ignoreStyling
                              direction="right"
                              items={["Stop and Exit"]}
                              onselect={i => i === 0 && exitHandler()}>
                        <span class="flex! flex-col! items-center justify-center text-sm cursor-pointer">
                            <img src={more} alt="pencil" class="invert w-6 h-6" />
                        <span>More</span>
                        </span>
                    </Dropdown>
                {/if}
            </div>
        </div>
    </div>
    <hr>
    <div class="flex-1 flex flex-row flex-nowrap px-15 overflow-y-auto">
        <div class="flex-1 pr-15 py-15 overflow-y-auto flex flex-col items-center">
            {@html question.stimulus}
        </div>
        <div class="{!question.stimulus ? 'max-w-160' : 'pl-15 border-l-2'} overflow-y-auto py-15 flex-1">
            <div class="flex flex-col flex-nowrap">
                <div class="flex flex-row font-sans items-center justify-center border-b-2">
                    <div class="px-2 h-8 bg-black text-white flex items-center justify-center">
                        {currentQuestionNumber}
                    </div>
                    <div class="flex-1 bg-neutral-200 h-8 flex flex-row items-center justify-between pl-3 pr-1">
                        <div class="text-sm text-neutral-800 flex flex-row gap-1 items-center justify-center">
                            <img src={bookmarkable} alt="boomarkable"/>
                            <div>
                                Mark for Review
                            </div>
                        </div>
                        <button class="cursor-pointer p-0.5 text-xs line-through font-bold bg-white border-black border-2 rounded-md">
                            ABC
                        </button>
                    </div>
                </div>
                <div class="py-3">
                    {@html question.stem}
                </div>
                <div class="flex flex-col gap-4">
                    {#each question.answerOptions as { id, content }, i}
                        <button
                                onclick={() => (!history && (selectedOption = i))}
                                class="flex flex-row items-center w-full
                                py-3 px-4 border-2 border-neutral-500 gap-5
                                rounded-lg cursor-pointer hover:bg-blue-300/50 {selectedOption === i && '!bg-blue-800 text-white'}
                                transition-colors {isCorrect === id && '!bg-green-800 text-white'} {isWrong === id && '!bg-red-800 text-white'}">
                            <span class="font-sans flex items-center justify-center w-7 h-7 font-bold border-2 rounded-full grow-0 shrink-0 select-none">
                                {['A', 'B', 'C', 'D', 'E', 'F'][i]}
                            </span>
                            <span class="text-left">
                                {@html content}
                            </span>
                        </button>
                    {/each}
                </div>
                {#if shown}
                    <div class="flex flex-col p-2 bg-blue-50 rounded-2xl my-4">
                        <div class="p-2 bg-blue-100 rounded-2xl mb-2">
                            This was a{['A','E','I','O','U'].includes(questionOutside.primary_class_cd_desc.at(0)) ? 'n' : ''}
                            <b>{questionOutside.primary_class_cd_desc}: {questionOutside.skill_desc}</b> question with
                            a{['A','E','I','O','U'].includes(questionOutside.difficulty.at(0)) ? 'n' : ''}
                            <b>{questionOutside.difficulty === 'E' ? 'easy' : questionOutside.difficulty === 'M' ? 'medium' : 'hard'}</b>
                            difficulty (CB level of <b>{questionOutside.score_band_range_cd}</b>)
                        </div>
                        <div class="p-2 bg-yellow-400 rounded-2xl">
                            Warning: the CollegeBoard's explanation may try to confuse you. After all, they hold no
                            money in having you get a good score the first time around.
                        </div>
                        <div class="p-2 text-base flex flex-col gap-3">
                            {@html question.rationale}
                        </div>
                    </div>
                {/if}
            </div>
        </div>
    </div>
    <hr>
    <div class="shrink-0 flex flex-row justify-between font-sans p-5 bg-blue-100">
        <div class="text-left flex flex-col gap-2 font-bold p-2">
            Smart kid
        </div>
        <div class="text-center absolute right-1/2 translate-x-1/2 gap-2 flex flex-col">
            <button class="bg-gray-950 text-white py-2 px-4 rounded-md font-bold">
                Question {currentQuestionNumber} {#if total}of 27{/if}
            </button>
        </div>
        <div class="text-right flex flex-row gap-2 items-right">
            {#if total}
                <button class="cursor-pointer bg-blue-700
                hover:bg-blue-600 active:bg-blue-500 transition-colors
                text-white font-bold px-6 rounded-full py-2">Previous</button>
            {/if}
            <Button disabled={selectedOption === undefined} resetStyling class="bg-blue-700
            {selectedOption !== undefined ? 'hover:bg-blue-600 active:bg-blue-500 cursor-pointer' : '!bg-gray-600'} transition-colors
            text-white font-bold px-6 rounded-full py-2" onclick={history ? async () => {history.exit()} : !shown ? async () => {
                let [correct, max] = await submitHandler()
                maxTries = max
                if (correct) {
                    isCorrect = question.answerOptions[selectedOption].id
                    if (max === -1) {
                        timeToExit = true
                    }
                    shown = true
                } else {
                    if (currentTries >= maxTries) {
                        isWrong = question.answerOptions[selectedOption].id
                        isCorrect = question.keys[0]
                        shown = true
                    } else {
                        currentTries++;
                        await alert("Incorrect answer", `You have ${maxTries - currentTries} ${max - currentTries + 1 === 1 ? 'try' : 'tries'} remaining.`)
                    }
                }
                oldHideTimer = hideTimer
                hideTimer = false
            } : timeToExit ? () => exitHandler() : async () => {
                await nextQuestionHandler()
                shown = false
                isCorrect = null
                isWrong = null
                hideTimer = oldHideTimer
            }}>
                {#if shown}
                    Next
                {:else}
                    Submit
                {/if}
            </Button>
        </div>
    </div>
</div>

<style lang="postcss">
    @reference 'tailwindcss';
    .sr-only {
        display:none;
    }
</style>