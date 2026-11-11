import type { Schema } from "../core/validation/schema.js";
import { type CallbackEvents } from "./callback-events.js";
export type CallbackConfiguration = {
    callbackEvents: CallbackEvents[];
    callbackUrl: string;
};
export declare const callbackConfigurationSchema: Schema<CallbackConfiguration>;
