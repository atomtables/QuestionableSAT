import type {LookupData} from "$lib/types/types";

export const load: any = async ({fetch}) => {
    const lookupRes = await fetch('/get/lookuptables');
    const lookup: LookupData = await lookupRes.json();

    return {
        lookup
    };
}