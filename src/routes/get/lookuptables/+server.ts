import {type RequestHandler} from "@sveltejs/kit";
import type {LookupData} from "$lib/types/types";

let _LookupValues: Response = null
export let _Lookup: LookupData = null
let lastUpdated = new Date(0)

export const GET: RequestHandler = async ({request, fetch}) => {
    let body = JSON.stringify(_Lookup)
    if ((new Date().getTime() - lastUpdated.getTime()) > 86400000 || !_LookupValues) {
        let old = _LookupValues?.clone()
        _LookupValues = (await fetch("https://qbank-api.collegeboard.org/msreportingquestionbank-prod/questionbank/lookup", {
            "credentials": "omit",
            "headers": {
                "User-Agent": request.headers.get('user-agent'),
                "Accept": "application/json, text/plain, */*",
                "Accept-Language": "en-US,en;q=0.5",
            },
            "method": "GET"
        })).clone();
        if (!(_LookupValues?.ok)) {
            _LookupValues = old
        }
        let val = _LookupValues.clone()
        body = JSON.stringify(await val.json())
        _Lookup = await JSON.parse(body)
        lastUpdated = new Date()
    }
    return new Response(JSON.stringify(_Lookup))
}