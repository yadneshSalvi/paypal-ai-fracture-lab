import type { Schema } from "../core/validation/schema.js";
import { type TokenType } from "./token-type.js";
export type Token = {
    id: string;
    type: TokenType;
};
export declare const tokenSchema: Schema<Token>;
