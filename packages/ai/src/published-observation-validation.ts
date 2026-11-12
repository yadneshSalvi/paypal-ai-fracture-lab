import { z } from 'zod';
import type { PublishedObservation } from './published-observation';
const money = z.number().int().nonnegative();
const id = z.string().min(1).max(160);
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const receipt = { id, status: z.literal('COMPLETED'), amountMinor: money, currency: z.literal('USD'), observedAt: z.iso.datetime(), source: z.literal('live_sandbox'), evidenceId: z.uuid() };
const schema = z.strictObject({
  schemaVersion: z.literal(1), kind: z.literal('browser-approved-live-bramble-qualification'), observedAt: z.iso.datetime(), source: z.literal('live_sandbox'), faultSource: z.string(),
  checks: z.array(z.strictObject({ name: z.string(), passed: z.boolean() })).min(1), passed: z.boolean(),
  summary: z.strictObject({ baseline: z.strictObject({ grossMinor: money, refundMinor: money, fulfillments: money, verdict: z.literal('fail') }), control: z.strictObject({ grossMinor: money, fulfillments: money, verdict: z.literal('pass') }) }),
  runs: z.array(z.strictObject({
    id: z.uuid(), revision: z.enum(['faulty', 'hardened']), sourceHash: hash, scenarioHash: hash, businessIntentId: id, orderIds: z.array(id).min(1),
    captures: z.array(z.strictObject({ ...receipt, orderId: id })), refunds: z.array(z.strictObject({ ...receipt, captureId: id })),
    events: z.array(z.strictObject({
      id: z.uuid(), sequence: z.number().int().positive(), kind: z.string().min(1), lane: z.enum(['application', 'customer', 'provider', 'lab']), identity: z.enum(['absent', 'stable', 'not_applicable']), resourceId: id.optional(), requestId: id.optional(),
      projection: z.strictObject({ phoneState: z.enum(['ready', 'failed', 'checking', 'paid']), applicationStatus: z.string(), providerStatus: z.string(), capturedMinor: money, refundedMinor: money, captureCount: money, fulfillmentCount: money, currency: z.literal('USD') }),
    })).min(1),
    independentResources: z.array(z.strictObject({ kind: z.enum(['order', 'capture', 'refund']), id, status: z.string(), money: z.strictObject({ currency: z.literal('USD'), minor: money }).nullable(), parentId: id.nullable(), observedAt: z.iso.datetime() })),
  })).length(2), limitations: z.array(z.string()).min(1),
});

export function validatePublishedObservation(input: unknown): PublishedObservation {
  const record = schema.parse(input);
  if (new Set(record.runs.map(run => run.revision)).size !== 2) throw new Error('Both original revisions are required.');
  for (const run of record.runs) {
    const seen = new Set<string>();
    const captured = new Set<string>();
    const refunded = new Set<string>();
    for (const [index, event] of run.events.entries()) {
      if (event.sequence !== index + 1 || seen.has(event.id)) throw new Error('The original event sequence must be complete and unique.');
      seen.add(event.id);
      if (event.kind === 'capture_completed') captured.add(event.resourceId ?? '');
      if (event.kind === 'refund_completed') refunded.add(event.resourceId ?? '');
      const captures = run.captures.filter(item => captured.has(item.id));
      const refunds = run.refunds.filter(item => refunded.has(item.id));
      if (captures.length !== captured.size || refunds.length !== refunded.size || event.projection.captureCount !== captures.length || event.projection.capturedMinor !== captures.reduce((sum, item) => sum + item.amountMinor, 0) || event.projection.refundedMinor !== refunds.reduce((sum, item) => sum + item.amountMinor, 0)) throw new Error('A projected amount lacks its original receipt.');
      if (refunds.some(item => !captured.has(item.captureId))) throw new Error('A refund precedes its original capture.');
    }
    if (run.captures.some(item => !run.orderIds.includes(item.orderId)) || new Set(run.captures.map(item => item.id)).size !== run.captures.length || new Set(run.refunds.map(item => item.id)).size !== run.refunds.length) throw new Error('Receipt identities do not match the original purchase.');
    const last = run.events.at(-1)!.projection;
    const summary = run.revision === 'faulty' ? record.summary.baseline : record.summary.control;
    if (last.capturedMinor !== summary.grossMinor || last.fulfillmentCount !== summary.fulfillments || (run.revision === 'faulty' && last.refundedMinor !== record.summary.baseline.refundMinor)) throw new Error('The final history does not match its published summary.');
  }
  return record;
}
