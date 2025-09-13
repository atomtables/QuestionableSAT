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