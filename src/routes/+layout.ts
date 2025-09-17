import type {LookupData} from "$lib/types/types";

export const prerender = true
export const load: any = async ({fetch}) => {
    const lookupRes = await (await fetch("https://qbank-api.collegeboard.org/msreportingquestionbank-prod/questionbank/lookup", {
        "credentials": "omit",
        "headers": {
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "en-US,en;q=0.5",
        },
        "method": "GET"
    })).json();

    return {
        lookup: lookupRes
    };
}