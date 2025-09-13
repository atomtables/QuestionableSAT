import {selectedDetails} from "$lib/clientstate/states.svelte";
import {error, redirect} from "@sveltejs/kit"
import type {LookupData, Question} from "$lib/types/types";

export const load: any = async ({request, fetch, parent}: any): Promise<any> => {
    if (!(selectedDetails.test !== undefined && selectedDetails.section !== undefined && selectedDetails.topics !== undefined && selectedDetails.subtopics !== undefined)) {
        redirect(302, "/topics")
    }
    const x = await parent();
    const lookup: LookupData = x.lookup;
    let vals: Question[] = fetch(`/get/list?test=${lookup.lookupData.assessment[parseInt(selectedDetails.test)].id}&section=${parseInt(selectedDetails.section) + 1}`)
        .then((v: Response) => v.json())

    return {
        questions: vals,
    };
};