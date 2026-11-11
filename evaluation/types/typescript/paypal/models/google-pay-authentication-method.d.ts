import type { EnumSchema } from "../core/validation/schema.js";
export declare const GooglePayAuthenticationMethod: {
    readonly PanOnly: "PAN_ONLY";
    readonly Cryptogram3Ds: "CRYPTOGRAM_3DS";
};
export type GooglePayAuthenticationMethod = (typeof GooglePayAuthenticationMethod)[keyof typeof GooglePayAuthenticationMethod] | (string & {});
export declare const googlePayAuthenticationMethodSchema: EnumSchema<GooglePayAuthenticationMethod>;
