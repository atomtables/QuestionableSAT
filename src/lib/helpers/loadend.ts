import { onlineStatus } from "$lib/clientstate/states.svelte";
import { isQuestionDetail, type QuestionDetail } from "$lib/types/types";
import { loadMCQQuestionThroughJSON } from "./loadjson";
import { alert } from "$lib/components/Dialog.svelte";

export async function loadQuestion(question: { external_id: string; ibn: string }): Promise<QuestionDetail> {
    if (!onlineStatus[0]) {
        for (const file of onlineStatus[1]) {
            if (file.name === `${question.external_id}.json` || file.name === `${question.ibn}.json`) {
                const text = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve(e.target?.result as string);
                    reader.onerror = () => reject(reader.error);
                    reader.readAsText(file);
                });
                try {
                    const json = JSON.parse(text);
                    if (!isQuestionDetail(json)) {
                        throw new Error();
                    }
                    return json;
                } catch (err: any) {
                    await alert("Offline mode", "Unable to load this archive. Ensure it is not corrupted and that it is valid.");
                    throw new Error("The offline archive is invalid.");
                }
            }
        }
    } else {
        let res = await fetch("https://qbank-api.collegeboard.org/msreportingquestionbank-prod/questionbank/digital/get-question", {
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
        });
        let val = await res.json();
        if (!res.ok || val.type === undefined) {
            // maybe we need to load in via json
            if (question.ibn) {
                val = await loadMCQQuestionThroughJSON(question.ibn);
                return val;
            } else return null;
        } else {
            return val;
        }
    }
}
