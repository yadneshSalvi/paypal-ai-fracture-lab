import type { Schema } from "../core/validation/schema.js";
import { type OrderTrackerItem } from "./order-tracker-item.js";
import { type ShipmentCarrier } from "./shipment-carrier.js";
export type OrderTrackerRequest = {
    trackingNumber?: string;
    carrier?: ShipmentCarrier;
    carrierNameOther?: string;
    captureId: string;
    notifyPayer?: boolean;
    items?: OrderTrackerItem[];
};
export declare const orderTrackerRequestSchema: Schema<OrderTrackerRequest>;
