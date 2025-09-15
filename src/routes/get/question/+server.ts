import {type RequestEvent, type RequestHandler} from "@sveltejs/kit";

export const GET: RequestHandler = async ({fetch, url}) => {
    const id = url.searchParams.get('id');
    if (!id) return new Response("Failed", { status: 400, statusText: "Include the question ID"})
    return await fetch("https://qbank-api.collegeboard.org/msreportingquestionbank-prod/questionbank/digital/get-question", {
        credentials: "omit",
        headers: {
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "en-US,en;q=0.5",
            "Content-Type": "application/json",
        },
        referrer: "https://satsuitequestionbank.collegeboard.org/",
        body: JSON.stringify({
            external_id: id
        }),
        method: "POST",
        mode: "cors"
    });
}