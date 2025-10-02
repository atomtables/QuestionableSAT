<script lang="ts">
    import { goto } from "$app/navigation";
    import { selectedDetails, lookup, setQuestions, questions, onlineStatus } from "$lib/clientstate/states.svelte";
    import { onMount, tick } from "svelte";
    import { alert } from "$lib/components/Dialog.svelte";
    import { isQuestionArray, type Question } from "$lib/types/types";
    import { page } from "$app/state";

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
                    let val;
                    const json = JSON.parse(text);
                    if (page.url.pathname === '/questiongets/justone') {
                        try {
                            let x = JSON.parse(page.url.searchParams.get("jsonparams"))
                            if (!x.asmtEventId || !x.test) throw new Error();
                        } catch (error) {
                            goto("/");
                        }
                        val = json[JSON.stringify({
                            asmtEventId: parseInt(JSON.parse(page.url.searchParams.get("jsonparams"))['asmtEventId']),
                            test: parseInt(JSON.parse(page.url.searchParams.get("jsonparams"))['test']),
                            domain: Object.values(lookup.lookupData.domain)[lookup.lookupData.test[parseInt(JSON.parse(page.url.searchParams.get("jsonparams"))['test'])].id - 1].map(v => v.primaryClassCd).join(',')
                        })]
                    } else {
                        val = json[JSON.stringify({
                            asmtEventId: parseInt(lookup.lookupData.assessment[parseInt(selectedDetails.test)].id.toString()),
                            test: parseInt(selectedDetails.section) + 1,
                            domain: Object.values(lookup.lookupData.domain)[lookup.lookupData.test[parseInt(selectedDetails.section)].id - 1].map(v => v.primaryClassCd).join(',')
                        })]
                    }
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

    let set = $state(false);

    onMount(() => {
        if (page.url.pathname !== '/questiongets/justone' && !(selectedDetails.test !== undefined && selectedDetails.section !== undefined && selectedDetails.topics !== undefined && selectedDetails.subtopics !== undefined)) {
            goto("/topics")
            return;
        }
        try {
            if (!onlineStatus[0] && onlineStatus[1]) {
                let promise = loadFromOffline();
                setQuestions(promise);
            } else {
                let val;
                if (page.url.pathname === '/questiongets/justone') {
                    try {
                        let x = JSON.parse(page.url.searchParams.get("jsonparams"))
                        if (!x.asmtEventId || !x.test) throw new Error();
                    } catch (error) {
                        goto("/");
                    }
                    val = JSON.stringify({
                        asmtEventId: parseInt(JSON.parse(page.url.searchParams.get("jsonparams"))['asmtEventId']),
                        test: parseInt(JSON.parse(page.url.searchParams.get("jsonparams"))['test']),
                        domain: Object.values(lookup.lookupData.domain)[lookup.lookupData.test[parseInt(JSON.parse(page.url.searchParams.get("jsonparams"))['test'])-1].id - 1].map(v => v.primaryClassCd).join(',')
                    })
                } else {
                    val = JSON.stringify({
                        asmtEventId: parseInt(lookup.lookupData.assessment[parseInt(selectedDetails.test)].id.toString()),
                        test: parseInt(selectedDetails.section) + 1,
                        domain: Object.values(lookup.lookupData.domain)[lookup.lookupData.test[parseInt(selectedDetails.section)].id - 1].map(v => v.primaryClassCd).join(',')
                    })
                }
                let json = fetch("https://qbank-api.collegeboard.org/msreportingquestionbank-prod/questionbank/digital/get-questions", {
                    "credentials": "omit",
                    "headers": {
                        "Accept": "*/*",
                        "Accept-Language": "en-US,en;q=0.5",
                        "Content-Type": "text/plain;charset=UTF-8",
                    },
                    "referrer": "https://satsuitequestionbank.collegeboard.org/",
                    "body": val,
                    "method": "POST",
                    "mode": "cors"
                }).then(json => {
                    if (!json.ok) goto("/");
                    return json;
                })
                setQuestions(json.then((v: Response) => v.json()))
            }
        } catch (e) {
            // console.error(e, Object.values(lookup.lookupData.domain), Object.values(lookup.lookupData.domain)[lookup.lookupData.assessment[parseInt(selectedDetails.section)].id - 1], lookup.lookupData.assessment[parseInt(selectedDetails.section)].id - 1, parseInt(selectedDetails.section))
            // await alert(`The Collegeboard servers may not be functional at the moment.`, `${e}.`)
        }
        set = true
    })

    let { children } = $props();
</script>

{#if set}
    {@render children?.()}
{/if}
