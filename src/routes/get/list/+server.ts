import {type RequestHandler} from "@sveltejs/kit";
import {_Lookup} from "../lookuptables/+server";

const valuesFor: { [key: string]: { time: Date, item: Response } } = {}
export const GET: RequestHandler = async ({fetch, request, url}) => {
    let asmtEventId = url.searchParams.get('test');
    let test = url.searchParams.get('section');

    let lookup = _Lookup
    if (!lookup) {
        await (await fetch('/get/lookuptables')).json()
        lookup = _Lookup
    }

    if (!asmtEventId || !test) {
        return new Response('Missing parameters', {status: 400});
    }

    let valx = (await fetch("https://qbank-api.collegeboard.org/msreportingquestionbank-prod/questionbank/digital/get-questions", {
        credentials: "omit",
        headers: {
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "en-US,en;q=0.5",
            "Content-Type": "application/json",
            "User-Agent": request.headers.get("User-Agent")
        },
        referrer: "https://satsuitequestionbank.collegeboard.org/",
        body: JSON.stringify({
            asmtEventId: parseInt(asmtEventId),
            test: parseInt(test),
            domain: Object.values(lookup.lookupData.domain)[parseInt(test) - 1].map(v => v.primaryClassCd).join(',')
        }),
        method: "POST",
    }))
    let valx2 = valx.clone()

    if (!valuesFor[`${asmtEventId}-${test}`] || (new Date().getTime() - valuesFor[`${asmtEventId}-${test}`].time.getTime() || 0) > 86400000) {
        valuesFor[`${asmtEventId}-${test}`] = {
            time: new Date(),
            item: valx2
        }
    }
    // noinspection UnnecessaryLocalVariableJS
    let val = valx.clone()
    let val2 = valx.clone()
    console.log(await val2.json(), JSON.stringify({
        asmtEventId: parseInt(asmtEventId),
        test: parseInt(test),
        domain: Object.values(lookup.lookupData.domain)[parseInt(test) - 1].map(v => v.primaryClassCd).join(',')
    }))
    return val
}

await fetch("https://qbank-api.collegeboard.org/msreportingquestionbank-prod/questionbank/digital/get-questions", {
    "credentials": "omit",
    "headers": {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:142.0) Gecko/20100101 Firefox/142.0",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.5",
        "Content-Type": "application/json",
        "Sec-GPC": "1",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-site"
    },
    "referrer": "https://satsuitequestionbank.collegeboard.org/",
    "body": "{\"asmtEventId\":99,\"test\":1,\"domain\":\"INI\"}",
    "method": "POST",
    "mode": "cors"
});