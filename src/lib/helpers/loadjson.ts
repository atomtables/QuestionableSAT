// collegeboard loads questions through two different methods
import type {QuestionDetailMCQ, QuestionDetailSPR} from "$lib/types/types";

export async function loadMCQQuestionThroughJSON(ibn: string) {
    try {
        let res = await fetch(`https://saic.collegeboard.org/disclosed/${ibn}.json`, {
            "credentials": "omit",
            "headers": {
                "Accept": "application/json, text/plain, */*",
                "Accept-Language": "en-US,en;q=0.5",
            },
            "referrer": "https://satsuitequestionbank.collegeboard.org/",
            "method": "GET",
            "mode": "cors"
        });
        if (!res.ok) return null
        let item: any = Object.values(await res.json())[0]
        if (item.answer.style !== "Multiple Choice") return null
        let correctId = crypto.randomUUID()
        let ret: QuestionDetailMCQ = {
            vaultId: null,
            keys: [correctId],
            // formatted html
            rationale: item.answer.rationale,
            // unknown not used in math
            origin: null,
            // question
            stem: item.prompt,
            // id that got you here (considered unique)
            externalid: ibn,
            // formatted html of the question text
            stimulus: item.stimulus, // didn't test this, hoping it works
            // unknown not used in math
            templateclusterid: null,
            // unknown, might have to do with topic not used in math
            parenttemplatename: null,
            // unknown, "" not used in math
            parenttemplateid: null,
            // mcq
            type: "mcq",
            // unknown might be question position on a test?, not used in math
            position: null,
            // unknown, not used for math
            templateclustername: null,
            answerOptions: Object.entries(item.answer.choices).map(([letter, element]: [string, any]) => {
                if (letter === item.answer.correct_choice) {
                    return {
                        id: correctId,
                        content: element.body
                    }
                } else {
                    return {
                        id: crypto.randomUUID(),
                        content: element.body
                    }
                }
            }),
            // correct answer letter but no letters used, use keys
            correct_answer: item.answer.correct_choice
        }
        return ret;
    } catch {
        return null;
    }
}

// TODO: does not give correct answer, find a way to make it work.
// async function loadSPRQuestionThroughJSON(ibn: string) {
//     let res = await fetch(`https://saic.collegeboard.org/disclosed/${ibn}.json`, {
//         "credentials": "omit",
//         "headers": {
//             "Accept": "application/json, text/plain, */*",
//             "Accept-Language": "en-US,en;q=0.5",
//         },
//         "referrer": "https://satsuitequestionbank.collegeboard.org/",
//         "method": "GET",
//         "mode": "cors"
//     });
//     if (!res.ok) return null
//     let item = Object.values(res)[0]
//     let correctId = crypto.randomUUID()
//     let ret: QuestionDetailSPR = {
//         keys: [correctId],
//         // formatted html
//         rationale: item.answer.rationale,
//         // unknown not used in math
//         // question
//         stem: item.prompt,
//         // id that got you here (considered unique)
//         externalid: ibn,
//         // mcq
//         type: "spr",
//         // correct answer letter but no letters used, use keys
//         correct_answer: item.answer.correct_choice
//     }
//     return ret;
// }
