import type { Schema } from "../core/validation/schema.js";
import { type ErrorDetails } from "./error-details.js";
import { type LinkDescription } from "./link-description.js";
export type SubscriptionError = {
    name: string;
    message: string;
    debugId: string;
    informationLink?: string;
    details?: ErrorDetails[];
    links?: LinkDescription[];
};
export declare const subscriptionErrorSchema: Schema<SubscriptionError>;
