import {type RequestEvent, type RequestHandler} from "@sveltejs/kit";

export const GET: RequestHandler = async ({fetch, url}) => {
    return await fetch("https://qbank-api.collegeboard.org/msreportingquestionbank-prod/questionbank/digital/get-question", {
        credentials: "omit",
        headers: {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:142.0) Gecko/20100101 Firefox/142.0",
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "en-US,en;q=0.5",
            "Content-Type": "application/json",
            "Sec-GPC": "1",
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "same-site",
            "Priority": "u=0"
        },
        referrer: "https://satsuitequestionbank.collegeboard.org/",
        body: JSON.stringify({
            external_id: "52a8f1cb-bff4-4dcb-b455-fbc202e8513c"
        }),
        method: "POST",
        mode: "cors"
    });
}