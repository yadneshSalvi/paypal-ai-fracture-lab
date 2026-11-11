import type { Schema } from "../core/validation/schema.js";
export type AuctionInformation = {
    auctionSite?: string;
    auctionItemSite?: string;
    auctionBuyerId?: string;
    auctionClosingDate?: string;
};
export declare const auctionInformationSchema: Schema<AuctionInformation>;
