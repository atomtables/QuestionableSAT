<script lang="ts">
    import stylus from "$lib/assets/stylus.svg";
    import more from "$lib/assets/more.svg";
    import bookmarkable from "$lib/assets/bookmarkable.svg";
    import bookmarked from "$lib/assets/bookmarked.svg";
    import type { Question, QuestionDetail } from "$lib/types/types";
    import { alert } from "$lib/components/Dialog.svelte";
    import Button from "$lib/components/Button.svelte";
    import { type Snippet, onMount } from "svelte";
    import Dropdown from "$lib/components/Dropdown.svelte";
    import copy from "$lib/assets/copy.svg";
    import dropup from "$lib/assets/dropup.svg";
    import { fade } from "svelte/transition";
    import { cubicOut } from "svelte/easing";
    import share from "$lib/assets/share.svg";
    import seen from "$lib/assets/seen.svg";
    // import coin from "$lib/assets/coin.svg"
    import { page } from "$app/state";
    import { params } from "$lib/clientstate/states.svelte";

    const debugBluebook = (...args: unknown[]) => console.debug("[Bluebook]", ...args);
    const errorBluebook = (...args: unknown[]) => console.error("[Bluebook]", ...args);

    let maxTries: number | null = $state(null);
    let currentTries: number = $state(0);
    let shown: boolean = $state(false);
    let isCorrect: string | null = $state(null);
    let isWrong: string | null = $state(null);
    let hideTimer: boolean = $state(false);
    let oldHideTimer: boolean = $state(false);
    let timeToExit: boolean = $state(false);
    let showOverviewPrompt: boolean = $state(false);

    let {
        question = $bindable(),
        currentQuestionNumber = $bindable(),
        currentQuestionNumberShow = $bindable(),
        total,
        selectedOption = $bindable(),
        submitHandler,
        nextQuestionHandler,
        previousQuestionHandler,
        timer = $bindable(),
        questionOutside = $bindable(),
        exitHandler,
        history = null,
        status = $bindable(),
        miniOverviewSnippet = undefined,
        overviewSnippet = undefined,
        questionShouldBeReviewed = $bindable(),
    }: {
        question: QuestionDetail;
        currentQuestionNumberShow: number;
        currentQuestionNumber: number;
        total: number | null;
        selectedOption: number | string | undefined;
        submitHandler: () => Promise<[boolean, number | null] | void>;
        nextQuestionHandler: () => Promise<void>;
        previousQuestionHandler: () => Promise<void>;
        timer: string;
        questionOutside: Question;
        exitHandler: () => Promise<void>;
        history: {
            selected: string;
            exit: () => void;
        } | null;
        status: string | null;
        miniOverviewSnippet?: Snippet;
        overviewSnippet?: Snippet;
        questionShouldBeReviewed: boolean | null;
    } = $props();

    $effect(() => {
        debugBluebook("render snapshot", {
            currentQuestionNumber,
            currentQuestionNumberShow,
            total,
            timer,
            status,
            shown,
            hideTimer,
            timeToExit,
            showOverviewPrompt,
            currentTries,
            maxTries,
            selectedOption,
            historyPresent: !!history,
            questionType: question?.type,
            questionExternalId: question?.externalid,
            questionOutsideExternalId: questionOutside?.external_id,
        });
    });

    // $effect(() => {
    //     console.log($state.snapshot(question?.correct_answer));
    // });

    $effect(() => {
        if (question) {
            eliminated = {};
            currentTries = 0;
            shown = false;
        }
    });

    onMount(() => {
        debugBluebook("mounted", {
            currentQuestionNumber,
            currentQuestionNumberShow,
            total,
            timer,
            status,
            historyPresent: !!history,
            questionType: question?.type,
            questionExternalId: question?.externalid,
        });
        if (history) {
            shown = true;
            isCorrect = question.keys[0];
            if (history.selected !== isCorrect) {
                isWrong = history.selected;
            }
            debugBluebook("history restored on mount", {
                selected: history.selected,
                isCorrect,
                isWrong,
            });
        }
    });

    let enableAnnotation = $state(false);
    function onselection() {
        debugBluebook("selection handler fired", {
            enableAnnotation,
            questionType: question?.type,
            questionExternalId: question?.externalid,
        });
        if (enableAnnotation) {
            const selection = document.getSelection();
            if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
                const range = selection.getRangeAt(0);
                if (!range) {
                    throw new Error("[Bluebook] Selection range was missing even though selection.rangeCount > 0.");
                }

                let x: Node | null = range.commonAncestorContainer;
                while (x) {
                    if (x.nodeType === Node.ELEMENT_NODE && (x as Element).classList.contains("highlightable-portion")) {
                        break;
                    }
                    x = x.parentNode;
                }
                if (x === null) {
                    debugBluebook("selection ignored because it was outside a highlightable portion.", {
                        selectedText: selection.toString(),
                    });
                    return;
                }

                debugBluebook("annotating selected text", {
                    selectedText: selection.toString(),
                    selectedLength: selection.toString().length,
                });

                const span = document.createElement("span");
                span.classList.add("bg-yellow-500/50");
                span.classList.add("hover:bg-yellow-500");
                span.classList.add("cursor-pointer");
                span.onclick = () => {
                    const parent = span.parentNode;
                    while (span.firstChild) {
                        parent?.insertBefore(span.firstChild, span);
                    }
                    parent?.removeChild(span);
                };
                const selectedContent = range.extractContents();
                span.appendChild(selectedContent);

                range.insertNode(span);

                selection.removeAllRanges();
            }
        }
    }

    let copied = $state(false);
    let copied2 = $state(false);

    let enableStriking = $state(false);
    let eliminated: {[key: string]: any} = $state({});

    // Check if current question has been seen
    const isQuestionSeen = $derived.by(() => {
        if (!question?.externalid) {
            debugBluebook("question is missing externalid; seen-state will default to false.", {
                questionType: question?.type,
            });
            return false;
        }

        try {
            const seenInSessions = JSON.parse(localStorage.getItem("seen") || "[]");
            const seen = seenInSessions.includes(question.externalid);
            debugBluebook("resolved seen-state", { questionExternalId: question.externalid, seen });
            return seen;
        } catch (error) {
            errorBluebook("failed to read seen-state from localStorage", { error, questionExternalId: question.externalid });
            return false;
        }
    });

    function mathTypeParser(mathML: string) {
        if (typeof mathML !== "string") {
            throw new Error(`[Bluebook] mathTypeParser expected a string but received ${typeof mathML}.`);
        }
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(mathML, "text/html");

            const mfenceds = doc.getElementsByTagName("mfenced");

            // Convert live HTMLCollection to array
            Array.from(mfenceds).forEach((mfenced) => {
                const open = mfenced.getAttribute("open") || "(";
                const close = mfenced.getAttribute("close") || ")";
                const separators = (mfenced.getAttribute("separators") || ",").split("");

                const children = Array.from(mfenced.children);
                const mrow = doc.createElement("mrow");

                // Add opening fence
                const moOpen = doc.createElement("mo");
                moOpen.textContent = open;
                mrow.appendChild(moOpen);

                // Interleave children with separators
                children.forEach((child, i) => {
                    mrow.appendChild(child.cloneNode(true));

                    if (i < children.length - 1) {
                        const moSep = doc.createElement("mo");
                        moSep.textContent = separators[i] || separators[separators.length - 1];
                        mrow.appendChild(moSep);
                    }
                });

                // Add closing fence
                const moClose = doc.createElement("mo");
                moClose.textContent = close;
                mrow.appendChild(moClose);

                // Replace mfenced with mrow
                mfenced.parentNode?.replaceChild(mrow, mfenced);
            });

            return new XMLSerializer().serializeToString(doc.documentElement);
        } catch (error) {
            errorBluebook("mathTypeParser failed; falling back to raw markup.", {
                error,
                inputPreview: mathML.slice(0, 200),
                inputLength: mathML.length,
            });
            return mathML;
        }
    }

    async function onNextHandler() {
        debugBluebook("primary navigation clicked", {
            historyPresent: !!history,
            total,
            currentQuestionNumber,
            currentQuestionNumberShow,
            questionType: question?.type,
            questionExternalId: question?.externalid,
            selectedOption,
            shown,
            timeToExit,
        });
        if (history) {
            debugBluebook("history mode: exiting review");
            history.exit();
        } else if (total !== null && currentQuestionNumber === -1) {
            debugBluebook("overview mode: submitting current answer before advancing");
            await submitHandler();
        } else if (total !== null) {
            debugBluebook("timed session with total questions: advancing to next question");
            await nextQuestionHandler();
        } else {
            if (!shown) {
                debugBluebook("submitting current question for immediate reveal");
                let val = await submitHandler();
                if (!val) {
                    throw Error("[Bluebook] Unable to submit question because submitHandler returned a falsy value.");
                }

                let [correct, max] = val;
                maxTries = max;
                if (correct) {
                    if (question.type === "mcq") {
                        const selectedAnswer = question.answerOptions[selectedOption as number];
                        if (!selectedAnswer) {
                            throw new Error(`[Bluebook] Selected option ${selectedOption} does not exist in answerOptions.`);
                        }
                        isCorrect = selectedAnswer.id;
                    } else {
                        if (selectedOption === undefined || selectedOption === null) {
                            throw new Error("[Bluebook] Cannot mark the question correct because selectedOption is missing.");
                        }
                        isCorrect = (selectedOption as string).toString();
                    }
                    if (max === -1) {
                        timeToExit = true;
                        debugBluebook("session will exit after this question because max tries were exhausted.");
                    }
                    shown = true;
                    debugBluebook("question marked correct and revealed", { isCorrect, maxTries, timeToExit });
                } else {
                    if (currentTries >= (maxTries as number)) {
                        if (question.type === "mcq") {
                            const selectedAnswer = question.answerOptions[selectedOption as number];
                            if (!selectedAnswer) {
                                throw new Error(`[Bluebook] Selected option ${selectedOption} does not exist in answerOptions.`);
                            }
                            isWrong = selectedAnswer.id;
                            isCorrect = question.keys[0];
                        } else {
                            if (selectedOption === undefined || selectedOption === null) {
                                throw new Error("[Bluebook] Cannot mark the question wrong because selectedOption is missing.");
                            }
                            isWrong = (selectedOption as string).toString();
                            isCorrect = null;
                        }
                        shown = true;
                        debugBluebook("question revealed after exhausting attempts", { isWrong, isCorrect, currentTries, maxTries });
                    } else {
                        currentTries++;
                        debugBluebook("answer was incorrect, showing retry alert", { currentTries, maxTries, selectedOption });
                        await alert("Incorrect answer", `You have ${maxTries as number - currentTries + 1} ${max as number - currentTries + 1 === 1 ? "try" : "tries"} remaining.`);
                    }
                }
                oldHideTimer = hideTimer;
                hideTimer = false;
                debugBluebook("timer visibility reset after submit", { oldHideTimer, hideTimer });
            } else if (timeToExit) {
                debugBluebook("timeToExit is true; exiting the session now.");
                await exitHandler();
            } else {
                debugBluebook("advancing to the next question after review state.");
                await nextQuestionHandler();
                shown = false;
                isCorrect = null;
                isWrong = null;
                hideTimer = oldHideTimer;
                debugBluebook("question state reset after advancing", { shown, isCorrect, isWrong, hideTimer });
            }
        }
    }
</script>

<svelte:window
    onmouseupcapture={onselection}
    ontouchendcapture={onselection}
    onclick={(event) => {
        if (showOverviewPrompt) {
            const target = event.target as HTMLElement | null;
            debugBluebook("window click closed overview prompt", {
                targetTag: target?.tagName,
                targetClass: target?.className,
            });
        }
        showOverviewPrompt = false;
    }}
/>

<div data-dummy class="bg-yellow-500/50 hover:bg-yellow-500 cursor-pointer sr-only math-container"></div>

<div class="w-screen h-screen z-1000 flex flex-nowrap flex-col bg-white">
    <div class="header flex flex-row justify-between font-sans px-4 py-3 shrink-0 bg-blue-100">
        <div class="text-left flex flex-col gap-2">
            <div class="text-2xl font-bold">Questions and Answers</div>
            <div class="">Directions</div>
        </div>
            <div class="text-center absolute right-1/2 translate-x-1/2 gap-2 flex flex-col">
            <div class="text-2xl font-semibold">
                {!hideTimer ? timer : "_"}
            </div>
                <button onclick={() => {
                    debugBluebook("hide timer toggled", { before: hideTimer });
                    hideTimer = !hideTimer;
                }} class="select-none cursor-pointer rounded-full px-3 font-bold text-sm border-1 border-black"> Hide </button>
        </div>
        <div class="text-right flex flex-col items-end gap-1">
            <div class="text-xs font-bold">
                {status || "100%"}
            </div>
            <div class="flex-1 flex items-center justify-center flex-row gap-3">
                {#if !history}
                    <button onclick={() => {
                        debugBluebook("annotation mode toggled", { before: enableAnnotation });
                        enableAnnotation = !enableAnnotation;
                    }} class="cursor-pointer flex flex-col items-center justify-center text-sm">
                        <img src={stylus} alt="pencil" class="invert w-6 h-6" />
                        <span class={`${enableAnnotation && "underline"}`}>Annotate</span>
                    </button>
                    <Dropdown ignoreStyling direction="right" items={["Stop and Exit"]} onselect={(i: number) => i === 0 && exitHandler()}>
                        <span class="flex! flex-col! items-center justify-center text-sm cursor-pointer">
                            <img src={more} alt="pencil" class="invert w-6 h-6" />
                            <span>More</span>
                        </span>
                    </Dropdown>
                {/if}
            </div>
        </div>
    </div>
    <hr />
    <div class="flex-1 flex flex-col lg:flex-row flex-nowrap px-15 overflow-y-auto">
        {#if currentQuestionNumber !== -1}
            {#if question.type === "mcq" && question.stimulus}
                <section class="lg:flex-1 lg:pr-15 highlightable-portion py-15 overflow-y-auto flex flex-col items-center *:w-full gap-2">
                    {@html question.stimulus}
                </section>
            {/if}
            <section class="{!(question.type === 'mcq' && question.stimulus) ? 'max-w-160 min-w-160 mx-auto' : 'lg:pl-15 border-t-2 lg:border-t-0 lg:border-l-2'} overflow-y-auto py-15 flex-1">
                <div class="flex flex-col flex-nowrap">
                    <div class="flex flex-row font-sans items-center justify-center border-b-2">
                        <div class="px-2 h-8 bg-black text-white flex items-center justify-center gap-2">
                            {currentQuestionNumberShow}
                            {#if isQuestionSeen}
                                <img src={seen} alt="Previously seen" class="w-4 h-4 invert" />
                            {/if}
                        </div>
                        <div class="flex-1 bg-neutral-200 h-8 flex flex-row items-center justify-between pl-3 pr-1">
                            <button onclick={() => {
                                debugBluebook("mark-for-review toggled", { before: questionShouldBeReviewed });
                                questionShouldBeReviewed = !questionShouldBeReviewed;
                            }} class="cursor-pointer text-sm text-neutral-800 flex flex-row gap-1 items-center justify-center {!total && 'opacity-50 cursor-not-allowed'}">
                                {#if questionShouldBeReviewed}
                                    <img src={bookmarked} alt="boomarkable" />
                                {:else}
                                    <img src={bookmarkable} alt="boomarkable" />
                                {/if}
                                <span> Mark for Review </span>
                            </button>
                            <button onclick={() => {
                                debugBluebook("striking mode toggled", { before: enableStriking });
                                enableStriking = !enableStriking;
                            }} class="cursor-pointer p-0.5 text-xs line-through font-bold transition-colors bg-white {enableStriking && '!bg-blue-800 text-white'} border-black border-2 rounded-md"> ABC </button>
                        </div>
                    </div>
                    <div class="py-3 highlightable-portion">
                        {@html mathTypeParser(question.stem)}
                    </div>
                    <div class="flex flex-col gap-4">
                        {#if question.type === "mcq"}
                            {#each question.answerOptions as { id, content }, i}
                                <div class="flex flex-row">
                                    <button
                                        onclick={() => {
                                            debugBluebook("answer option clicked", { optionIndex: i, optionId: id, historyPresent: !!history, enableStriking, eliminated: !!eliminated[id] });
                                            if (!history && (!enableStriking || !eliminated[id])) {
                                                selectedOption = i;
                                            }
                                        }}
                                        class="flex flex-row items-center w-full relative {eliminated[id] && enableStriking && 'before:-ml-4 before:border-1 before:w-full opacity-50 !cursor-not-allowed before:top-1/2 before:-translate-y-1/2 before:absolute'}
                                py-3 px-4 border-2 border-neutral-500 gap-5
                                rounded-lg cursor-pointer hover:bg-blue-300/50 {selectedOption === i && '!bg-blue-800 text-white'}
                                transition-colors {isCorrect === id && '!bg-green-800 text-white'} {isWrong === id && '!bg-red-800 text-white'}"
                                    >
                                        <span class="font-sans flex items-center justify-center w-7 h-7 font-bold border-2 rounded-full grow-0 shrink-0 select-none">
                                            {["A", "B", "C", "D", "E", "F"][i]}
                                        </span>
                                        <span class="text-left">
                                            {@html mathTypeParser(content)}
                                        </span>
                                    </button>
                                    {#if enableStriking}
                                        <button
                                            onclick={() => {
                                                debugBluebook("strike toggle clicked", { optionIndex: i, optionId: id, before: eliminated[id] });
                                                eliminated[id] = !eliminated[id];
                                            }}
                                            class="flex flex-row items-center justify-center w-16
                                    rounded-lg cursor-pointer group"
                                        >
                                            <span class="transition-colors group-hover:bg-blue-500/50 relative before:border-1 before:w-3 before:absolute font-sans flex items-center justify-center w-5 h-5 text-xs border-2 rounded-full grow-0 shrink-0 select-none">
                                                {["A", "B", "C", "D", "E", "F"][i]}
                                            </span>
                                        </button>
                                    {/if}
                                </div>
                            {/each}
                        {:else}
                            <div class="flex flex-row items-center gap-2">
                                <div class="border-2 rounded-2xl w-24 p-2 font-mono">
                                        <input disabled={shown} type="text" class="p-2 w-full border-b-2" bind:value={selectedOption} oninput={() => debugBluebook("short-answer input changed", { selectedOption })} />
                                </div>
                                {#if shown}
                                    {#if isCorrect === selectedOption}
                                        <div class="text-green-700">Correct!</div>
                                    {:else}
                                        <div class="text-red-500">Incorrect.</div>
                                    {/if}
                                {/if}
                            </div>
                        {/if}
                    </div>
                    {#if shown}
                        <div class="flex flex-col p-2 bg-blue-50 rounded-2xl my-4">
                            <div class="p-2 bg-blue-100 rounded-2xl mb-2">
                                The answer{question.correct_answer.length > 1 ? "s were" : " was"}  {typeof question.correct_answer === "string" ? question.correct_answer : question.correct_answer.join(", ")}.
                                {#if history}
                                    <span class={!question.keys.includes(history.selected) ? "text-red-500" : "text-green-700"}>
                                        {#if !history.selected}
                                            You did not answer this question
                                        {:else}
                                            You answered {question.type === "mcq" ? question.answerOptions.find((v) => v.id === history.selected)?.content : history.selected}
                                        {/if}
                                    </span>
                                {/if}
                            </div>
                            <div class="p-2 bg-blue-100 rounded-2xl mb-2">
                                This was a{["A", "E", "I", "O", "U"].includes(questionOutside.primary_class_cd_desc.at(0) ?? "") ? "n" : ""}
                                <b>{questionOutside.primary_class_cd_desc}: {questionOutside.skill_desc}</b>
                                question with a{["A", "E", "I", "O", "U"].includes(questionOutside.difficulty.at(0) ?? "") ? "n" : ""}
                                <b>{questionOutside.difficulty === "E" ? "easy" : questionOutside.difficulty === "M" ? "medium" : "hard"}</b>
                                difficulty (CB level of
                                <b>{questionOutside.score_band_range_cd}</b>)
                            </div>
                            <div class="flex flex-row gap-4">
                                <Button
                                    class="flex-1 mb-2 cursor-pointer p-2 bg-blue-100 hover:bg-blue-200 active:bg-blue-300 transition-all rounded-2xl"
                                    resetStyling
                                    onclick={() => {
                                        debugBluebook("copy-question button clicked", { questionExternalId: question?.externalid, questionType: question?.type });
                                        navigator.clipboard.writeText(
                                            (question.type === "mcq" && question.stimulus ? `Context: ${question.stimulus}\n` : "") +
                                                `Question: ${question.stem}` +
                                                (question.type === "mcq" && question.answerOptions
                                                    ? `\nChoices: ` +
                                                      question.answerOptions.map(({ id, content }, i) => {
                                                          return `\n${["A", "B", "C", "D", "E", "F"][i]}: ${content}`;
                                                      })
                                                    : ""),
                                        );
                                        copied = true;
                                        setTimeout(() => {
                                            copied = false;
                                        }, 1000);
                                    }}
                                >
                                    <div class="w-full flex flex-row gap-2 text-black">
                                        <img src={copy} class="w-6 aspect-square" alt="Copy the question" />
                                        <span>{copied ? 'Copied!' : 'Copy raw question to clipboard'}</span>
                                    </div>
                                </Button>
                                <Button
                                    class="flex-1 mb-2 cursor-pointer p-2 bg-blue-100 hover:bg-blue-200 active:bg-blue-300 transition-all rounded-2xl"
                                    resetStyling
                                    onclick={() => {
                                        debugBluebook("share-question button clicked", { questionExternalId: question?.externalid, questionType: question?.type });
                                        if (
                                            navigator.canShare &&
                                            navigator.canShare({
                                                url: page.url.hostname + "/questiongets/justone?start=" + question.externalid + "&jsonparams=" + params.params,
                                            })
                                        ) {
                                            navigator.share({
                                                url: page.url.hostname + "/questiongets/justone?start=" + question.externalid + "&jsonparams=" + params.params,
                                            });
                                        } else {
                                            navigator.clipboard.writeText(page.url.hostname + "/questiongets/justone?start=" + question.externalid + "&jsonparams=" + params.params);
                                            copied2 = true;
                                            setTimeout(() => {
                                                copied2 = false;
                                            }, 1000);
                                        }
                                    }}
                                >
                                    <div class="w-full flex flex-row gap-2 text-black">
                                        <img src={share} class="w-6 aspect-square" alt="Share the question" />
                                        <span>{copied2 ? 'Copied!' : 'Share question link'}</span>
                                    </div>
                                </Button>
                            </div>
                            <!-- <div class="p-2 bg-blue-100 rounded-2xl mb-2 flex items-center justify-between">
                                <div class="flex items-center gap-2 text-sm font-bold">
                                    <img src={coin} alt="coins" class="w-5 h-5" />
                                    <span>Current Balance: {coinCount} coins</span>
                                </div>
                            </div> -->
                            <div class="p-2 bg-yellow-400 rounded-2xl hidden">
                                Warning: the CollegeBoard's explanation may try to confuse you. After all, they hold no money in having you get a good score the first time around.
                            </div>
                            <div class="p-2 text-base flex flex-col gap-3">
                                {@html mathTypeParser(question.rationale)}
                            </div>
                        </div>
                    {/if}
                </div>
            </section>
        {:else}
            {@render overviewSnippet?.()}
        {/if}
    </div>
    <hr />
    <div class="shrink-0 flex flex-row justify-between relative font-sans p-5 bg-blue-100">
        <div class="text-left flex flex-col gap-2 font-bold p-2">Smart kid</div>
        <div class="text-center absolute right-1/2 translate-x-1/2 gap-2 flex flex-col">
            {#if total !== null && showOverviewPrompt}
                <div transition:fade={{ duration: 100, easing: cubicOut }} class="z-500 right-1/2 translate-x-1/2 bottom-14 shadow-2xl absolute min-w-80 flex flex-col items-center justify-center flex-nowrap bg-gray-100 rounded-xl">
                    {@render miniOverviewSnippet?.()}
                </div>
            {/if}
                <button
                onclick={(e) => {
                    e.stopPropagation();
                    debugBluebook("overview button clicked", { total, showOverviewPrompt, currentQuestionNumber, currentQuestionNumberShow });
                    if (total) showOverviewPrompt = !showOverviewPrompt;
                }}
                class="{total && 'cursor-pointer'} bg-gray-950 text-white py-2 px-4 rounded-md font-bold flex flex-row items-center justify-center"
            >
                <span>
                    {#if currentQuestionNumber === -1}
                        Overview
                    {:else}
                        Question {currentQuestionNumberShow}
                        {#if total}of {total}{/if}
                    {/if}
                </span>
                {#if total}
                    <img src={dropup} alt="Open" class="h-8 -m-2 pl-2 invert" />
                {/if}
            </button>
        </div>
        <div class="text-right flex flex-row gap-2 items-right">
            {#if history}
                <Button
                    disabled={total ? false : selectedOption === undefined}
                    resetStyling
                    class="bg-blue-700
            {!(total ? false : selectedOption === undefined) ? 'hover:bg-blue-600 active:bg-blue-500 cursor-pointer' : '!bg-gray-600'} transition-colors
            text-white font-bold px-6 rounded-full py-2"
                    onclick={onNextHandler}
                >
                    Back
                </Button>
            {:else}
                {#if total}
                    <Button
                        resetStyling
                        disabled={currentQuestionNumberShow === 1}
                        class="{currentQuestionNumberShow !== 1 ? 'bg-blue-700 hover:bg-blue-600 active:bg-blue-500 cursor-pointer' : '!bg-gray-600'} transition-colors
                text-white font-bold px-6 rounded-full py-2"
                        onclick={previousQuestionHandler}>Previous</Button
                    >
                {/if}
                <Button
                    disabled={total ? false : selectedOption === undefined}
                    resetStyling
                    class="bg-blue-700
            {!(total ? false : selectedOption === undefined) ? 'hover:bg-blue-600 active:bg-blue-500 cursor-pointer' : '!bg-gray-600'} transition-colors
            text-white font-bold px-6 rounded-full py-2"
                    onclick={onNextHandler}
                >
                    {#if (shown || total !== null) && (total === null || currentQuestionNumber !== -1)}
                        Next
                    {:else}
                        Submit
                    {/if}
                </Button>
            {/if}
        </div>
    </div>
</div>
