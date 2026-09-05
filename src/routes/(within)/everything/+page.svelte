<script lang="ts">
    import Input from "$lib/components/Input.svelte";
    import { alert } from "$lib/components/Dialog.svelte";
    import { lookup, params } from "$lib/clientstate/states.svelte";
    import { loadQuestions } from "$lib/helpers/loadquestions";
    import type { Question, QuestionDetail } from "$lib/types/types";
    import { slide, fade } from "svelte/transition";
    import Bluebook from "$lib/components/platformspecific/Bluebook.svelte";
    import { loadQuestion } from "$lib/helpers/loadend";
    import { onDestroy, tick } from "svelte";
    import Spinner from "$lib/components/Spinner.svelte";

    const setup = $state({
        test: 0 as number | null,
        section: 2 as number | null,
    });

    let difficultySelected = $state([true, true, true, true, true, true, true]);
    let bluebookFilter = $state(0); // 0 = All, 1 = Bluebook Only, 2 = Non-Bluebook Only
    let collapsedSkills = $state(new Set<string>()); // Track which skills are collapsed (start all collapsed)
    let isFiltering = $state(false); // Track when filters are being applied

    // Question viewer state
    let selectedSkillQuestions: Question[] = $state([]);
    let selectedSkillName = $state("");
    let currentQuestionIndex = $state(0);
    let currentQuestion: QuestionDetail | null = $state(null);
    let selectedOption: number | string | undefined = $state();
    let isViewingQuestion = $state(false);
    let timer = $state("00:00");

    // Timer state
    let timerSeconds = $state(0);
    let timerInterval: ReturnType<typeof setInterval> | null = $state(null);
    let questionTimers: number[] = $state([]); // Track time spent on each question

    // Track filtering state for spinner
    $effect(() => {
        // Watch for changes in filter inputs
        difficultySelected;
        bluebookFilter;
        setup.test;
        setup.section;

        // Show spinner when filters change
        isFiltering = true;

        // Hide spinner after a short delay to allow for processing
        const timeout = setTimeout(() => {
            isFiltering = false;
        }, 25);

        return () => clearTimeout(timeout);
    });
    function toggleSkill(skillName: string) {
        if (collapsedSkills.has(skillName)) {
            collapsedSkills.delete(skillName);
        } else {
            collapsedSkills.add(skillName);
        }
        collapsedSkills = new Set(collapsedSkills);
    }

    // Timer functions
    function startTimer() {
        if (timerInterval) clearInterval(timerInterval);
        timerSeconds = questionTimers[currentQuestionIndex] || 0;
        updateTimerDisplay();

        timerInterval = setInterval(() => {
            timerSeconds++;
            questionTimers[currentQuestionIndex] = timerSeconds;
            updateTimerDisplay();
        }, 1000);
    }

    function stopTimer() {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
    }

    function updateTimerDisplay() {
        const minutes = Math.floor(timerSeconds / 60);
        const seconds = timerSeconds % 60;
        timer = `${minutes}:${seconds < 10 ? "0" + seconds.toString() : seconds.toString()}`;
    }

    // Question viewer functions
    async function enterQuestionViewer(skillName: string, skillCodeQuestions: Question[]) {
        selectedSkillQuestions = skillCodeQuestions;
        selectedSkillName = skillName;
        currentQuestionIndex = 0;
        questionTimers = new Array(skillCodeQuestions.length).fill(0); // Initialize timer array
        isViewingQuestion = true;
        await loadCurrentQuestion();
        startTimer();
    }

    let currentQuestionShow = $state(0);

    async function loadCurrentQuestion() {
        if (selectedSkillQuestions.length > 0) {
            const question = selectedSkillQuestions[currentQuestionIndex];
            currentQuestion = await loadQuestion(question);
            selectedOption = undefined;
            currentQuestionShow = currentQuestionIndex + 1;
        }
    }

    async function nextQuestion() {
        if (currentQuestionIndex < selectedSkillQuestions.length - 1) {
            stopTimer(); // Save current time
            currentQuestionIndex++;
            await loadCurrentQuestion();
            startTimer(); // Start timer for new question
        }
    }

    async function previousQuestion() {
        if (currentQuestionIndex > 0) {
            stopTimer(); // Save current time
            currentQuestionIndex--;
            await loadCurrentQuestion();
            startTimer(); // Start timer for previous question
        }
    }

    async function randomQuestion() {
        stopTimer(); // Save current time
        currentQuestionIndex = Math.floor(Math.random() * selectedSkillQuestions.length);
        await loadCurrentQuestion();
        startTimer(); // Start timer for new question
    }

    async function exitQuestionViewer() {
        stopTimer();
        isViewingQuestion = false;
        selectedSkillQuestions = [];
        selectedSkillName = "";
        currentQuestion = null;
        selectedOption = undefined;
        questionTimers = [];
        timerSeconds = 0;
        timer = "00:00";
    }

    async function submitHandler(): Promise<[boolean, number]> {
        if (!currentQuestion) throw Error("Current question is null but something was submitted...");
        let seenInSessions: string[];
        try {
            seenInSessions = JSON.parse(localStorage.getItem("seen") ?? "");
        } catch {
            seenInSessions = [];
            console.warn("seenInSessions wasn't set to a value parsable by JSON... resetting.");
            localStorage.setItem("seen", JSON.stringify([]));
        }
        if (timerInterval) clearInterval(timerInterval);
        seenInSessions.push(currentQuestion.externalid);
        localStorage.setItem("seen", JSON.stringify(seenInSessions));
        if (currentQuestion.type === "mcq") {
            if (selectedOption === undefined || selectedOption === null) {
                return [false, 0];
            }

            const selectedAnswer = currentQuestion.answerOptions[selectedOption as number];
            if (!selectedAnswer) {
                throw new Error(`Selected option ${selectedOption} does not exist for the current question.`);
            }

            if (currentQuestion.keys.includes(selectedAnswer.id)) {
                return [true, 0];
            }

            return [false, 0];
        }

        if (selectedOption !== undefined && selectedOption !== null && currentQuestion.keys.includes(selectedOption.toString())) {
            return [true, 0];
        } else {
            return [false, 0];
        }
    }

    let val;
    let questions: Promise<Question[]> = $state(new Promise(() => null));
    let questionsRW: Promise<Question[]> = $state(new Promise(() => null));
    let questionsMath: Promise<Question[]> = $state(new Promise(() => null));

    // Precompute Bluebook sets for faster lookups
    const bluebookSets = $derived.by(() => ({
        math: new Set(lookup.mathLiveItems),
        reading: new Set(lookup.readingLiveItems),
    }));

    // Precompute selected difficulty levels as Set for O(1) lookups
    const selectedDifficulties = $derived.by(() => {
        const selected = new Set<number>();
        for (let i = 0; i < difficultySelected.length; i++) {
            if (difficultySelected[i]) {
                selected.add(i + 1); // Add 1 because score_band_range_cd is 1-based
            }
        }
        return selected;
    });

    // Precompute skill mapping for faster lookups
    const skillMap = $derived.by(() => {
        if (setup.section === null) return new Map();

        const domainData = Object.values(lookup.lookupData.domain)[setup.section] || [];
        const map = new Map<string, { id: number; text: string }>();

        for (const domain of domainData) {
            for (const skill of domain.skill) {
                map.set(domain.primaryClassCd, skill);
            }
        }

        return map;
    });

    // Group questions by skill - optimized version
    const questionsBySkill = (questions: Question[], sectionOverride: number | null = null) => {
        let filteredQuestions = (() => {
            if (!questions.length) return [];
            // Early return if no difficulty levels selected
            if (selectedDifficulties.size === 0) return [];
            // Get the appropriate Bluebook set once
            const currentSection = sectionOverride !== null ? sectionOverride : setup.section;
            const bluebookSet = currentSection === 1 ? bluebookSets.math : bluebookSets.reading;
            const result: Question[] = [];
            for (let i = 0; i < questions.length; i++) {
                const question = questions[i];
                // Fast difficulty check with Set lookup (O(1) vs O(n))
                if (!selectedDifficulties.has(question.score_band_range_cd)) {
                    continue;
                }
                // Fast Bluebook filter
                if (bluebookFilter !== 0) {
                    const isInBluebook = bluebookSet.has(question.external_id || "");
                    if ((bluebookFilter === 1 && !isInBluebook) || (bluebookFilter === 2 && isInBluebook)) {
                        continue;
                    }
                }
                result.push(question);
            }
            return result;
        })();
        if ((sectionOverride === null && setup.section === null) || !filteredQuestions.length) return {};

        const grouped: { [skillText: string]: Question[] } = {};
        const currentSection = sectionOverride !== null ? sectionOverride : setup.section;

        // Get skill map for the appropriate section
        const currentSkillMap = (() => {
            if (currentSection === null) return new Map();
            const domainData = Object.values(lookup.lookupData.domain)[currentSection] || [];
            const map = new Map<string, { id: number; text: string }>();
            for (const domain of domainData) {
                for (const skill of domain.skill) {
                    map.set(domain.primaryClassCd, skill);
                }
            }
            return map;
        })();

        for (const question of filteredQuestions) {
            const skill = currentSkillMap.get(question.primary_class_cd);
            if (skill) {
                const skillText = skill.text;
                if (grouped[skillText]) {
                    grouped[skillText].push(question);
                } else {
                    grouped[skillText] = [question];
                }
            }
        }

        return grouped;
    };

    $effect(() => {
        // console.log(lookup.lookupData.test, setup.test);
        if (setup.test !== null && setup.section === 2) {
            // Load both Reading & Writing and Math sections (section 2 = "All Sections")
            try {
                // Reading & Writing (section 0)
                const valRW = JSON.stringify({
                    asmtEventId: parseInt(lookup.lookupData.assessment[setup.test].id.toString()),
                    test: 1, // Reading & Writing is test 1
                    domain: Object.values(lookup.lookupData.domain)[0]
                        .map((v) => v.primaryClassCd)
                        .join(","),
                });
                questionsRW = loadQuestions(valRW);

                // Math (section 1)
                const valMath = JSON.stringify({
                    asmtEventId: parseInt(lookup.lookupData.assessment[setup.test].id.toString()),
                    test: 2, // Math is test 2
                    domain: Object.values(lookup.lookupData.domain)[1]
                        .map((v) => v.primaryClassCd)
                        .join(","),
                });
                questionsMath = loadQuestions(valMath);
            } catch {
                alert("Error", "Failed to load questions for both sections.");
            }
        } else if (setup.test !== null && setup.section !== null && setup.section < 2) {
            params.params = val = JSON.stringify({
                asmtEventId: parseInt(lookup.lookupData.assessment[setup.test].id.toString()),
                test: setup.section + 1,
                domain: Object.values(lookup.lookupData.domain)
                    [lookup.lookupData.test[setup.section].id - 1].map((v) => v.primaryClassCd)
                    .join(","),
            });
            if (val) {
                try {
                    questions = loadQuestions(val);
                } catch {
                    alert("Error", "Failed to load questions.");
                }
            }
        }
    });

    // Cleanup timer on component destroy
    onDestroy(() => {
        stopTimer();
    });
</script>

{#if isViewingQuestion && currentQuestion}
    <!-- Fixed Navigation Bar -->
    <div transition:slide class="fixed top-0 left-0 right-0 z-50 opacity-40 hover:opacity-100 transition-opacity bg-gray-900/50 backdrop-blur-sm border-b border-gray-700/50 px-4 py-3">
        <div class="flex items-center justify-between max-w-6xl mx-auto">
            <div class="flex items-center gap-4">
                <button onclick={exitQuestionViewer} class="cursor-pointer flex items-center gap-2 underline opacity-75 hover:opacity-100 rounded-lg transition-colors text-white font-medium">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                    </svg>
                    Back to Questions
                </button>
                <div class="text-white font-medium">
                    {selectedSkillName}
                </div>
            </div>

            <div class="flex items-center gap-4">
                <span class="text-gray-300 text-sm">
                    Question {currentQuestionShow} of {selectedSkillQuestions.length}
                </span>
                <div class="flex items-center gap-2">
                    <button onclick={previousQuestion} disabled={currentQuestionIndex === 0} class="disabled:cursor-not-allowed cursor-pointer underline opacity-75 hover:opacity-100 disabled:opacity-50 rounded-lg transition-colors text-white font-medium"> &lt; Previous </button>
                    <button onclick={nextQuestion} disabled={currentQuestionIndex === selectedSkillQuestions.length - 1} class="disabled:cursor-not-allowed cursor-pointer underline opacity-75 hover:opacity-100 disabled:opacity-50 rounded-lg transition-colors text-white font-medium"> Next &gt; </button>
                    <button onclick={randomQuestion} class="cursor-pointer underline opacity-75 hover:opacity-100 rounded-lg transition-colors text-white font-medium"> Random </button>
                </div>
            </div>
        </div>
    </div>

    <!-- Bluebook Component -->
    <div transition:slide>
        <Bluebook
            bind:question={currentQuestion}
            bind:questionOutside={selectedSkillQuestions[currentQuestionIndex]}
            bind:selectedOption
            bind:timer
            currentQuestionNumber={currentQuestionIndex}
            currentQuestionNumberShow={currentQuestionShow}
            total={null}
            {submitHandler}
            nextQuestionHandler={nextQuestion}
            previousQuestionHandler={previousQuestion}
            exitHandler={exitQuestionViewer}
            history={null}
            status={null}
            questionShouldBeReviewed={null}
        />
    </div>
{:else}
    <div class="flex min-h-screen w-screen justify-center bg-neutral-900/50 p-6 text-white backdrop-blur-sm" transition:fade>
        <div class="w-full max-w-6xl flex flex-col items-center">
            <div class="overflow-hidden rounded-2xl border border-white/10 bg-gray-900/80 shadow-2xl">
                <div class="border-b border-white/10 px-6 py-6">
                    <div class="text-sm font-semibold tracking-wide font-sans"><a href="/" class="hover:underline">QuestionableSAT</a></div>
                    <h1 class="mt-1 text-3xl font-bold">All available questions</h1>
                </div>
                <div class="divide-white/10 flex flex-row items-center p-5 flex-wrap gap-4 *:w-max">
                    <Input class="!bg-amber-950" name="Test" type="dropdown" bind:value={setup.test} elements={lookup.lookupData.assessment.map((v) => v.text)} />
                    <Input class="!bg-cyan-950" name="Section" type="dropdown" bind:value={setup.section} elements={[...lookup.lookupData.test.map((v) => v.text), "All Sections"]} />
                    <Input class="!bg-purple-950" name="Bluebook Filter" type="dropdown" bind:value={bluebookFilter} elements={["All Questions", "Bluebook Only", "Non-Bluebook Only"]} />
                    <div class="flex flex-col gap-0 inset-0 rounded-2xl overflow-hidden border border-white/10">
                        <div class="flex flex-row *:cursor-pointer shadow-lg bg-gray-800/50 backdrop-blur-sm">
                            <button class="flex-1 py-4 px-3 text-lg font-semibold text-white transition-all bg-emerald-900 hover:[&]:bg-emerald-700 {difficultySelected[0] ? '!bg-emerald-600' : 'opacity-75'}" onclick={() => (difficultySelected[0] = !difficultySelected[0])}> 1 </button>
                            <button class="flex-1 py-4 px-3 text-lg font-semibold text-white transition-all bg-green-900 hover:bg-green-800 {difficultySelected[1] ? '!bg-green-700' : 'opacity-75'}" onclick={() => (difficultySelected[1] = !difficultySelected[1])}> 2 </button>
                            <button class="flex-1 py-4 px-3 text-lg font-semibold text-white transition-all bg-lime-900 hover:bg-lime-700 {difficultySelected[2] ? '!bg-amber-600' : 'opacity-75'}" onclick={() => (difficultySelected[2] = !difficultySelected[2])}> 3 </button>
                            <button class="flex-1 py-4 px-3 text-lg font-semibold text-white transition-all bg-yellow-800 hover:bg-yellow-700 {difficultySelected[3] ? '!bg-yellow-600' : 'opacity-75'}" onclick={() => (difficultySelected[3] = !difficultySelected[3])}> 4 </button>
                            <button class="flex-1 py-4 px-3 text-lg font-semibold text-white transition-all bg-orange-900 hover:bg-orange-800 {difficultySelected[4] ? '!bg-orange-600' : 'opacity-75'} bg-" onclick={() => (difficultySelected[4] = !difficultySelected[4])}> 5 </button>
                            <button class="flex-1 py-4 px-3 text-lg font-semibold text-white transition-all bg-rose-900 hover:bg-rose-800 {difficultySelected[5] ? '!bg-rose-700' : 'opacity-75'}" onclick={() => (difficultySelected[5] = !difficultySelected[5])}> 6 </button>
                            <button class="flex-1 py-4 px-3 text-lg font-semibold text-white transition-all bg-red-900 hover:bg-red-800 {difficultySelected[6] ? '!bg-red-700' : 'opacity-75'}" onclick={() => (difficultySelected[6] = !difficultySelected[6])}> 7 </button>
                        </div>
                        <div class="flex flex-row *:py-1 *:transition-colors">
                            <button onclick={() => ((difficultySelected[0] = !difficultySelected[0]), (difficultySelected[1] = !difficultySelected[1]))} class="flex-2/7 bg-green-900 hover:bg-green-800 active:bg-green-700 cursor-pointer text-sm">Easy</button>
                            <button onclick={() => ((difficultySelected[2] = !difficultySelected[2]), (difficultySelected[3] = !difficultySelected[3]), (difficultySelected[4] = !difficultySelected[4]))} class="flex-3/7 cursor-pointer bg-yellow-900 hover:bg-yellow-800 active:bg-yellow-700 text-sm">Medium</button>
                            <button onclick={() => ((difficultySelected[5] = !difficultySelected[5]), (difficultySelected[6] = !difficultySelected[6]))} class="flex-2/7 bg-red-900 hover:bg-red-800 active:bg-red-700 cursor-pointer text-sm">Hard</button>
                        </div>
                    </div>
                </div>

                <div class="flex flex-col gap-4 px-6 py-6 text-sm text-gray-300 md:flex-row md:items-center md:justify-between">
                    <a href="/topics" class="text-indigo-300 transition hover:text-indigo-200 hover:underline">Guide me instead.</a>
                    <div class="flex items-center gap-2 text-gray-400">
                        {#if setup.section === 2}
                            {#await Promise.all([questionsRW, questionsMath])}
                                Loading questions...
                                <Spinner size={16} strokeWidth={2} />
                            {:then [questionsRWData, questionsMathData]}
                                {Object.values(questionsBySkill(questionsRWData, 0)).flat().length + Object.values(questionsBySkill(questionsMathData, 1)).flat().length} questions selected
                            {:catch}
                                Error loading sections
                            {/await}
                        {:else}
                            {#await questions}
                                Loading questions...
                                <Spinner size={16} strokeWidth={2} />
                            {:then questionsData}
                                {Object.values(questionsBySkill(questionsData)).flat().length} questions selected
                            {:catch}
                                Error loading questions
                            {/await}
                        {/if}
                        {#if isFiltering}
                            <Spinner size={16} strokeWidth={2} />
                        {/if}
                    </div>
                </div>
            </div>

            <!-- Question sections grouped by skill -->
            <div class="w-full max-w-4xl mt-6 space-y-3" transition:slide>
                {#if setup.test !== null && setup.section === 2}
                    {#await Promise.all([questionsRW, questionsMath])}
                        <div class="overflow-hidden rounded-2xl border border-white/10 bg-gray-900/80 shadow-xl" transition:slide>
                            <div class="p-8 text-center">
                                <div class="flex flex-col items-center gap-4">
                                    <Spinner />
                                    <div class="text-gray-400 text-lg">Loading both sections...</div>
                                </div>
                            </div>
                        </div>
                    {:then [questionsRWData, questionsMathData]}
                        {#if questionsRWData.length > 0 || questionsMathData.length > 0}
                            <div class="flex flex-col gap-4 px-6 py-2 text-sm text-gray-300 md:flex-row md:items-center md:justify-between">
                                <button onclick={() => enterQuestionViewer(`All SAT Questions`, [...Object.values(questionsBySkill(questionsRWData, 0)).flat(), ...Object.values(questionsBySkill(questionsMathData, 1)).flat()])} class="text-indigo-300 transition hover:text-indigo-200 hover:underline cursor-pointer"
                                    >Practice all {Object.values(questionsBySkill(questionsRWData, 0)).flat().length + Object.values(questionsBySkill(questionsMathData, 1)).flat().length} questions from both sections.</button
                                >
                            </div>

                            <!-- Reading & Writing Section -->
                            {#if questionsRWData.length > 0}
                                <div class="overflow-hidden rounded-2xl border border-white/10 bg-gray-900/80 shadow-xl mb-6" transition:slide>
                                    <div class="border-b border-white/10 px-6 py-4">
                                        <div class="flex items-center gap-3">
                                            <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-green-600 to-blue-600">
                                                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path
                                                        stroke-linecap="round"
                                                        stroke-linejoin="round"
                                                        stroke-width="2"
                                                        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                                                    ></path>
                                                </svg>
                                            </div>
                                            <div>
                                                <h2 class="text-xl font-bold text-white">Reading & Writing</h2>
                                                <p class="text-sm text-gray-400">{Object.values(questionsBySkill(questionsRWData, 0)).flat().length} questions available</p>
                                            </div>
                                        </div>
                                    </div>
                                    {#each Object.entries(questionsBySkill(questionsRWData, 0)) as [skillText, skillQuestions]}
                                        {#if skillQuestions.length > 0}
                                            <div class="border border-gray-700/50 bg-gray-900/60 backdrop-blur-sm overflow-hidden" transition:slide>
                                                <button onclick={() => toggleSkill(skillText)} class="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-800/40 transition-colors group">
                                                    <div class="flex items-center gap-4">
                                                        <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600">
                                                            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                                            </svg>
                                                        </div>
                                                        <div class="text-left">
                                                            <h3 class="text-lg font-semibold text-white group-hover:text-blue-300 transition-colors">
                                                                {skillText}
                                                            </h3>
                                                            <p class="text-sm text-gray-400">
                                                                {skillQuestions.length} question{skillQuestions.length === 1 ? "" : "s"} available
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <!-- Expand/collapse icon -->
                                                    <div class="flex items-center gap-3">
                                                        <span class="text-xs text-gray-500 px-2 py-1 bg-gray-800 rounded-full">
                                                            {skillQuestions.filter((q) => {
                                                                const isInBluebook = setup.section === 1 ? lookup.mathLiveItems.includes(q.external_id || "") : lookup.readingLiveItems.includes(q.external_id || "");
                                                                return isInBluebook;
                                                            }).length} in Bluebook
                                                        </span>
                                                        <svg class="w-5 h-5 text-gray-400 transition-transform duration-200 {collapsedSkills.has(skillText) ? 'rotate-0' : 'rotate-180'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                                                        </svg>
                                                    </div>
                                                </button>
                                                {#if collapsedSkills.has(skillText)}
                                                    {@const questionsBySkillCode: {[key: string]: Question[]} = skillQuestions.reduce((acc: {[key: string]: Question[]}, question) => {
                                                        const skillCode = question.skill_cd;
                                                        if (!acc[skillCode]) {
                                                            acc[skillCode] = [];
                                                        }
                                                        acc[skillCode].push(question);
                                                        return acc;
                                                    }, {})}
                                                    <div class="border-t border-gray-700/30" transition:slide>
                                                        <div class="flex flex-col gap-4 px-6 py-2 text-sm text-gray-300 md:flex-row md:items-center md:justify-between">
                                                            <button onclick={() => enterQuestionViewer(`All ${skillText} Questions`, skillQuestions)} class="text-indigo-300 transition hover:text-indigo-200 hover:underline cursor-pointer">Practice all {skillQuestions.length} questions in this topic.</button>
                                                        </div>
                                                        {#each Object.entries(questionsBySkillCode) as [skillCode, skillCodeQuestions]}
                                                            <div class="border border-gray-700/40 bg-gray-800/30 overflow-hidden">
                                                                <!-- Skill code header -->
                                                                <button onclick={() => enterQuestionViewer(`${skillText} - ${skillCode}`, skillCodeQuestions)} class="w-full px-4 py-3 bg-gray-800/30 border-b border-gray-700/40 hover:bg-gray-700/50 transition-colors group cursor-pointer">
                                                                    <div class="flex items-center justify-between">
                                                                        <div class="flex items-center gap-3">
                                                                            <span class="px-2 py-1 text-xs font-bold bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full group-hover:from-indigo-500 group-hover:to-purple-500 transition-colors">
                                                                                {skillCode}
                                                                            </span>
                                                                            <span class="text-sm font-medium text-white group-hover:text-blue-300 transition-colors">
                                                                                {skillCodeQuestions[0]?.skill_desc || "Unknown Skill"}
                                                                            </span>
                                                                        </div>
                                                                        <div class="flex items-center gap-2">
                                                                            <span class="text-xs text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity"> Click to practice → </span>
                                                                            <span class="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded-full">
                                                                                {skillCodeQuestions.length} question{skillCodeQuestions.length === 1 ? "" : "s"}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </button>
                                                            </div>
                                                        {/each}
                                                    </div>
                                                {/if}
                                            </div>
                                        {/if}
                                    {/each}
                                </div>
                            {/if}

                            <!-- Math Section -->
                            {#if questionsMathData.length > 0}
                                <div class="overflow-hidden rounded-2xl border border-white/10 bg-gray-900/80 shadow-xl" transition:slide>
                                    <div class="border-b border-white/10 px-6 py-4">
                                        <div class="flex items-center gap-3">
                                            <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-orange-600 to-red-600">
                                                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                                                </svg>
                                            </div>
                                            <div>
                                                <h2 class="text-xl font-bold text-white">Math</h2>
                                                <p class="text-sm text-gray-400">{Object.values(questionsBySkill(questionsMathData, 1)).flat().length} questions available</p>
                                            </div>
                                        </div>
                                    </div>
                                    {#each Object.entries(questionsBySkill(questionsMathData, 1)) as [skillText, skillQuestions]}
                                        {#if skillQuestions.length > 0}
                                            <div class="border border-gray-700/50 bg-gray-900/60 backdrop-blur-sm overflow-hidden" transition:slide>
                                                <button onclick={() => toggleSkill(skillText)} class="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-800/40 transition-colors group">
                                                    <div class="flex items-center gap-4">
                                                        <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-orange-600 to-red-600">
                                                            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                                                            </svg>
                                                        </div>
                                                        <div class="text-left">
                                                            <h3 class="text-lg font-semibold text-white group-hover:text-orange-300 transition-colors">
                                                                {skillText}
                                                            </h3>
                                                            <p class="text-sm text-gray-400">
                                                                {skillQuestions.length} question{skillQuestions.length === 1 ? "" : "s"} available
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <!-- Expand/collapse icon -->
                                                    <div class="flex items-center gap-3">
                                                        <span class="text-xs text-gray-500 px-2 py-1 bg-gray-800 rounded-full">
                                                            {skillQuestions.filter((q) => {
                                                                const isInBluebook = lookup.mathLiveItems.includes(q.external_id || "");
                                                                return isInBluebook;
                                                            }).length} in Bluebook
                                                        </span>
                                                        <svg class="w-5 h-5 text-gray-400 transition-transform duration-200 {collapsedSkills.has(skillText) ? 'rotate-0' : 'rotate-180'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                                                        </svg>
                                                    </div>
                                                </button>

                                                <!-- Collapsible content -->
                                                {#if collapsedSkills.has(skillText)}
                                                    {@const questionsBySkillCode: {[key: string]: Question[]} = skillQuestions.reduce((acc: {[key: string]: Question[]}, question) => {
                                                        const skillCode = question.skill_cd;
                                                        if (!acc[skillCode]) {
                                                            acc[skillCode] = [];
                                                        }
                                                        acc[skillCode].push(question);
                                                        return acc;
                                                    }, {})}
                                                    <div class="border-t border-gray-700/30" transition:slide>
                                                        <div class="flex flex-col gap-4 px-6 py-2 text-sm text-gray-300 md:flex-row md:items-center md:justify-between">
                                                            <button onclick={() => enterQuestionViewer(`All ${skillText} Questions`, skillQuestions)} class="text-indigo-300 transition hover:text-indigo-200 hover:underline cursor-pointer">Practice all {skillQuestions.length} questions in this topic.</button>
                                                        </div>
                                                        {#each Object.entries(questionsBySkillCode) as [skillCode, skillCodeQuestions]}
                                                            <div class="border border-gray-700/40 bg-gray-800/30 overflow-hidden">
                                                                <!-- Skill code header -->
                                                                <button onclick={() => enterQuestionViewer(`${skillText} - ${skillCode}`, skillCodeQuestions)} class="w-full px-4 py-3 bg-gray-800/30 border-b border-gray-700/40 hover:bg-gray-700/50 transition-colors group cursor-pointer">
                                                                    <div class="flex items-center justify-between">
                                                                        <div class="flex items-center gap-3">
                                                                            <span class="px-2 py-1 text-xs font-bold bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-full group-hover:from-orange-500 group-hover:to-red-500 transition-colors">
                                                                                {skillCode}
                                                                            </span>
                                                                            <span class="text-sm font-medium text-white group-hover:text-orange-300 transition-colors">
                                                                                {skillCodeQuestions[0]?.skill_desc || "Unknown Skill"}
                                                                            </span>
                                                                        </div>
                                                                        <div class="flex items-center gap-2">
                                                                            <span class="text-xs text-orange-400 opacity-0 group-hover:opacity-100 transition-opacity"> Click to practice → </span>
                                                                            <span class="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded-full">
                                                                                {skillCodeQuestions.length} question{skillCodeQuestions.length === 1 ? "" : "s"}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </button>
                                                            </div>
                                                        {/each}
                                                    </div>
                                                {/if}
                                            </div>
                                        {/if}
                                    {/each}
                                </div>
                            {/if}
                        {:else}
                            <div class="overflow-hidden rounded-2xl border border-white/10 bg-gray-900/80 shadow-xl" transition:slide>
                                <div class="p-8 text-center">
                                    <div class="text-gray-400 text-lg">No questions match your filter selection</div>
                                    <div class="text-sm text-gray-500 mt-2">Try selecting different options above</div>
                                </div>
                            </div>
                        {/if}
                    {:catch error}
                        <div class="overflow-hidden rounded-2xl border border-white/10 bg-gray-900/80 shadow-xl" transition:slide>
                            <div class="p-8 text-center">
                                <div class="text-gray-400 text-lg">Error loading both sections</div>
                            </div>
                        </div>
                    {/await}
                {:else if setup.test !== null && setup.section !== null && setup.section < 2}
                    {#await questions}
                        <div class="overflow-hidden rounded-2xl border border-white/10 bg-gray-900/80 shadow-xl" transition:slide>
                            <div class="p-8 text-center">
                                <div class="flex flex-col items-center gap-4">
                                    <Spinner />
                                    <div class="text-gray-400 text-lg">Loading questions...</div>
                                </div>
                            </div>
                        </div>
                    {:then questions}
                        {#if questions.length > 0}
                            <div class="flex flex-col gap-4 px-6 py-2 text-sm text-gray-300 md:flex-row md:items-center md:justify-between">
                                <button onclick={() => enterQuestionViewer(`All ${setup.section === 0 ? "Reading & Writing" : "Math"} Questions`, Object.values(questionsBySkill(questions)).flat())} class="text-indigo-300 transition hover:text-indigo-200 hover:underline cursor-pointer"
                                    >Practice all {Object.values(questionsBySkill(questions)).flat().length} questions from this section.</button
                                >
                            </div>
                            {#each Object.entries(questionsBySkill(questions)) as [skillText, skillQuestions]}
                                {#if skillQuestions.length > 0}
                                    <div class="border border-gray-700/50 rounded-xl bg-gray-900/60 backdrop-blur-sm overflow-hidden" transition:slide>
                                        <!-- Header - clickable to toggle -->
                                        <button onclick={() => toggleSkill(skillText)} class="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-800/40 transition-colors group">
                                            <div class="flex items-center gap-4">
                                                <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600">
                                                    <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                                    </svg>
                                                </div>
                                                <div class="text-left">
                                                    <h3 class="text-lg font-semibold text-white group-hover:text-blue-300 transition-colors">
                                                        {skillText}
                                                    </h3>
                                                    <p class="text-sm text-gray-400">
                                                        {skillQuestions.length} question{skillQuestions.length === 1 ? "" : "s"} available
                                                    </p>
                                                </div>
                                            </div>

                                            <!-- Expand/collapse icon -->
                                            <div class="flex items-center gap-3">
                                                <span class="text-xs text-gray-500 px-2 py-1 bg-gray-800 rounded-full">
                                                    {skillQuestions.filter((q) => {
                                                        const isInBluebook = setup.section === 1 ? lookup.mathLiveItems.includes(q.external_id || "") : lookup.readingLiveItems.includes(q.external_id || "");
                                                        return isInBluebook;
                                                    }).length} in Bluebook
                                                </span>
                                                <svg class="w-5 h-5 text-gray-400 transition-transform duration-200 {collapsedSkills.has(skillText) ? 'rotate-0' : 'rotate-180'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                                                </svg>
                                            </div>
                                        </button>

                                        <!-- Collapsible content -->
                                        {#if collapsedSkills.has(skillText)}
                                            {@const questionsBySkillCode: {[key: string]: Question[]} = skillQuestions.reduce((acc: {[key: string]: Question[]}, question) => {
                                                const skillCode = question.skill_cd;
                                                if (!acc[skillCode]) {
                                                    acc[skillCode] = [];
                                                }
                                                acc[skillCode].push(question);
                                                return acc;
                                            }, {})}
                                            <div class="border-t border-gray-700/30" transition:slide>
                                                <div class="flex flex-col gap-4 px-6 py-2 text-sm text-gray-300 md:flex-row md:items-center md:justify-between">
                                                    <button onclick={() => enterQuestionViewer(`All ${skillText} Questions`, skillQuestions)} class="text-indigo-300 transition hover:text-indigo-200 hover:underline cursor-pointer">Practice all {skillQuestions.length} questions in this topic.</button>
                                                </div>
                                                {#each Object.entries(questionsBySkillCode) as [skillCode, skillCodeQuestions]}
                                                    <div class="border border-gray-700/40 bg-gray-800/30 overflow-hidden">
                                                        <!-- Skill code header -->
                                                        <button onclick={() => enterQuestionViewer(`${skillText} - ${skillCode}`, skillCodeQuestions)} class="w-full px-4 py-3 bg-gray-800/30 border-b border-gray-700/40 hover:bg-gray-700/50 transition-colors group cursor-pointer">
                                                            <div class="flex items-center justify-between">
                                                                <div class="flex items-center gap-3">
                                                                    <span class="px-2 py-1 text-xs font-bold bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full group-hover:from-indigo-500 group-hover:to-purple-500 transition-colors">
                                                                        {skillCode}
                                                                    </span>
                                                                    <span class="text-sm font-medium text-white group-hover:text-blue-300 transition-colors">
                                                                        {skillCodeQuestions[0]?.skill_desc || "Unknown Skill"}
                                                                    </span>
                                                                </div>
                                                                <div class="flex items-center gap-2">
                                                                    <span class="text-xs text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity"> Click to practice → </span>
                                                                    <span class="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded-full">
                                                                        {skillCodeQuestions.length} question{skillCodeQuestions.length === 1 ? "" : "s"}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </button>
                                                    </div>
                                                {/each}
                                            </div>
                                        {/if}
                                    </div>
                                {/if}
                            {/each}
                        {:else}
                            <div class="overflow-hidden rounded-2xl border border-white/10 bg-gray-900/80 shadow-xl" transition:slide>
                                <div class="p-8 text-center">
                                    <div class="text-gray-400 text-lg">No questions match your filter selection</div>
                                    <div class="text-sm text-gray-500 mt-2">Try selecting different options above</div>
                                </div>
                            </div>
                        {/if}
                    {:catch error}
                        <div class="overflow-hidden rounded-2xl border border-white/10 bg-gray-900/80 shadow-xl" transition:slide>
                            <div class="p-8 text-center">
                                <div class="text-gray-400 text-lg">Error loading questions</div>
                            </div>
                        </div>
                    {/await}
                {/if}
            </div>
        </div>
    </div>
{/if}
