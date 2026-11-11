import type { EnumSchema } from "../core/validation/schema.js";
export declare const ItemCategory: {
    readonly DigitalGoods: "DIGITAL_GOODS";
    readonly PhysicalGoods: "PHYSICAL_GOODS";
    readonly Donation: "DONATION";
};
export type ItemCategory = (typeof ItemCategory)[keyof typeof ItemCategory] | (string & {});
export declare const itemCategorySchema: EnumSchema<ItemCategory>;
