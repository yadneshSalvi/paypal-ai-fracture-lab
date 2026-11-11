import type { EnumSchema } from "../core/validation/schema.js";
export declare const AuthorizationStatus: {
    readonly Created: "CREATED";
    readonly Captured: "CAPTURED";
    readonly Denied: "DENIED";
    readonly PartiallyCaptured: "PARTIALLY_CAPTURED";
    readonly Voided: "VOIDED";
    readonly Pending: "PENDING";
};
export type AuthorizationStatus = (typeof AuthorizationStatus)[keyof typeof AuthorizationStatus] | (string & {});
export declare const authorizationStatusSchema: EnumSchema<AuthorizationStatus>;
