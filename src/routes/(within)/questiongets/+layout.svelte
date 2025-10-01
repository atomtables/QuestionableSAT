<script lang="ts">
    import { goto } from "$app/navigation";
    import { selectedDetails, lookup, setQuestions, questions, onlineStatus } from "$lib/clientstate/states.svelte";
    import { onMount, tick } from "svelte";
    import { alert } from "$lib/components/Dialog.svelte";
    import { isQuestionArray, type Question } from "$lib/types/types";

    const loadFromOffline = async () => {
        for (const file of onlineStatus[1]) {
            if (file.name === 'get-questions.json') {
                const text = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve(e.target?.result as string);
                    reader.onerror = () => reject(reader.error);
                    reader.readAsText(file);
                });
                try {
                    const json = JSON.parse(text);
                    const val = json[JSON.stringify({
                        asmtEventId: parseInt(lookup.lookupData.assessment[parseInt(selectedDetails.test)].id.toString()),
                        test: parseInt(selectedDetails.section) + 1,
                        domain: Object.values(lookup.lookupData.domain)[lookup.lookupData.test[parseInt(selectedDetails.section)].id - 1].map(v => v.primaryClassCd).join(',')
                    })];
                    if (!val) throw new Error();
                    if (!isQuestionArray(val)) { throw new Error(); }
                    return val;
                } catch (err: any) {
                    alert("Offline mode", "Unable to load this archive. Ensure it is not corrupted and that it is valid.");
                    throw new Error("The offline archive is invalid.");
                }
            }
        }
    }

    onMount(() => {
        if (!(selectedDetails.test !== undefined && selectedDetails.section !== undefined && selectedDetails.topics !== undefined && selectedDetails.subtopics !== undefined)) {
            goto("/topics")
            return;
        }
        try {
            if (!onlineStatus[0] && onlineStatus[1]) {
                let promise = loadFromOffline();
                setQuestions(promise);
            } else {
                let json = (fetch("https://qbank-api.collegeboard.org/msreportingquestionbank-prod/questionbank/digital/get-questions", {
                    "credentials": "omit",
                    "headers": {
                        "Accept": "*/*",
                        "Accept-Language": "en-US,en;q=0.5",
                        "Content-Type": "text/plain;charset=UTF-8",
                    },
                    "referrer": "https://satsuitequestionbank.collegeboard.org/",
                    "body": JSON.stringify({
                        // @ts-ignore
                        asmtEventId: parseInt(lookup.lookupData.assessment[parseInt(selectedDetails.test)].id),
                        // @ts-ignore
                        test: parseInt(selectedDetails.section) + 1,
                        // @ts-ignore
                        domain: Object.values(lookup.lookupData.domain)[lookup.lookupData.test[parseInt(selectedDetails.section)].id - 1].map(v => v.primaryClassCd).join(',')
                    }),
                    "method": "POST",
                    "mode": "cors"
                })).then((v: Response) => v.json())
                setQuestions(json)
            }
        } catch (e) {
            console.error(e, Object.values(lookup.lookupData.domain), Object.values(lookup.lookupData.domain)[lookup.lookupData.assessment[parseInt(selectedDetails.section)].id - 1], lookup.lookupData.assessment[parseInt(selectedDetails.section)].id - 1, parseInt(selectedDetails.section))
            // await alert(`The Collegeboard servers may not be functional at the moment.`, `${e}.`)
        }
    })

    let { children } = $props();
</script>

{@render children?.()}
