import type { Schema } from "../core/validation/schema.js";
import { type ThreeDSecureCardAuthenticationResponse } from "./three-dsecure-card-authentication-response.js";
export type CardAuthenticationResponse = {
    threeDSecure?: ThreeDSecureCardAuthenticationResponse;
};
export declare const cardAuthenticationResponseSchema: Schema<CardAuthenticationResponse>;
