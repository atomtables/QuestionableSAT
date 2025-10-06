<script lang='ts'>
    import Button from "$lib/components/Button.svelte";
    import { isLookupData, type LookupData } from "$lib/types/types";
    import { fade } from "svelte/transition";

    let output = $state("")
    let progress = $state(0)
    let totalQuestions = $state(0)
    let processedQuestions = $state(0)
    let logContainer: HTMLDivElement = $state();

    function addToOutput(message: string) {
        output += message + "\n";
        // Auto-scroll to bottom
        if (logContainer) {
            setTimeout(() => {
                logContainer.scrollTop = logContainer.scrollHeight;
            }, 0);
        }
    }

    function updateProgress() {
        if (totalQuestions > 0) {
            progress = Math.round((processedQuestions / totalQuestions) * 100);
        }
    }

    async function archiveCollegeBoardData() {
        try {
            output = ""; // Clear previous output
            progress = 0;
            totalQuestions = 0;
            processedQuestions = 0;
            
            // Check if File System Access API is supported
            if (!("showDirectoryPicker" in window)) {
                alert("File System Access API is not supported in this browser. Please use Chrome, Edge, or another Chromium-based browser.");
                return;
            }

            // Ask user to select a directory
            // @ts-ignore
            const directoryHandle = await window?.showDirectoryPicker?.({
                mode: "readwrite",
            });

            addToOutput("Starting CollegeBoard archive process...");

            // Create archive subdirectory
            const archiveHandle = await directoryHandle.getDirectoryHandle("archive", { create: true });

            // Fetch lookup data
            addToOutput("Fetching lookup data...");
            const lookupRes = await fetch("https://qbank-api.collegeboard.org/msreportingquestionbank-prod/questionbank/lookup", {
                credentials: "omit",
                headers: {
                    Accept: "application/json, text/plain, */*",
                    "Accept-Language": "en-US,en;q=0.5",
                },
                method: "GET",
            });

            if (!lookupRes.ok) throw new Error("Failed to fetch lookup data");
            const lookup: LookupData = await lookupRes.json();
            if (!isLookupData(lookup)) throw new Error("Invalid lookup data");

            // Save lookup data
            const lookupFile = await archiveHandle.getFileHandle("lookup.json", { create: true });
            const lookupWritable = await lookupFile.createWritable();
            await lookupWritable.write(JSON.stringify(lookup, null, 2));
            await lookupWritable.close();
            addToOutput("Saved lookup data.");

            let questions = {};

            // Fetch questions for each test and section
            for (const test of lookup.lookupData.assessment) {
                for (const section of lookup.lookupData.test) {
                    const question = await fetch("https://qbank-api.collegeboard.org/msreportingquestionbank-prod/questionbank/digital/get-questions", {
                        credentials: "omit",
                        headers: {
                            Accept: "*/*",
                            "Accept-Language": "en-US,en;q=0.5",
                            "Content-Type": "text/plain;charset=UTF-8",
                        },
                        referrer: "https://satsuitequestionbank.collegeboard.org/",
                        body: JSON.stringify({
                            asmtEventId: parseInt(test.id.toString()),
                            test: parseInt(section.id.toString()),
                            domain: Object.values(lookup.lookupData.domain)
                                [section.id - 1].map((v) => v.primaryClassCd)
                                .join(","),
                        }),
                        method: "POST",
                        mode: "cors",
                    });
                    if (!question.ok) {
                        throw new Error(`Failed to fetch question for test ${test}, section ${section.id}`);
                    }
                    questions[
                        JSON.stringify({
                            asmtEventId: parseInt(test.id.toString()),
                            test: parseInt(section.id.toString()),
                            domain: Object.values(lookup.lookupData.domain)
                                [section.id - 1].map((v) => v.primaryClassCd)
                                .join(","),
                        })
                    ] = await question.json();
                    addToOutput(`Saved question data for test: ${test.id}, section: ${section.id}`);
                }
            }

            // Save questions data
            const questionsFile = await archiveHandle.getFileHandle("get-questions.json", { create: true });
            const questionsWritable = await questionsFile.createWritable();
            await questionsWritable.write(JSON.stringify(questions, null, 2));
            await questionsWritable.close();

            // Count total questions for progress tracking
            for (const test of lookup.lookupData.assessment) {
                for (const section of lookup.lookupData.test) {
                    const key = JSON.stringify({
                        asmtEventId: parseInt(test.id.toString()),
                        test: parseInt(section.id.toString()),
                        domain: Object.values(lookup.lookupData.domain)
                            [section.id - 1].map((v) => v.primaryClassCd)
                            .join(","),
                    });
                    totalQuestions += questions[key]?.length || 0;
                }
            }
            addToOutput(`Total questions to process: ${totalQuestions}`);

            let current = 0;

            // Helper function to write file in browser
            async function writeFile(directoryHandle, filePath, content) {
                const pathParts = filePath.split("/");
                let currentHandle = directoryHandle;

                // Create nested directories if needed
                for (let i = 0; i < pathParts.length - 1; i++) {
                    currentHandle = await currentHandle.getDirectoryHandle(pathParts[i], { create: true });
                }

                // Create and write file
                const fileName = pathParts[pathParts.length - 1];
                const fileHandle = await currentHandle.getFileHandle(fileName, { create: true });
                const writable = await fileHandle.createWritable();
                await writable.write(content);
                await writable.close();
            }

            // Fetch individual question details using same .then() method as original
            for (const test of lookup.lookupData.assessment) {
                for (const section of lookup.lookupData.test) {
                    for (const question of questions[
                        JSON.stringify({
                            asmtEventId: parseInt(test.id.toString()),
                            test: parseInt(section.id.toString()),
                            domain: Object.values(lookup.lookupData.domain)
                                [section.id - 1].map((v) => v.primaryClassCd)
                                .join(","),
                        })
                    ]) {
                        current++;
                        processedQuestions++;
                        updateProgress();
                        addToOutput(`Processing question ${processedQuestions}/${totalQuestions} (${progress}%): ${question.external_id || question.ibn || question.uId}`);
                        
                        while (current > 8) {
                            // browser limitations
                            await new Promise((resolve) => setTimeout(resolve, 200));
                        }
                        fetch("https://qbank-api.collegeboard.org/msreportingquestionbank-prod/questionbank/digital/get-question", {
                            credentials: "omit",
                            headers: {
                                Accept: "application/json, text/plain, */*",
                                "Accept-Language": "en-US,en;q=0.5",
                                "Content-Type": "application/json",
                            },
                            referrer: "https://satsuitequestionbank.collegeboard.org/",
                            body: JSON.stringify({
                                external_id: question.external_id,
                            }),
                            method: "POST",
                            mode: "cors",
                        })
                            .then((res) => {
                                res.json()
                                    .then((detail) => {
                                        if (!res.ok || detail?.type === undefined) {
                                            // maybe we need to load in via json
                                            if (question.ibn) {
                                                fetch(`https://saic.collegeboard.org/disclosed/${question.ibn}.json`, {
                                                    credentials: "omit",
                                                    headers: {
                                                        Accept: "application/json, text/plain, */*",
                                                        "Accept-Language": "en-US,en;q=0.5",
                                                    },
                                                    referrer: "https://satsuitequestionbank.collegeboard.org/",
                                                    method: "GET",
                                                    mode: "cors",
                                                })
                                                    .then((res2) => {
                                                        if (!res2.ok) {
                                                            throw new Error("Failed to retrieve question detail");
                                                        } else {
                                                            res2.json().then((v) => {
                                                                writeFile(archiveHandle, `${test.id}/${section.id}/${question.ibn}.json`, JSON.stringify(v, null, 2)).then(() => {
                                                                    addToOutput(`Saved question detail for ibn: ${question.ibn}`);
                                                                });
                                                            });
                                                        }
                                                    })
                                                    .catch(() => {
                                                        throw new Error("Failed to retrieve question detail");
                                                    });
                                            } else {
                                                throw new Error("Failed to retrieve question detail");
                                            }
                                        } else {
                                            writeFile(archiveHandle, `${test.id}/${section.id}/${question.external_id}.json`, JSON.stringify(detail, null, 2)).then(() => {
                                                addToOutput(`Saved question detail for external_id: ${question.external_id}, ibn: ${question.ibn}, uid: ${question.uId}`);
                                            });
                                        }
                                    })
                                    .catch((err) => {
                                        addToOutput(`Failed to retrieve question with uid: ${question.uId}, error: ${err}`);
                                    });
                            })
                            .catch((err) => {
                                addToOutput(`Failed to retrieve question with uid: ${question.uId}, error: ${err}`);
                            })
                            .finally(() => current--);
                    }
                }
            }

            addToOutput("Archive process completed successfully!");
            alert('CollegeBoard archive completed successfully! Check the selected directory for the "archive" folder.');
        } catch (error) {
            addToOutput(`Archive process failed: ${error.message}`);
            alert(`Archive process failed: ${error.message}`);
        }
    }

    let isSupported = $derived(("showDirectoryPicker" in window));
</script>

<div class="flex flex-col w-screen min-h-screen items-center justify-center bg-neutral-900/50 backdrop-blur-sm p-10 bg-opacity-50 text-white" transition:fade={{duration: 200}}>
    <div class="max-w-3xl mx-auto w-full space-y-8">
        <div class="flex flex-col items-center gap-5">
            <div class="font-bold font-sans"><a href="/" class="hover:underline">QuestionableSAT</a></div>
        </div>

        <!-- Archive Section -->
        <div class="space-y-6 bg-gray-800 rounded-lg p-6 shadow-md">
            <div>
                <div class="text-2xl font-bold">CollegeBoard Archiver</div>
                <div class="text-gray-300 mt-2">Download and archive SAT questions to your local machine. This will save all questions from the CollegeBoard database to a directory of your choice.</div>
                <div class="text-sm text-gray-300">
                    Disclaimer: distribution of CollegeBoard questions are against the Terms of Service, and can get your
                    scores cancelled. This tool is only designed for educational purposes (to educate) and NOT for any use
                    forbidden by CollegeBoard.
                </div>
            </div>

            <div>
                <Button disabled={!isSupported} onclick={() => archiveCollegeBoardData()}>Start Archive Process</Button>
            </div>

            {#if !isSupported}
                <div>
                    <div class="text-red-500">File System Access API is not supported in this browser.</div>
                    <div>
                        You can still use the archive feature by opening this website in a supported browser, or by
                        running a JavaScript script with Node.JS. Specifically <a class="text-blue-400 underline" href="/index.mjs">this script</a>.
                    </div>
                    <div class="text-sm text-gray-300">
                        Make sure you verify that the script does what it says. Don't run random scripts off the internet.
                    </div>
                </div>
            {/if}

            {#if output}
                <div class="space-y-4">
                    <!-- Progress Bar -->
                    {#if totalQuestions > 0}
                        <div class="bg-gray-700 rounded-lg p-4">
                            <div class="flex justify-between items-center mb-3">
                                <span class="text-white font-medium">Archive Progress</span>
                                <span class="text-blue-400 font-mono text-sm">{processedQuestions}/{totalQuestions} ({progress}%)</span>
                            </div>
                            <div class="w-full bg-gray-600 rounded-full h-3">
                                <div 
                                    class="bg-blue-500 h-3 rounded-full transition-all duration-300 ease-out"
                                    style="width: {progress}%"
                                ></div>
                            </div>
                        </div>
                    {/if}
                    
                    <!-- Output Log -->
                    <div class="bg-gray-700 rounded-lg p-4">
                        <div class="text-white font-bold mb-3">Archive Log</div>
                        <div bind:this={logContainer} class="bg-black rounded-lg p-3 max-h-80 overflow-y-auto scroll-smooth">
                            <pre class="text-green-400 text-sm whitespace-pre-wrap font-mono">{output}</pre>
                        </div>
                    </div>
                </div>
            {/if}
        </div>

        <!-- Info Section -->
        <div class="bg-gray-800 rounded-lg p-6 shadow-md">
            <div class="text-xl font-bold mb-3">Notes</div>
            <div class="text-gray-300 space-y-2">
                <div>• Requires a Chromium-based browser (Chrome, Edge, Opera)</div>
                <div>• ensure about 100 megabytes of storage (yes 100MB not mB, its only like 90 but just in case.)</div>
                <div>• Process may take several minutes (hours) depending on connection speed</div>
            </div>
        </div>
    </div>
</div>