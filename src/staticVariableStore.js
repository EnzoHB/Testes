import { writable } from "svelte/store";

export const staticVariables = writable({
    desiredAmount: 0,
    initialCapital: 0,
    monthlyInterest: 0,
})