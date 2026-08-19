import { onlineStatus } from "$lib/clientstate/states.svelte";
import {isQuestionDetail, type Question, type QuestionDetail} from "$lib/types/types";
import { loadMCQQuestionThroughJSON } from "./loadjson";
import { alert } from "$lib/components/Dialog.svelte";

const debugLoadEnd = (...args: unknown[]) => console.debug("[loadQuestion]", ...args);
const errorLoadEnd = (...args: unknown[]) => console.error("[loadQuestion]", ...args);

export async function loadQuestion(question: Partial<Question>): Promise<QuestionDetail> {
    debugLoadEnd("Loading question", {
        external_id: question.external_id,
        ibn: question.ibn,
        online: onlineStatus[0],
    });
    if (!onlineStatus[0]) {
        for (const file of onlineStatus[1]) {
            if (file.name === `${question.external_id}.json` || file.name === `${question.ibn}.json`) {
                debugLoadEnd("Matched offline file", { fileName: file.name });
                const text = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve(e.target?.result as string);
                    reader.onerror = () => reject(reader.error);
                    reader.readAsText(file);
                });
                try {
                    const json = JSON.parse(text);
                    if (!isQuestionDetail(json)) {
                        throw new Error(`[loadQuestion] Offline archive file ${file.name} parsed, but did not match QuestionDetail.`);
                    }
                    debugLoadEnd("Offline question loaded successfully", { fileName: file.name });
                    return json;
                } catch (err: any) {
                    errorLoadEnd("Failed to parse offline archive question.", { fileName: file.name, error: err });
                    await alert("Offline mode", "Unable to load this archive. Ensure it is not corrupted and that it is valid.");
                    throw new Error(`The offline archive is invalid for ${file.name}.`);
                }
            }
        }
    } else {
        if (question.external_id) {
            debugLoadEnd("Fetching live question by external_id", { external_id: question.external_id, ibn: question.ibn });
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
                    debugLoadEnd("Live question endpoint failed; falling back to JSON loader", { external_id: question.external_id, ibn: question.ibn, status: res.status, valueType: val?.type });
                    val = await loadMCQQuestionThroughJSON(question.ibn);
                    return val;
                } else {
                    errorLoadEnd("Live question endpoint failed and no ibn fallback was available.", { external_id: question.external_id, status: res.status, valueType: val?.type });
                    return null;
                }
            } else {
                debugLoadEnd("Live question loaded successfully", { external_id: question.external_id });
                return val;
            }
        } else if (question.ibn) {
            debugLoadEnd("Loading question directly from ibn JSON", { ibn: question.ibn });
            let val = await loadMCQQuestionThroughJSON(question.ibn);
            return val;
        } else {
            const message = "[loadQuestion] Question is missing both external_id and ibn, so it cannot be loaded.";
            errorLoadEnd(message, { question });
            throw new Error(message);
        }
    }
}
