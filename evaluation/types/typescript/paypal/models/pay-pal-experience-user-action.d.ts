import type { EnumSchema } from "../core/validation/schema.js";
export declare const PayPalExperienceUserAction: {
    readonly Continue: "CONTINUE";
    readonly PayNow: "PAY_NOW";
};
export type PayPalExperienceUserAction = (typeof PayPalExperienceUserAction)[keyof typeof PayPalExperienceUserAction] | (string & {});
export declare const payPalExperienceUserActionSchema: EnumSchema<PayPalExperienceUserAction>;
