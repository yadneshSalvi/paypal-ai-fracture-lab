import type { EnumSchema } from "../core/validation/schema.js";
export declare const DisputeCategory: {
    readonly ItemNotReceived: "ITEM_NOT_RECEIVED";
    readonly UnauthorizedTransaction: "UNAUTHORIZED_TRANSACTION";
};
export type DisputeCategory = (typeof DisputeCategory)[keyof typeof DisputeCategory] | (string & {});
export declare const disputeCategorySchema: EnumSchema<DisputeCategory>;
