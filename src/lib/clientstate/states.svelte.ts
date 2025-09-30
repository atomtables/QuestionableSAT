import type { LookupData } from "$lib/types/types"

export let selectedDetails: any = $state({})

// @ts-ignore
export let lookup: LookupData = $state({})
export const setLookup = (val) => {
    for (const [key, value] of Object.entries(val)) {
        lookup[key] = value;
    }
}

// @ts-ignore
export let questions: [Promise<Question[]>] = $state([new Promise(() => null)])
export const setQuestions = (val) => {
    questions[0] = val;
}

export let onlineStatus: [Boolean] = $state([true])