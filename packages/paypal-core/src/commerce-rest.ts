import { fromProviderMoney, toProviderMoney } from './canonical.js';
import { assertSandboxConfig, type SandboxConfig } from './provider.js';
import type { MinorMoney } from './types.js';

/** Private observations; callers must redact recipients and references in public DTOs. */
export interface RestMeta { httpStatus: number | null; debugId: string | null; observedAt: string; source: 'live_sandbox' }
export type CommerceRestResult<T> = (RestMeta & { outcome: 'succeeded'; value: T; recovered: boolean }) | (RestMeta & { outcome: 'refused' | 'not_sent' | 'unknown'; code: string; message: string; originalPayoutBatchId: string | null });
export interface InvoiceIdentity { invoiceNumber: string; reference: string }
export interface OwnedInvoice extends InvoiceIdentity { id: string }
export interface DraftInvoice extends InvoiceIdentity { merchantEmail: string; recipientEmail: string; itemName: string; money: MinorMoney }
export interface InvoicePayment { id: string | null; type: string; method: string; money: MinorMoney | null; date: string | null }
export interface InvoiceRefund extends InvoicePayment { originalPaymentId: null }
export interface InvoiceObservation extends OwnedInvoice {
  status: string; invoiceDate: string | null; money: MinorMoney | null; due: MinorMoney | null;
  recipientEmails: string[]; payerUrl: string | null; payments: InvoicePayment[]; refunds: InvoiceRefund[];
}
export interface PayoutRequestItem { senderItemId: string; recipientType: 'EMAIL' | 'PAYPAL_ID'; receiver: string; money: MinorMoney }
export interface CreatePayout { senderBatchId: string; requestId: string; items: PayoutRequestItem[] }
export interface PayoutItemObservation extends PayoutRequestItem {
  id: string; batchId: string; status: string; transactionId: string | null; fee: MinorMoney | null; processedAt: string | null;
}
export interface PayoutBatchObservation {
  id: string; senderBatchId: string; status: string; money: MinorMoney | null; estimatedFees: MinorMoney | null;
  items: PayoutItemObservation[]; complete: boolean;
}
export interface OwnedPayoutItem extends PayoutRequestItem { id: string; batchId: string }
type ObjectValue = Record<string, unknown>;
const root = 'https://api-m.sandbox.paypal.com';
const meta = (httpStatus: number | null = null, debugId: string | null = null): RestMeta => ({ httpStatus, debugId, observedAt: new Date().toISOString(), source: 'live_sandbox' });
const fail = (outcome: 'refused' | 'not_sent' | 'unknown', code: string, message: string, m: RestMeta = meta(), originalPayoutBatchId: string | null = null): CommerceRestResult<never> => ({ ...meta(m.httpStatus,m.debugId), outcome, code, message, originalPayoutBatchId });
function object(value: unknown): ObjectValue { if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid object'); return value as ObjectValue; }
function text(value: unknown, max = 256): string { if (typeof value !== 'string' || !value.trim() || value.length > max || /[\u0000-\u001f\u007f]/.test(value)) throw new Error('Invalid text'); return value; }
function optionalText(value: unknown, max = 256): string | null { return value === undefined || value === null ? null : text(value,max); }
function id(value: unknown): string { const result = text(value,256); if (!/^[A-Za-z0-9._-]+$/.test(result)) throw new Error('Invalid identifier'); return result; }
function email(value: unknown): string { const result = text(value,127); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result)) throw new Error('Invalid email'); return result; }
function array(value: unknown, max = 1000): unknown[] { if (!Array.isArray(value) || value.length > max) throw new Error('Invalid collection'); return value; }
function optionalArray(value: unknown, max = 1000): unknown[] { return value === undefined ? [] : array(value,max); }
function money(value: unknown, payout = false): MinorMoney | null {
  if (value === undefined || value === null) return null;
  const v = object(value), parsed = fromProviderMoney({ currencyCode: text(v[payout ? 'currency' : 'currency_code'],3), value: text(v.value,40) });
  if (parsed.currency !== 'USD') throw new Error('Unexpected currency'); return parsed;
}
function requestMoney(value: MinorMoney) { if (value.currency !== 'USD') throw new Error('Only USD is supported'); return toProviderMoney(value); }
function sameMoney(a: MinorMoney | null, b: MinorMoney) { return a?.currency === b.currency && a.minor === b.minor; }
function identity(value: InvoiceIdentity) { return { invoiceNumber: text(value.invoiceNumber,25), reference: text(value.reference,120) }; }
function safePayerUrl(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const url = new URL(text(value,2048));
  if (url.protocol !== 'https:' || url.hostname !== 'www.sandbox.paypal.com' || url.username || url.password || url.port) throw new Error('Unsafe payer URL'); return url.href;
}
function providerLinkId(value: unknown, prefix: string): string | null {
  try { const url = new URL(text(value,2048)); if (url.origin !== root || url.username || url.password || url.search || url.hash || !url.pathname.startsWith(prefix)) return null;
    const suffix = url.pathname.slice(prefix.length); return suffix && !suffix.includes('/') ? id(suffix) : null;
  } catch { return null; }
}
function invoice(value: unknown): InvoiceObservation {
  const v = object(value), d = object(v.detail), md = d.metadata === undefined ? {} : object(d.metadata);
  const payment = (item: unknown, refund: boolean): InvoicePayment => { const p = object(item); return { id: optionalText(p[refund ? 'refund_id' : 'payment_id'],30), type: optionalText(p.type,40) ?? 'UNSPECIFIED', method: text(p.method,40), money: money(p.amount), date: optionalText(p.payment_date_time ?? p.payment_date ?? p.refund_date,100) }; };
  return { id: id(v.id), status: text(v.status,50), invoiceNumber: text(d.invoice_number,25), reference: text(d.reference,120), invoiceDate: optionalText(d.invoice_date,10), money: money(v.amount), due: money(v.due_amount), payerUrl: safePayerUrl(md.recipient_view_url),
    payments: v.payments === undefined ? [] : optionalArray(object(v.payments).transactions,100).map(p => payment(p,false)),
    refunds: v.refunds === undefined ? [] : optionalArray(object(v.refunds).transactions,100).map(p => ({ ...payment(p,true), originalPaymentId: null })),
    recipientEmails: optionalArray(v.primary_recipients,100).map(r => email(object(object(r).billing_info).email_address)) };
}
function payoutInput(value: PayoutRequestItem): PayoutRequestItem {
  const recipientType = value.recipientType; if (recipientType !== 'EMAIL' && recipientType !== 'PAYPAL_ID') throw new Error('Unsupported recipient');
  const receiver = recipientType === 'EMAIL' ? email(value.receiver) : id(value.receiver); if (receiver.length > 127) throw new Error('Receiver too long');
  requestMoney(value.money); return { senderItemId: text(value.senderItemId,63), recipientType, receiver, money: value.money };
}
function payoutItem(value: unknown): PayoutItemObservation {
  const v = object(value), p = object(v.payout_item), amount = money(p.amount,true); if (!amount) throw new Error('Missing amount');
  const bound = payoutInput({ senderItemId: text(p.sender_item_id,63), recipientType: text(p.recipient_type,13) as PayoutRequestItem['recipientType'], receiver: text(p.receiver,127), money: amount });
  return { ...bound, id: id(v.payout_item_id), batchId: id(v.payout_batch_id), status: text(v.transaction_status,50), transactionId: optionalText(v.transaction_id,30), fee: money(v.payout_item_fee,true), processedAt: optionalText(v.time_processed,100) };
}
function payoutBatch(value: unknown): PayoutBatchObservation {
  const v = object(value), h = object(v.batch_header), sender = object(h.sender_batch_header);
  const result: PayoutBatchObservation = { id: id(h.payout_batch_id), senderBatchId: text(sender.sender_batch_id,256), status: text(h.batch_status,50), money: money(h.amount,true), estimatedFees: money(h.fees,true), items: optionalArray(v.items).map(payoutItem), complete: false };
  if (result.items.some(item => item.batchId !== result.id)) throw new Error('Wrong batch child'); return result;
}
function itemMatches(a: PayoutRequestItem, b: PayoutRequestItem) { return a.senderItemId === b.senderItemId && a.receiver === b.receiver && a.recipientType === b.recipientType && sameMoney(a.money,b.money); }
function invoiceMatches(a: InvoiceObservation, b: InvoiceIdentity) { return a.invoiceNumber === b.invoiceNumber && a.reference === b.reference; }
function pageCount(v: ObjectValue, currentItems: number) {
  const pages = v.total_pages, count = v.total_items;
  if (!Number.isInteger(pages) || !Number.isInteger(count) || (pages as number) < 0 || (pages as number) > 1000 || (count as number) < 0 || (count as number) > 100000 || ((pages === 0) !== (count === 0)) || (count as number) < currentItems) throw new Error('Incomplete pagination');
  return { pages: pages as number, count: count as number };
}

/** Transport only. Caller commits domain authority and a unique durable claim before writes. */
export class SandboxCommerceRestGateway {
  private token: { value: string; expiresAt: number } | null = null;
  constructor(private readonly config: SandboxConfig, private readonly transport: typeof fetch = fetch) { assertSandboxConfig(config); }
  private async accessToken(signal: AbortSignal): Promise<string> {
    if (this.token && this.token.expiresAt > Date.now() + 30000) return this.token.value;
    const response = await this.transport(new Request(root + '/v1/oauth2/token', { method: 'POST', redirect: 'error', signal, headers: { Authorization: 'Basic ' + Buffer.from(this.config.clientId + ':' + this.config.clientSecret).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=client_credentials' }));
    if (!response.ok) throw new Error('Credential request refused');
    const v = object(await this.readBody(response));
    if (typeof v.expires_in !== 'number' || v.expires_in <= 0 || v.token_type !== 'Bearer') throw new Error('Invalid credential');
    const value = text(v.access_token,16384); this.token = { value, expiresAt: Date.now() + Math.min(v.expires_in,28800) * 1000 }; return value;
  }
  private async readBody(response: Response): Promise<unknown> {
    const reader = response.body?.getReader(); if (!reader) return null;
    let length = 0; const chunks: Uint8Array[] = [];
    try { for (;;) { const chunk = await reader.read(); if (chunk.done) break; length += chunk.value.length; if (length > 2 * 1024 * 1024) { await reader.cancel(); throw new Error('Response exceeds bound'); } chunks.push(chunk.value); } }
    finally { reader.releaseLock(); }
    const body = Buffer.concat(chunks).toString('utf8'); return body ? JSON.parse(body) : null;
  }
  private async request<T>(path: string, method: 'GET' | 'POST', body: unknown, write: boolean, decode: (body: unknown) => T, signal?: AbortSignal, requestId?: string): Promise<CommerceRestResult<T>> {
    const combined = signal ? AbortSignal.any([signal,AbortSignal.timeout(25000)]) : AbortSignal.timeout(25000);
    let encoded: string | undefined;
    try { if (combined.aborted) throw new Error('Aborted'); encoded = body === undefined ? undefined : JSON.stringify(body); if (!path.startsWith('/v') || path.includes('://')) throw new Error('Invalid path'); }
    catch { return fail('not_sent','INVALID_REQUEST','The request was rejected before dispatch.'); }
    let token: string;
    try { token = await this.accessToken(combined); if (combined.aborted) throw new Error('Aborted'); }
    catch { return fail('not_sent','AUTH_UNAVAILABLE','Provider authentication was unavailable before dispatch.'); }
    let m = meta();
    try {
      const headers = new Headers({ Authorization: 'Bearer ' + token, Accept: 'application/json' });
      if (encoded !== undefined) headers.set('Content-Type','application/json');
      if (requestId) headers.set('PayPal-Request-Id',requestId);
      const response = await this.transport(new Request(root + path, { method, headers, redirect: 'error', signal: combined, ...(encoded === undefined ? {} : { body: encoded }) }));
      const debug = response.headers.get('paypal-debug-id'); m = meta(response.status,debug && /^[a-zA-Z0-9_-]{1,128}$/.test(debug) ? debug : null);
      if (response.status === 401) this.token = null;
      let raw: unknown;
      try { raw = await this.readBody(response); } catch { if (response.ok) throw new Error('Unreadable response'); raw = null; }
      if (!response.ok) {
        let original: string | null = null;
        if (raw && typeof raw === 'object' && !Array.isArray(raw)) for (const link of optionalArray((raw as ObjectValue).links).slice(0,20)) {
          const l = object(link); if (l.rel === 'duplicate_batch' || l.rel === 'self') original ??= providerLinkId(l.href,'/v1/payments/payouts/');
        }
        return fail(write && response.status >= 400 && response.status < 500 && response.status !== 408 ? 'refused' : 'unknown',original ? 'DUPLICATE_PAYOUT' : 'PROVIDER_RESPONSE','The provider did not return a verified result; reconcile the existing operation.',m,original);
      }
      return { ...m, outcome: 'succeeded', value: decode(raw), recovered: false };
    } catch { return fail('unknown','RESPONSE_UNCERTAIN','The provider response is unavailable or incomplete. Reconcile before another write.',m); }
  }
  private invalid(): CommerceRestResult<never> { return fail('not_sent','INVALID_REQUEST','The request is outside the typed sandbox contract.'); }
  async getInvoice(invoiceId: string, signal?: AbortSignal): Promise<CommerceRestResult<InvoiceObservation>> {
    try { id(invoiceId); } catch { return this.invalid(); }
    return this.request('/v2/invoicing/invoices/' + encodeURIComponent(invoiceId),'GET',undefined,false,value => { const v = invoice(value); if (v.id !== invoiceId) throw new Error('Wrong invoice'); return v; },signal);
  }
  async findInvoices(match: InvoiceIdentity, signal?: AbortSignal): Promise<CommerceRestResult<InvoiceObservation[]>> {
    try { identity(match); } catch { return this.invalid(); }
    const result: InvoiceObservation[] = []; let expected: { pages: number; count: number } | null = null; let last: RestMeta = meta(); let observed = 0;
    for (let page = 1; page <= (expected?.pages ?? 1); page++) {
      const response = await this.request('/v2/invoicing/search-invoices?page=' + page + '&page_size=100&total_required=true','POST',{ invoice_number: match.invoiceNumber, reference: match.reference },false,value => object(value),signal);
      if (response.outcome !== 'succeeded') return response; last = response;
      try {
        const items = optionalArray(response.value.items,100), current = pageCount(response.value,items.length);
        if (expected && (expected.pages !== current.pages || expected.count !== current.count)) throw new Error('Pagination changed'); expected = current; observed += items.length;
        for (const item of items) { const summary = object(item), detail = object(summary.detail); if (detail.invoice_number !== match.invoiceNumber || detail.reference !== match.reference) continue;
          const full = await this.getInvoice(id(summary.id),signal); if (full.outcome !== 'succeeded') return full;
          if (!invoiceMatches(full.value,match) || result.some(v => v.id === full.value.id)) throw new Error('Ambiguous invoice'); result.push(full.value);
        }
      } catch { return fail('unknown','SEARCH_INCOMPLETE','The invoice search could not establish a complete, stable result.',last); }
    }
    if (!expected || observed !== expected.count) return fail('unknown','SEARCH_INCOMPLETE','The invoice search result is incomplete.',last);
    return { ...meta(last.httpStatus,last.debugId), outcome: 'succeeded', value: result, recovered: false };
  }
  async createInvoice(input: DraftInvoice, signal?: AbortSignal): Promise<CommerceRestResult<InvoiceObservation>> {
    let payload: unknown;
    try { identity(input); const m = requestMoney(input.money); payload = { detail: { invoice_number: input.invoiceNumber, reference: input.reference, currency_code: 'USD' }, invoicer: { email_address: email(input.merchantEmail) }, primary_recipients: [{ billing_info: { email_address: email(input.recipientEmail) } }], items: [{ name: text(input.itemName,200), quantity: '1', unit_amount: { currency_code: m.currencyCode, value: m.value } }], configuration: { allow_tip: false, partial_payment: { allow_partial_payment: false } } }; } catch { return this.invalid(); }
    const created = await this.request('/v2/invoicing/invoices','POST',payload,true,value => { const v = object(value); if (v.id) return id(v.id); const linked = providerLinkId(v.href,'/v2/invoicing/invoices/'); if (!linked) throw new Error('Missing invoice identity'); return linked; },signal);
    if (created.outcome === 'not_sent' || created.outcome === 'refused') return created;
    const read = created.outcome === 'succeeded' ? await this.getInvoice(created.value,signal) : null;
    if (read?.outcome === 'succeeded' && invoiceMatches(read.value,input) && sameMoney(read.value.money,input.money) && read.value.recipientEmails.length === 1 && read.value.recipientEmails[0]?.toLowerCase() === input.recipientEmail.toLowerCase()) return read;
    const recovered = await this.findInvoices(input);
    if (recovered.outcome === 'succeeded' && recovered.value.length === 1) { const v = recovered.value[0]!; if (sameMoney(v.money,input.money) && v.recipientEmails.length === 1 && v.recipientEmails[0]?.toLowerCase() === input.recipientEmail.toLowerCase()) return { ...recovered, value: v, recovered: true }; }
    return fail('unknown','INVOICE_RECONCILIATION_REQUIRED','The exact invoice could not be corroborated. Keep its original number and reference.',created);
  }
  private async invoiceMutation(owned: OwnedInvoice, action: 'send' | 'cancel', signal?: AbortSignal): Promise<CommerceRestResult<InvoiceObservation>> {
    try { id(owned.id); identity(owned); } catch { return this.invalid(); }
    const before = await this.getInvoice(owned.id,signal);
    if (before.outcome !== 'succeeded') return fail('not_sent','PREFLIGHT_UNAVAILABLE','The current invoice could not be verified before dispatch.',before);
    const date = before.value.invoiceDate;
    if (!invoiceMatches(before.value,owned) || date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > new Date().toISOString().slice(0,10))) return fail('not_sent','INVOICE_AUTHORITY_MISMATCH','The invoice identity or scheduled date is outside this share-link workflow.',before);
    const already = action === 'cancel' ? ['CANCELLED','AUTO_CANCELLED'] : ['SENT','SHARED','UNPAID','PAID','PARTIALLY_PAID','PAYMENT_PENDING'];
    if (already.includes(before.value.status)) return { ...before, recovered: true };
    if (action === 'send' && before.value.status !== 'DRAFT' || action === 'cancel' && !['SENT','SHARED','UNPAID'].includes(before.value.status)) return fail('not_sent','INVOICE_STATE_NOT_ALLOWED','The current invoice state does not permit this operation.',before);
    const changed = await this.request('/v2/invoicing/invoices/' + encodeURIComponent(owned.id) + '/' + action,'POST',{ send_to_recipient: false, send_to_invoicer: false },true,() => null,signal);
    if (changed.outcome === 'not_sent' || changed.outcome === 'refused') return changed;
    const after = await this.getInvoice(owned.id);
    if (after.outcome === 'succeeded' && invoiceMatches(after.value,owned) && already.includes(after.value.status)) return { ...after, recovered: changed.outcome !== 'succeeded' };
    return fail('unknown','INVOICE_RECONCILIATION_REQUIRED','The invoice state remains unverified. Do not substitute a new invoice.',changed);
  }
  sendInvoice(owned: OwnedInvoice, signal?: AbortSignal) { return this.invoiceMutation(owned,'send',signal); }
  cancelInvoice(owned: OwnedInvoice, signal?: AbortSignal) { return this.invoiceMutation(owned,'cancel',signal); }
  async createPayout(input: CreatePayout, signal?: AbortSignal): Promise<CommerceRestResult<PayoutBatchObservation>> {
    let items: PayoutRequestItem[];
    try { text(input.senderBatchId,256); text(input.requestId,1000); items = array(input.items,100).map(v => payoutInput(v as PayoutRequestItem)); if (!items.length || new Set(items.map(v => v.senderItemId)).size !== items.length) throw new Error('Duplicate items'); } catch { return this.invalid(); }
    const response = await this.request('/v1/payments/payouts','POST',{ sender_batch_header: { sender_batch_id: input.senderBatchId }, items: items.map(item => ({ sender_item_id: item.senderItemId, recipient_type: item.recipientType, receiver: item.receiver, amount: { currency: 'USD', value: requestMoney(item.money).value } })) },true,value => { const v = payoutBatch(value); if (v.senderBatchId !== input.senderBatchId) throw new Error('Wrong batch'); return v; },signal,input.requestId);
    if (response.outcome !== 'succeeded' && response.originalPayoutBatchId) {
      const read = await this.getPayoutBatch(response.originalPayoutBatchId,input.senderBatchId);
      if (read.outcome === 'succeeded' && read.value.items.length === items.length && items.every(wanted => read.value.items.some(actual => itemMatches(actual,wanted)))) return { ...read, recovered: true };
      return fail('unknown','PAYOUT_RECONCILIATION_REQUIRED','The duplicate batch could not be bound to the exact original items.',response,response.originalPayoutBatchId);
    }
    return response;
  }
  async getPayoutBatch(batchId: string, senderBatchId: string, signal?: AbortSignal): Promise<CommerceRestResult<PayoutBatchObservation>> {
    try { id(batchId); text(senderBatchId,256); } catch { return this.invalid(); }
    let result: PayoutBatchObservation | null = null; let expected: { pages: number; count: number } | null = null; let last: RestMeta = meta();
    for (let page = 1; page <= (expected?.pages ?? 1); page++) {
      const response = await this.request('/v1/payments/payouts/' + encodeURIComponent(batchId) + '?page=' + page + '&page_size=100&total_required=true','GET',undefined,false,value => object(value),signal);
      if (response.outcome !== 'succeeded') return response; last = response;
      try {
        const batch = payoutBatch(response.value), counts = pageCount(response.value,batch.items.length);
        if (batch.id !== batchId || batch.senderBatchId !== senderBatchId || expected && (expected.pages !== counts.pages || expected.count !== counts.count)) throw new Error('Batch identity or pagination changed');
        if (result && (batch.status !== result.status || JSON.stringify(batch.money) !== JSON.stringify(result.money) || JSON.stringify(batch.estimatedFees) !== JSON.stringify(result.estimatedFees))) throw new Error('Batch changed during read');
        expected = counts; result ??= { ...batch, items: [] }; result.items.push(...batch.items);
      } catch { return fail('unknown','PAYOUT_READ_INCOMPLETE','The complete payout batch could not be verified.',last); }
    }
    if (!result || !expected || result.items.length !== expected.count || new Set(result.items.map(v => v.id)).size !== result.items.length || new Set(result.items.map(v => v.senderItemId)).size !== result.items.length) return fail('unknown','PAYOUT_READ_INCOMPLETE','The payout item collection is incomplete or ambiguous.',last);
    return { ...meta(last.httpStatus,last.debugId), outcome:'succeeded', value:{ ...result, complete:true }, recovered:false };
  }
  async getPayoutItem(itemId: string, signal?: AbortSignal): Promise<CommerceRestResult<PayoutItemObservation>> {
    try { id(itemId); } catch { return this.invalid(); }
    return this.request('/v1/payments/payouts-item/' + encodeURIComponent(itemId),'GET',undefined,false,value => { const item = payoutItem(value); if (item.id !== itemId) throw new Error('Wrong item'); return item; },signal);
  }
  async cancelUnclaimedPayout(owned: OwnedPayoutItem, signal?: AbortSignal): Promise<CommerceRestResult<PayoutItemObservation>> {
    try { id(owned.id); id(owned.batchId); payoutInput(owned); } catch { return this.invalid(); }
    const before = await this.getPayoutItem(owned.id,signal);
    if (before.outcome !== 'succeeded') return fail('not_sent','PREFLIGHT_UNAVAILABLE','The payout item could not be verified before dispatch.',before);
    if (before.value.batchId !== owned.batchId || !itemMatches(before.value,owned)) return fail('not_sent','PAYOUT_AUTHORITY_MISMATCH','The current payout item does not match the owned recipient and amount.',before);
    if (before.value.status === 'RETURNED') return { ...before,recovered:true };
    if (before.value.status !== 'UNCLAIMED') return fail('not_sent','PAYOUT_NOT_UNCLAIMED','Only a currently unclaimed item can be cancelled.',before);
    const response = await this.request('/v1/payments/payouts-item/' + encodeURIComponent(owned.id) + '/cancel','POST',undefined,true,payoutItem,signal);
    if (response.outcome === 'not_sent' || response.outcome === 'refused') return response;
    const after = response.outcome === 'succeeded' ? response : await this.getPayoutItem(owned.id);
    if (after.outcome === 'succeeded' && after.value.id === owned.id && after.value.batchId === owned.batchId && itemMatches(after.value,owned) && after.value.status === 'RETURNED') return { ...after,recovered:response.outcome !== 'succeeded' };
    return fail('unknown','PAYOUT_RECONCILIATION_REQUIRED','The original payout cancellation is not yet verified.',response);
  }
}
