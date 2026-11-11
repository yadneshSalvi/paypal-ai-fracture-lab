import type { EnumSchema } from "../core/validation/schema.js";
export declare const CardType: {
    readonly Credit: "CREDIT";
    readonly Debit: "DEBIT";
    readonly Prepaid: "PREPAID";
    readonly Store: "STORE";
    readonly Unknown: "UNKNOWN";
};
export type CardType = (typeof CardType)[keyof typeof CardType] | (string & {});
export declare const cardTypeSchema: EnumSchema<CardType>;
