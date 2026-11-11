import type { Schema } from "../core/validation/schema.js";
import { type EnrollmentStatus } from "./enrollment-status.js";
import { type PaResStatus } from "./pa-res-status.js";
export type ThreeDSecureCardAuthenticationResponse = {
    authenticationStatus?: PaResStatus;
    enrollmentStatus?: EnrollmentStatus;
    authenticationId?: string;
};
export declare const threeDSecureCardAuthenticationResponseSchema: Schema<ThreeDSecureCardAuthenticationResponse>;
