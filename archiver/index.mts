import type { LookupData, Question, QuestionDetail } from "../src/lib/types/types";
import fs from "node:fs/promises"

// Helper function to add delay between requests
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

await fs.mkdir("archive", { recursive: true });

// we need to archive the question data found here for the sake of the future. 
const lookupRes = await fetch("https://qbank-api.collegeboard.org/msreportingquestionbank-prod/questionbank/lookup", {
    "credentials": "omit",
    "headers": {
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.5",
    },
    "method": "GET"
})
if (!lookupRes.ok) throw new Error("Failed to fetch lookup data");
const lookup: LookupData = await lookupRes.json();

await fs.writeFile("archive/lookup.json", JSON.stringify(lookup, null, 2));

console.info("Saved lookup data.")

let questions: { [key: string]: Question[] } = {};

for (const test of lookup.lookupData.assessment) {
    for (const section of lookup.lookupData.test) {
        const question = await fetch("https://qbank-api.collegeboard.org/msreportingquestionbank-prod/questionbank/digital/get-questions", {
            "credentials": "omit",
            "headers": {
                "Accept": "*/*",
                "Accept-Language": "en-US,en;q=0.5",
                "Content-Type": "text/plain;charset=UTF-8",
            },
            "referrer": "https://satsuitequestionbank.collegeboard.org/",
            "body": JSON.stringify({
                asmtEventId: parseInt(test.id.toString()),
                test: parseInt(section.id.toString()),
                domain: Object.values(lookup.lookupData.domain)[section.id - 1].map(v => v.primaryClassCd).join(',')
            }),
            "method": "POST",
            "mode": "cors"
        })
        if (!question.ok) {
            throw new Error(`Failed to fetch question for test ${test}, section ${section.id}`);
        }
        questions[JSON.stringify({
            asmtEventId: parseInt(test.id.toString()),
            test: parseInt(section.id.toString()),
            domain: Object.values(lookup.lookupData.domain)[section.id - 1].map(v => v.primaryClassCd).join(',')
        })] = await question.json();
        console.info("Saved question data for test:", test.id, "section:", section.id);
    }
}

await fs.writeFile("archive/get-questions.json", JSON.stringify(questions, null, 2));

// seems redundant but good that we read the questions and save them before we get the question details.
for (const test of lookup.lookupData.assessment) {
    for (const section of lookup.lookupData.test) {
        await fs.mkdir(`archive/${test.id}/${section.id}`, { recursive: true });
        const questionList = questions[JSON.stringify({
            asmtEventId: parseInt(test.id.toString()),
            test: parseInt(section.id.toString()),
            domain: Object.values(lookup.lookupData.domain)[section.id - 1].map(v => v.primaryClassCd).join(',')
        })];
        
        for (const question of questionList) {
            try {
                const res = await fetch(
                    "https://qbank-api.collegeboard.org/msreportingquestionbank-prod/questionbank/digital/get-question",
                    {
                        credentials: "omit",
                        headers: {
                            Accept: "application/json, text/plain, */*",
                            "Accept-Language": "en-US,en;q=0.5",
                            "Content-Type": "application/json",
                        },
                        referrer: "https://satsuitequestionbank.collegeboard.org/",
                        body: JSON.stringify({
                            external_id: question.external_id,
                        }),
                        method: "POST",
                        mode: "cors",
                    },
                );
                
                try {
                    const detail: QuestionDetail = await res.json();
                    if (!res.ok || detail?.type === undefined) {
                        // maybe we need to load in via json
                        if (question.ibn) {
                            try {
                                const res2 = await fetch(`https://saic.collegeboard.org/disclosed/${question.ibn}.json`, {
                                    "credentials": "omit",
                                    "headers": {
                                        "Accept": "application/json, text/plain, */*",
                                        "Accept-Language": "en-US,en;q=0.5",
                                    },
                                    "referrer": "https://satsuitequestionbank.collegeboard.org/",
                                    "method": "GET",
                                    "mode": "cors"
                                });
                                
                                if (!res2.ok) {
                                    console.error("Failed to retrieve question detail for ibn:", question.ibn);
                                } else {
                                    const v = await res2.json();
                                    await fs.writeFile(`archive/${test.id}/${section.id}/${question.ibn}.json`, JSON.stringify(v, null, 2));
                                    console.info("Saved question detail for ibn:", question.ibn);
                                }
                            } catch (err) {
                                console.error("Failed to retrieve question detail for ibn:", question.ibn, "error:", err);
                            }
                        } else {
                            console.error("Failed to retrieve question detail - no ibn available for uid:", question.uId);
                        }
                    } else {
                        await fs.writeFile(`archive/${test.id}/${section.id}/${question.external_id}.json`, JSON.stringify(detail, null, 2));
                        console.info("Saved question detail for external_id:", question.external_id, " ibn: ", question.ibn, " uid: ", question.uId);
                    }
                } catch (err) {
                    console.error("Failed to parse JSON response for question with uid: ", question.uId, " error: ", err);
                }

            } catch (err) {
                console.error("Failed to retrieve question with uid: ", question.uId, " error: ", err);
            }
            
            // Rate limiting: wait ~333ms between requests (3 requests per second)
            await sleep(80);
        }
    }
}