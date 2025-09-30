import {selectedDetails} from "$lib/clientstate/states.svelte";
import {error, redirect} from "@sveltejs/kit"
import type {LookupData, Question} from "$lib/types/types";

// fetch("https://qbank-api.collegeboard.org/msreportingquestionbank-prod/questionbank/digital/get-questions", {
//     credentials: "omit",
//     referrer: 'https://satsuitequestionbank.collegeboard.org/',
//     body: JSON.stringify({
//         asmtEventId: lookup.lookupData.assessment[parseInt(selectedDetails.test)].id,
//         test: parseInt(selectedDetails.section) + 1,
//         domain: Object.values(lookup.lookupData.domain)[lookup.lookupData.test[parseInt(selectedDetails.section)].id - 1].map(v => v.primaryClassCd).join(',')
//     }),
//     method: "POST",
// })
