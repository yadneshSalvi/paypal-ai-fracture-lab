import type { Schema } from "../core/validation/schema.js";
import { type EnrollmentStatus } from "./enrollment-status.js";
import { type PaResStatus } from "./pa-res-status.js";
export type ThreeDSecureAuthenticationResponse = {
    authenticationStatus?: PaResStatus;
    enrollmentStatus?: EnrollmentStatus;
};
export declare const threeDSecureAuthenticationResponseSchema: Schema<ThreeDSecureAuthenticationResponse>;
