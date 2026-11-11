import type { Schema } from "../core/validation/schema.js";
import { type LiabilityShiftIndicator } from "./liability-shift-indicator.js";
import { type ThreeDSecureAuthenticationResponse } from "./three-dsecure-authentication-response.js";
export type AuthenticationResponse = {
    liabilityShift?: LiabilityShiftIndicator;
    threeDSecure?: ThreeDSecureAuthenticationResponse;
};
export declare const authenticationResponseSchema: Schema<AuthenticationResponse>;
