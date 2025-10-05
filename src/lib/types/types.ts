export type LookupData = {
    lookupData: {
        assessment: { id: number; text: string }[];
        test: { id: number; text: string }[];
        domain: {
            [key: string]: {
                text: string;
                id: number;
                primaryClassCd: string;
                skill: { id: number; text: string }[];
            }[];
        };
    };
    mathLiveItems: string[];
    readingLiveItems: string[];
    // state offerings (irrelevant)
};
export function isLookupData(json: any) {
    if (!json.lookupData || !json.mathLiveItems || !json.readingLiveItems) return false;
    const l = json.lookupData;
    if (!l.assessment || !l.test || !l.domain) {
        console.log(" no lookup data");
        return false;
    }
    for (let key in l.domain) {
        let kl = l.domain[key];
        for (let k of kl) {
            if (!k.text || k.id === null || !k.primaryClassCd || !k.skill) {
                console.log("keys are wrong", key, l.domain[key], k.text, k.id, k.primaryClassCd, k.skill);
                return false;
            }
        }
    }
    return true;
}
export type Question = {
    updateDate: number; // date question was created
    pPcc: string; // test name + # + primary_class_cd
    questionId: string; // general id
    skill_cd: string; // 3 letter code about which skill this is
    score_band_range_cd: number; // 1-10, matches with difficulty but more representative
    uId: string; // unique id (useless)
    skill_desc: string; // full form of skill_cd
    createDate: number; // same as updateDate
    program: string; // SAT, PSAT, etc
    primary_class_cd_desc: string; // full form of primary_class_cd
    ibn: null | string; // unknown
    external_id: null | string; // important for identifying active questions
    primary_class_cd: string; // 3 letter code about whic topic
    difficulty: "E" | "M" | "H"; // easy, medium, hard
};
export function isQuestionArray(json: any) {
    if (!Array.isArray(json)) return false;
    for (const item of json) {
        if (!item.difficulty || !item.primary_class_cd || !item.score_band_range_cd || !item.program) {
            return false;
        }
    }
    return true;
}

export type QuestionDetail = QuestionDetailMCQ | QuestionDetailSPR;

export type QuestionDetailMCQ = {
    // unknown
    vaultId: string;
    // answer choice id
    keys: string[];
    // formatted html
    rationale: string;
    // unknown not used in math
    origin: string;
    // question
    stem: string;
    // id that got you here
    externalid: string;
    // formatted html of the question text
    stimulus: string;
    // unknown not used in math
    templateclusterid: string;
    // unknown, might have to do with topic not used in math
    parenttemplatename: string;
    // unknown, "" not used in math
    parenttemplateid: string;
    // mcq
    type: "mcq";
    // unknown might be question position on a test?, not used in math
    position: number;
    // unknown, not used for math
    templateclustername: string;
    answerOptions: {
        // option id
        id: string;
        // html formatted option
        content: string;
    }[];
    // correct answer letter but no letters used, use keys
    correct_answer: string;
};
export type QuestionDetailSPR = {
    type: "spr";
    // question with mathtype
    stem: string;
    // possible correct answers
    keys: string[];
    // explanation with mathtype
    rationale: string;
    externalid: string;
    // applicable answers
    correct_answer: string[];
};
export function isQuestionDetail(json: any): json is QuestionDetail {
    if (!json) return false;
    if (!json.correct_answer || !json.rationale || !json.keys || !json.stem) {
        return false;
    }
    return true;
}
