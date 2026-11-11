import type { Schema } from "../core/validation/schema.js";
import { type AuthorizationStatusDetails } from "./authorization-status-details.js";
import { type AuthorizationStatus } from "./authorization-status.js";
export type AuthorizationStatusWithDetails = {
    status?: AuthorizationStatus;
    statusDetails?: AuthorizationStatusDetails;
};
export declare const authorizationStatusWithDetailsSchema: Schema<AuthorizationStatusWithDetails>;
