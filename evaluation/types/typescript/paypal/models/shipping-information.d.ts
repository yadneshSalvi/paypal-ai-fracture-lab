import type { Schema } from "../core/validation/schema.js";
import { type SimplePostalAddressCoarseGrained } from "./simple-postal-address-coarse-grained.js";
export type ShippingInformation = {
    name?: string;
    method?: string;
    address?: SimplePostalAddressCoarseGrained;
    secondaryShippingAddress?: SimplePostalAddressCoarseGrained;
};
export declare const shippingInformationSchema: Schema<ShippingInformation>;
