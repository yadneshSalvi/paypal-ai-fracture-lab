import type { Schema } from "../core/validation/schema.js";
export type CardFromRequest = {
    expiry?: string;
    lastDigits?: string;
};
export declare const cardFromRequestSchema: Schema<CardFromRequest>;
