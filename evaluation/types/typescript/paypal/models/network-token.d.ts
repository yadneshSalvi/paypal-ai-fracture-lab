import type { Schema } from "../core/validation/schema.js";
import { type EciFlag } from "./eci-flag.js";
export type NetworkToken = {
    number: string;
    expiry: string;
    cryptogram?: string;
    eciFlag?: EciFlag;
    tokenRequestorId?: string;
};
export declare const networkTokenSchema: Schema<NetworkToken>;
