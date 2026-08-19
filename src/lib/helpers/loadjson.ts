// collegeboard loads questions through two different methods
import { onlineStatus } from "$lib/clientstate/states.svelte";
import { isQuestionDetail, type QuestionDetailMCQ, type QuestionDetailSPR } from "$lib/types/types";

const debugLoadJson = (...args: unknown[]) => console.debug("[loadMCQQuestionThroughJSON]", ...args);
const errorLoadJson = (...args: unknown[]) => console.error("[loadMCQQuestionThroughJSON]", ...args);

function toText(value: any): string {
    if (typeof value === "string") return value;
    if (value === null || value === undefined) return "";
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    if (typeof value === "object") {
        return (
            value.body ??
            value.text ??
            value.content ??
            value.html ??
            value.value ??
            value.prompt ??
            ""
        );
    }
    return String(value);
}

function extractCorrectChoiceLetter(rawAnswer: any, rationale: string, choiceLetters: string[]): string | null {
    const candidates = [
        rawAnswer?.correct_choice,
        rawAnswer?.correctChoice,
        rawAnswer?.correct_answer,
        rawAnswer?.correctAnswer,
        rawAnswer?.answer,
        rawAnswer?.correct,
    ]
        .map(toText)
        .map((v) => v.trim())
        .filter(Boolean);

    for (const candidate of candidates) {
        const upper = candidate.toUpperCase();
        if (choiceLetters.includes(upper)) return upper;
        const directMatch = candidate.match(/\b([A-F])\b/);
        if (directMatch && choiceLetters.includes(directMatch[1].toUpperCase())) return directMatch[1].toUpperCase();
    }

    const rationaleMatch = rationale.match(/Choice\s+([A-F])\s+is\s+correct/i) ?? rationale.match(/\b([A-F])\b(?=\s+is\s+correct)/i);
    if (rationaleMatch?.[1] && choiceLetters.includes(rationaleMatch[1].toUpperCase())) {
        return rationaleMatch[1].toUpperCase();
    }

    return null;
}

function normalizeMcqPayload(item: any, ibn: string, source: string): QuestionDetailMCQ | null {
    const rawAnswer = item?.answer ?? item;
    const choices = rawAnswer?.choices;
    if (!choices || typeof choices !== "object") {
        errorLoadJson(`Missing choices in ${source} MCQ payload.`, { ibn, item });
        return null;
    }

    const choiceLetters = Object.keys(choices).map((v) => v.toUpperCase());
    const correctChoice = extractCorrectChoiceLetter(rawAnswer, toText(rawAnswer?.rationale ?? item?.rationale), choiceLetters);
    if (!correctChoice) {
        errorLoadJson(`Unable to infer the correct answer choice in ${source} MCQ payload.`, {
            ibn,
            choiceLetters,
            rawAnswer,
            rationale: rawAnswer?.rationale ?? item?.rationale,
        });
        return null;
    }

    const correctId = crypto.randomUUID();
    const ret: QuestionDetailMCQ = {
        vaultId: null,
        keys: [correctId],
        rationale: toText(rawAnswer?.rationale ?? item?.rationale),
        origin: null,
        stem: toText(item?.prompt ?? item?.stem),
        externalid: ibn,
        stimulus: toText(item?.stimulus ?? rawAnswer?.stimulus),
        templateclusterid: null,
        parenttemplatename: null,
        parenttemplateid: null,
        type: "mcq",
        position: null,
        templateclustername: null,
        answerOptions: Object.entries(choices).map(([letter, element]: [string, any]) => ({
            id: letter.toUpperCase() === correctChoice ? correctId : crypto.randomUUID(),
            content: toText(element),
        })),
        correct_answer: correctChoice,
    };

    if (!isQuestionDetail(ret)) {
        errorLoadJson(`Normalized ${source} MCQ payload failed QuestionDetail validation.`, { ibn, ret });
        return null;
    }

    return ret;
}

function htmlToText(value: any): string {
    const html = toText(value);
    if (!html) return "";

    try {
        const doc = new DOMParser().parseFromString(html, "text/html");
        doc.querySelectorAll("img[alt]").forEach((img) => {
            const alt = img.getAttribute("alt")?.trim();
            if (alt) {
                img.replaceWith(doc.createTextNode(alt));
            }
        });
        return (doc.body.textContent ?? "").replace(/\s+/g, " ").trim();
    } catch {
        return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    }
}

function pushUnique(target: string[], value: string) {
    const normalized = value.trim();
    if (normalized && !target.includes(normalized)) target.push(normalized);
}

function extractSprAnswers(rawAnswer: any, item: any, rationaleHtml: string): string[] {
    const answers: string[] = [];

    const directCandidates = [
        rawAnswer?.correct_answer,
        rawAnswer?.correctAnswer,
        rawAnswer?.answer,
        rawAnswer?.answers,
        rawAnswer?.accepted_answers,
        rawAnswer?.acceptedAnswers,
        rawAnswer?.values,
        rawAnswer?.correctValues,
        rawAnswer?.correct_responses,
        rawAnswer?.correctResponses,
        item?.correct_answer,
        item?.correctAnswer,
    ];

    for (const candidate of directCandidates) {
        if (Array.isArray(candidate)) {
            for (const entry of candidate) {
                const text = htmlToText(entry);
                if (text) pushUnique(answers, text);
            }
        } else {
            const text = htmlToText(candidate);
            if (text) pushUnique(answers, text);
        }
    }

    if (answers.length > 0) return answers;

    const rationaleText = htmlToText(rationaleHtml);
    const answerMatch = rationaleText.match(/(?:the\s+)?correct\s+answer\s+is\s+(.+?)(?:[.?!]|$)/i);
    if (answerMatch?.[1]) {
        pushUnique(answers, answerMatch[1]);
    }

    const examplesMatch = rationaleText.match(/(?:note that|(?:and|or)?\s*)(.+?)\s+are\s+examples\s+of\s+ways\s+to\s+enter\s+a\s+correct\s+answer/i);
    if (examplesMatch?.[1]) {
        for (const token of examplesMatch[1].split(/\s*,\s*|\s+and\s+|\s+or\s+/i)) {
            pushUnique(answers, token);
        }
    }

    return answers;
}

function normalizeSprPayload(item: any, ibn: string): QuestionDetailSPR | null {
    const stemParts = [htmlToText(item?.body), htmlToText(item?.prompt), htmlToText(item?.stem)].filter(Boolean);
    const stem = stemParts.join("\n");
    const rationale = toText(item?.answer?.rationale ?? item?.rationale);
    const correctAnswers = extractSprAnswers(item?.answer, item, rationale);

    if (!stem) {
        errorLoadJson("Unable to normalize SPR payload because stem text was missing.", { ibn, item });
        return null;
    }

    if (correctAnswers.length === 0) {
        errorLoadJson("Unable to infer accepted SPR answers.", { ibn, rationale, item });
        return null;
    }

    const ret: QuestionDetailSPR = {
        type: "spr",
        stem,
        keys: [...correctAnswers],
        rationale,
        externalid: ibn,
        correct_answer: [...correctAnswers],
    };

    if (!isQuestionDetail(ret)) {
        errorLoadJson("Normalized SPR payload failed QuestionDetail validation.", { ibn, ret });
        return null;
    }

    debugLoadJson("SPR question converted successfully", { ibn, acceptedAnswers: ret.correct_answer });
    return ret;
}

export async function loadMCQQuestionThroughJSON(ibn: string) {
    debugLoadJson("Loading MCQ question from JSON", { ibn, online: onlineStatus[0] });
    try {
        if (!onlineStatus[0]) {
            for (const file of onlineStatus[1]) {
                if (file.name === `${ibn}.json`) {
                    debugLoadJson("Matched offline JSON file", { ibn, fileName: file.name });
                    const text = await new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = (e) => resolve(e.target?.result as string);
                        reader.onerror = () => reject(reader.error);
                        reader.readAsText(file);
                    });
                    try {
                        let item: any = Object.values(JSON.parse(text))[0];
                        if (item?.answer?.style !== "Multiple Choice") {
                            debugLoadJson("Offline JSON is not multiple choice; normalizing as SPR.", {
                                ibn,
                                answerStyle: item?.answer?.style,
                            });
                            return normalizeSprPayload(item, ibn);
                        }
                        const ret = normalizeMcqPayload(item, ibn, "offline");
                        if (!ret) return null;
                        debugLoadJson("Offline MCQ question converted successfully", { ibn, answerCount: ret.answerOptions.length });
                        return ret;
                    } catch (err: any) {
                        errorLoadJson("Failed to convert offline JSON question.", { ibn, error: err });
                        return null;
                    }
                }
            }
            debugLoadJson("No matching offline JSON file was found", { ibn });
        } else {
            debugLoadJson("Fetching live disclosed JSON", { ibn });
            let res = await fetch(`https://saic.collegeboard.org/disclosed/${ibn}.json`, {
                credentials: "omit",
                headers: {
                    Accept: "application/json, text/plain, */*",
                    "Accept-Language": "en-US,en;q=0.5",
                },
                referrer: "https://satsuitequestionbank.collegeboard.org/",
                method: "GET",
                mode: "cors",
            });
            if (!res.ok) {
                errorLoadJson("Live disclosed JSON fetch failed.", { ibn, status: res.status, statusText: res.statusText });
                return null;
            }
            let item: any = Object.values(await res.json())[0];
            if (item?.answer?.style !== "Multiple Choice") {
                debugLoadJson("Live disclosed JSON is not multiple choice; normalizing as SPR.", {
                    ibn,
                    answerStyle: item?.answer?.style,
                });
                return normalizeSprPayload(item, ibn);
            }
            const ret = normalizeMcqPayload(item, ibn, "live");
            if (!ret) return null;
            debugLoadJson("Live MCQ question converted successfully", { ibn, answerCount: ret.answerOptions.length });
            return ret;
        }
    } catch {
        errorLoadJson("Unexpected error while loading MCQ question JSON.", { ibn });
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
