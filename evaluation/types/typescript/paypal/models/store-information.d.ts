import type { Schema } from "../core/validation/schema.js";
export type StoreInformation = {
    storeId?: string;
    terminalId?: string;
};
export declare const storeInformationSchema: Schema<StoreInformation>;
