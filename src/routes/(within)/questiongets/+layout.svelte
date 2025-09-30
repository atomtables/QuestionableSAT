<script lang="ts">
    import { goto } from "$app/navigation";
    import { selectedDetails, lookup, setQuestions, questions } from "$lib/clientstate/states.svelte";
    import { onMount } from "svelte";
    import { alert } from "$lib/components/Dialog.svelte";

    onMount(async () => {
        console.log($state.snapshot(selectedDetails))
        if (!(selectedDetails.test !== undefined && selectedDetails.section !== undefined && selectedDetails.topics !== undefined && selectedDetails.subtopics !== undefined)) {
            goto("/topics")
        }
    try {
        setQuestions((fetch("https://qbank-api.collegeboard.org/msreportingquestionbank-prod/questionbank/digital/get-questions", {
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
            })).then((v: Response) => v.json()))
    } catch (e) {
        console.error(e, Object.values(lookup.lookupData.domain), Object.values(lookup.lookupData.domain)[lookup.lookupData.assessment[parseInt(selectedDetails.section)].id - 1], lookup.lookupData.assessment[parseInt(selectedDetails.section)].id - 1, parseInt(selectedDetails.section))
        await alert(`The Collegeboard servers may not be functional at the moment.`, `${e}.`)
    }
    })

    let { children } = $props();
</script>

{@render children?.()}
