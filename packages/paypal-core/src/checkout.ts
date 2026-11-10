import type { AuthorizationDecision, PaymentAction, SavedWallet, SaveWalletOnSuccess } from "./types.js";
import { PaymentError } from "./types.js";
import { assertMoney } from "./canonical.js";

const patterns = new Set(["IMMEDIATE","DEFERRED","RECURRING_PREPAID","RECURRING_POSTPAID","THRESHOLD_PREPAID","THRESHOLD_POSTPAID","SUBSCRIPTION_PREPAID","SUBSCRIPTION_POSTPAID","UNSCHEDULED_PREPAID","UNSCHEDULED_POSTPAID","INSTALLMENT_PREPAID","INSTALLMENT_POSTPAID"]);
const consentFields:readonly (keyof SavedWallet)[] = ["vaultId","consentId","consentVersion","consentDigest","paymentInitiator","usagePattern","usage"];
const saveConsentFields:readonly (keyof SaveWalletOnSuccess)[] = ["consentId","consentVersion","consentDigest","usageType"];
function redirectOrigin(value:string):string {
  try {
    const url = new URL(value);
    const local = ["localhost","127.0.0.1","[::1]"].includes(url.hostname);
    if(value.length>2048||url.username||url.password||url.hash||!(url.protocol==="https:"||url.protocol==="http:"&&local))throw new Error();
    return url.origin;
  } catch { throw new PaymentError("INVALID_CHECKOUT_URL","Checkout redirects require HTTPS or local development URLs without credentials or fragments.",400); }
}

/** A typed SDK payload is not authorization. Recheck the owning domain's current grant. */
export function assertCheckoutAuthority(action:PaymentAction,decision:AuthorizationDecision,now:Date):void {
  if(action.kind!=="create_order")return;
  if(action.items!==undefined){
    if(!Array.isArray(action.items)||action.items.length<1||action.items.length>100)throw new PaymentError("INVALID_CHECKOUT_ITEMS","Supply between one and one hundred itemized components.",400);
    let total=0n;
    for(const item of action.items){
      if(!item||typeof item.name!=="string"||!item.name.trim()||item.name.length>127||!Number.isSafeInteger(item.quantity)||item.quantity<1||item.quantity>9999||item.sku!==undefined&&(typeof item.sku!=="string"||!item.sku.trim()||item.sku.length>127)||!item.unitAmount)throw new PaymentError("INVALID_CHECKOUT_ITEM","Each component needs a bounded name, whole positive quantity and exact unit amount.",400);
      assertMoney(item.unitAmount);
      if(item.unitAmount.currency!==action.money.currency)throw new PaymentError("ITEM_CURRENCY_MISMATCH","Every component must use the approved order currency.",400);
      total+=BigInt(item.unitAmount.minor)*BigInt(item.quantity);
    }
    if(total!==BigInt(action.money.minor))throw new PaymentError("ITEM_TOTAL_MISMATCH","The component totals must exactly equal the approved order amount.",400);
  }
  if(action.experience){
    const experience=action.experience;
    for(const value of [experience.returnUrl,experience.cancelUrl]){
      if(!decision.checkoutOrigins?.includes(redirectOrigin(value)))throw new PaymentError("CHECKOUT_ORIGIN_NOT_GRANTED","The checkout redirect is outside this project's current approved origins.",403);
    }
    if(!["PAY_NOW","CONTINUE"].includes(experience.userAction)||!["GET_FROM_FILE","NO_SHIPPING"].includes(experience.shippingPreference)||experience.landingPage!==undefined&&!["LOGIN","GUEST_CHECKOUT","NO_PREFERENCE"].includes(experience.landingPage)||experience.brandName!==undefined&&(!experience.brandName.trim()||experience.brandName.length>127)||experience.locale!==undefined&&!/^[a-z]{2}-[A-Z]{2}$/.test(experience.locale))throw new PaymentError("INVALID_CHECKOUT_EXPERIENCE","Review the checkout display and locale settings.",400);
  }
  if(action.savedWallet){
    const wallet=action.savedWallet;const consent=decision.savedWalletConsent;
    if(!/^[a-zA-Z0-9_-]{3,128}$/.test(wallet.vaultId)||!wallet.consentId||!wallet.consentDigest||!Number.isSafeInteger(wallet.consentVersion)||wallet.consentVersion<1||!["CUSTOMER","MERCHANT"].includes(wallet.paymentInitiator)||!patterns.has(wallet.usagePattern)||!["DERIVED","SUBSEQUENT"].includes(wallet.usage))throw new PaymentError("INVALID_WALLET_CONSENT","A saved wallet requires valid consent and charge metadata.",400);
    if(!consent||consentFields.some(field=>consent[field]!==wallet[field])||!Number.isFinite(Date.parse(consent.expiresAt))||Date.parse(consent.expiresAt)<=now.getTime())throw new PaymentError("WALLET_CONSENT_NOT_GRANTED","Current consent does not authorize this saved wallet and charge pattern.",403);
  }
  if(action.saveWalletOnSuccess!==undefined){
    const save=action.saveWalletOnSuccess;const consent=decision.saveWalletConsent;
    if(!save||typeof save!=="object"||Array.isArray(save))throw new PaymentError("INVALID_SAVE_WALLET_CONSENT","Saving a wallet requires an explicit consent record.",400);
    if(action.savedWallet)throw new PaymentError("CONFLICTING_WALLET_SOURCES","Choose a saved wallet or explicit first-purchase saving, not both.",400);
    if(!action.experience)throw new PaymentError("SAVE_WALLET_REDIRECT_REQUIRED","Saving a wallet requires buyer-present checkout and approved return and cancel URLs.",400);
    const validText=(value:unknown)=>typeof value==="string"&&value.trim().length>0&&value.length<=256;
    if(!validText(save.consentId)||!validText(save.consentDigest)||!Number.isSafeInteger(save.consentVersion)||save.consentVersion<1||save.usageType!=="MERCHANT")throw new PaymentError("INVALID_SAVE_WALLET_CONSENT","Saving a wallet requires explicit merchant consent with a valid version and digest.",400);
    if(!consent||saveConsentFields.some(field=>consent[field]!==save[field])||!Number.isFinite(Date.parse(consent.expiresAt))||Date.parse(consent.expiresAt)<=now.getTime())throw new PaymentError("SAVE_WALLET_CONSENT_NOT_GRANTED","Current consent does not authorize saving this wallet after the purchase.",403);
  }
}
