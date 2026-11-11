import type { Schema } from "../core/validation/schema.js";
import { type AuthorizationIncompleteReason } from "./authorization-incomplete-reason.js";
export type AuthorizationStatusDetails = {
    reason?: AuthorizationIncompleteReason;
};
export declare const authorizationStatusDetailsSchema: Schema<AuthorizationStatusDetails>;
