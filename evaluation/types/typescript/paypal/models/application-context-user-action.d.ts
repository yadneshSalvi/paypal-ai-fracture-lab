import type { EnumSchema } from "../core/validation/schema.js";
export declare const ApplicationContextUserAction: {
    readonly Continue: "CONTINUE";
    readonly SubscribeNow: "SUBSCRIBE_NOW";
};
export type ApplicationContextUserAction = (typeof ApplicationContextUserAction)[keyof typeof ApplicationContextUserAction] | (string & {});
export declare const applicationContextUserActionSchema: EnumSchema<ApplicationContextUserAction>;
