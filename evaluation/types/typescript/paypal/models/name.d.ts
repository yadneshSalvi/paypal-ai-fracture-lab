import type { Schema } from "../core/validation/schema.js";
export type Name = {
    givenName?: string;
    surname?: string;
};
export declare const nameSchema: Schema<Name>;
