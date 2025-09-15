import {selectedDetails} from "$lib/clientstate/states.svelte";
import {error, redirect} from "@sveltejs/kit"
import type {LookupData, Question} from "$lib/types/types";

export const load: any = async ({parent, fetch}: any): Promise<any> => {
    if (!(selectedDetails.test !== undefined && selectedDetails.section !== undefined && selectedDetails.topics !== undefined && selectedDetails.subtopics !== undefined)) {
        redirect(302, "/topics")
    }
    const x = await parent();
    const lookup: LookupData = x.lookup;
    try {
        return {
            questions: (fetch("https://qbank-api.collegeboard.org/msreportingquestionbank-prod/questionbank/digital/get-questions", {
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
            })).then((v: Response) => v.json()),
        };
    } catch (e) {
        console.error(e, Object.values(lookup.lookupData.domain), Object.values(lookup.lookupData.domain)[lookup.lookupData.assessment[parseInt(selectedDetails.section)].id - 1], lookup.lookupData.assessment[parseInt(selectedDetails.section)].id - 1, parseInt(selectedDetails.section))
        error(500, `The Collegeboard servers may not be functional at the moment: ${e}.`)
    }
};


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
