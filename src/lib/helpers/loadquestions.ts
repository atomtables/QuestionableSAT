import { goto } from "$app/navigation";
import { page } from "$app/state";
import { lookup, onlineStatus, selectedDetails } from "$lib/clientstate/states.svelte";
import { isQuestionArray } from "$lib/types/types";
import { alert } from "$lib/components/Dialog.svelte";

export const loadQuestionsFromOffline = async (val) => {
    for (const file of onlineStatus[1]) {
        if (file.name === "get-questions.json") {
            const text = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target?.result as string);
                reader.onerror = () => reject(reader.error);
                reader.readAsText(file);
            });
            try {
                let x;
                const json = JSON.parse(text);
                x = json[val];
                if (!x) throw new Error();
                if (!isQuestionArray(x)) {
                    throw new Error();
                }
                return x;
            } catch (err: any) {
                alert("Offline mode", "Unable to load this archive. Ensure it is not corrupted and that it is valid.");
                throw new Error("The offline archive is invalid.");
            }
        }
    }
};

export const loadQuestionsFromOnline = async (val) => {
    return await fetch("https://qbank-api.collegeboard.org/msreportingquestionbank-prod/questionbank/digital/get-questions", {
        credentials: "omit",
        headers: {
            Accept: "*/*",
            "Accept-Language": "en-US,en;q=0.5",
            "Content-Type": "text/plain;charset=UTF-8",
        },
        referrer: "https://satsuitequestionbank.collegeboard.org/",
        body: val,
        method: "POST",
        mode: "cors",
    })
        .then((json) => {
            if (!json.ok) throw new Error();
            return json.json();
        })
        .then((questions) => {
            if (!Array.isArray(questions)) throw new Error();
            if (!isQuestionArray(questions)) throw new Error();
            return questions;
        });
};

export const loadQuestions = async (val) => {
    if (!onlineStatus[0] && onlineStatus[1]) {
        return await loadQuestionsFromOffline(val);
    } else {
        return await loadQuestionsFromOnline(val);
    }
};
