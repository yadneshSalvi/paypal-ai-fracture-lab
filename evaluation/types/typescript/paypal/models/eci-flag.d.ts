import type { EnumSchema } from "../core/validation/schema.js";
export declare const EciFlag: {
    readonly MastercardNon3DSecureTransaction: "MASTERCARD_NON_3D_SECURE_TRANSACTION";
    readonly MastercardAttemptedAuthenticationTransaction: "MASTERCARD_ATTEMPTED_AUTHENTICATION_TRANSACTION";
    readonly MastercardFullyAuthenticatedTransaction: "MASTERCARD_FULLY_AUTHENTICATED_TRANSACTION";
    readonly FullyAuthenticatedTransaction: "FULLY_AUTHENTICATED_TRANSACTION";
    readonly AttemptedAuthenticationTransaction: "ATTEMPTED_AUTHENTICATION_TRANSACTION";
    readonly Non3DSecureTransaction: "NON_3D_SECURE_TRANSACTION";
};
export type EciFlag = (typeof EciFlag)[keyof typeof EciFlag] | (string & {});
export declare const eciFlagSchema: EnumSchema<EciFlag>;
