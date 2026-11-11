import type { Schema } from "../core/validation/schema.js";
import { type CustomerInformation } from "./customer-information.js";
import { type LinkDescription } from "./link-description.js";
import { type VenmoVaultResponseStatus } from "./venmo-vault-response-status.js";
export type VenmoVaultResponse = {
    id?: string;
    status?: VenmoVaultResponseStatus;
    links?: LinkDescription[];
    customer?: CustomerInformation;
};
export declare const venmoVaultResponseSchema: Schema<VenmoVaultResponse>;
