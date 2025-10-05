<script lang="ts">
    import { goto } from "$app/navigation";
    import { selectedDetails, lookup, setQuestions, questions, onlineStatus, params } from "$lib/clientstate/states.svelte";
    import { onMount, tick } from "svelte";
    import { alert } from "$lib/components/Dialog.svelte";
    import { isQuestionArray, type Question } from "$lib/types/types";
    import { page } from "$app/state";
    import { loadQuestions, loadQuestionsFromOffline, loadQuestionsFromOnline } from "$lib/helpers/loadquestions";

    let set = $state(false);

    onMount(() => {
        if (page.url.pathname !== '/questiongets/justone' && !(selectedDetails.test !== undefined && selectedDetails.section !== undefined && selectedDetails.topics !== undefined && selectedDetails.subtopics !== undefined)) {
            goto("/topics")
            return;
        }
        try {
            let val;
            if (page.url.pathname === '/questiongets/justone') {
                try {
                    let x = JSON.parse(page.url.searchParams.get("jsonparams"))
                    if (!x.asmtEventId || !x.test) throw new Error();
                } catch (error) {
                    goto("/");
                }
                params.params = val = JSON.stringify({
                    asmtEventId: parseInt(JSON.parse(page.url.searchParams.get("jsonparams"))['asmtEventId']),
                    test: parseInt(JSON.parse(page.url.searchParams.get("jsonparams"))['test']),
                    domain: Object.values(lookup.lookupData.domain)[lookup.lookupData.test[parseInt(JSON.parse(page.url.searchParams.get("jsonparams"))['test'])-1].id - 1].map(v => v.primaryClassCd).join(',')
                })
            } else {
                params.params = val = JSON.stringify({
                    asmtEventId: parseInt(lookup.lookupData.assessment[parseInt(selectedDetails.test)].id.toString()),
                    test: parseInt(selectedDetails.section) + 1,
                    domain: Object.values(lookup.lookupData.domain)[lookup.lookupData.test[parseInt(selectedDetails.section)].id - 1].map(v => v.primaryClassCd).join(',')
                })
            }
            let json = loadQuestions(val);
            setQuestions(json)
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
