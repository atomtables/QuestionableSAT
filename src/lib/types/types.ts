export type LookupData = {
    lookupData: {
        assessment: { id: number, text: string }[],
        test: { id: number, text: string }[],
        domain: {
            [key: string]: {
                text: string,
                id: number,
                primaryClassCd: string,
                skill: { id: number, text: string }[]
            }[]
        }
    },
    mathLiveItems: string[],
    readingLiveItems: string[]
    // state offerings (irrelevant)
}
export type Question = {
    updateDate: number, // date question was created
    pPcc: string, // test name + # + primary_class_cd
    questionId: string, // general id
    skill_cd: string, // 3 letter code about which skill this is
    score_band_range_cd: number, // 1-10, matches with difficulty but more representative
    uId: string, // unique id (useless)
    skill_desc: string, // full form of skill_cd
    createDate: number, // same as updateDate
    program: string, // SAT, PSAT, etc
    primary_class_cd_desc: string, // full form of primary_class_cd
    ibn: null | string, // unknown
    external_id: string, // important for identifying active questions
    primary_class_cd: string, // 3 letter code about whic topic
    difficulty: 'E' | 'M' | 'H' // easy, medium, hard
}

export type QuestionDetail = QuestionDetailMCQ | QuestionDetailSPR

export type QuestionDetailMCQ = {
    // unknown
    vaultId: string,
    // answer choice id
    keys: string[],
    // formatted html
    rationale: string,
    // unknown not used in math
    origin: string,
    // question
    stem: string,
    // id that got you here
    externalid: string,
    // formatted html of the question text
    stimulus: string,
    // unknown not used in math
    templateclusterid: string,
    // unknown, might have to do with topic not used in math
    parenttemplatename: string,
    // unknown, "" not used in math
    parenttemplateid: string
    // mcq
    type: "mcq",
    // unknown might be question position on a test?, not used in math
    position: number,
    // unknown, not used for math
    templateclustername: string,
    answerOptions: {
        // option id
        id: string,
        // html formatted option
        content: string
    }[],
    // correct answer letter but no letters used, use keys
    correct_answer: string
}
export type QuestionDetailSPR = {
    type: "spr",
    // question with mathtype
    stem: string,
    // possible correct answers
    keys: string[],
    // explanation with mathtype
    rationale: string,
    externalid: string,
    // applicable answers
    correct_answer: string[]
}