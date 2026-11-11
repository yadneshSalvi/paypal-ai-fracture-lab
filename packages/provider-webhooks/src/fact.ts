import { z } from 'zod';
import type { EvidenceDTO, ProviderFactDTO } from '@fracture/contracts';

const fingerprint = z.string().regex(/^[a-f0-9]{64}$/);
const time = z.iso.datetime();
const delivery = z.object({
  attemptHash: fingerprint, eventHash: fingerprint, transmissionHash: fingerprint, bodyHash: fingerprint,
  receivedAt: time, verifiedAt: time, classification: z.enum(['verified_new', 'verified_duplicate']),
  responseStatus: z.union([z.literal(200), z.literal(500)]), rawBytesVerified: z.literal(true),
  verification: z.object({ httpStatus: z.literal(200), verificationStatus: z.literal('SUCCESS'), requestHash: fingerprint, responseHash: fingerprint }),
});
const campaign = z.object({
  schemaVersion: z.literal(1), factId: z.literal('F4'), source: z.literal('live_sandbox'), protocolHash: fingerprint,
  sdkCommit: z.literal('5d0df8a8817e5fdf2e2cd48e68f790ea4730aab2'), observedAt: time,
  eventType: z.literal('CHECKOUT.ORDER.APPROVED'), plannedManualResends: z.literal(5),
  slots: z.array(z.object({
    slot: z.string(), kind: z.enum(['resend', 'natural']), orderHash: fingerprint, orderStatus: z.literal('APPROVED'),
    canonicalEvents: z.literal(1), eventHash: fingerprint, canonicalBodyHash: fingerprint, deliveries: z.array(delivery).min(1),
    resend: z.object({ requestedAt: time, completedAt: time, status: z.number().int(), requestHash: fingerprint, responseHash: fingerprint,
      originalEventRead: z.object({ status: z.literal(200), bodyHash: fingerprint, eventBound: z.literal(true) }) }).nullable(),
  })).length(6),
  naturalRule: z.object({ createdAt: time, expiresAt: time, usedAttemptHash: fingerprint, exactOrderHash: fingerprint,
    eventType: z.literal('CHECKOUT.ORDER.APPROVED'), singleInjected500: z.literal(true), explicitResends: z.literal(0) }),
  financialOperations: z.object({ creates: z.literal(6), approvals: z.literal(6), authorizations: z.literal(0), captures: z.literal(0), refunds: z.literal(0) }),
});

/** Derive every displayed observation from bound intake records, not a conclusion label. */
export function inspectWebhookCampaign(body: Record<string, unknown>) {
  const parsed = campaign.safeParse(body);
  if (!parsed.success) return null;
  const data = parsed.data;
  const expected = ['resend-1', 'resend-2', 'resend-3', 'resend-4', 'resend-5', 'natural-1'];
  if (new Set(data.slots.map(s => s.slot)).size !== 6 || expected.some(id => !data.slots.some(s => s.slot === id))) return null;
  if (new Set(data.slots.map(s => s.orderHash)).size !== 6 || new Set(data.slots.map(s => s.eventHash)).size !== 6) return null;
  const all = data.slots.flatMap(s => s.deliveries);
  if (new Set(all.map(d => d.attemptHash)).size !== all.length) return null;
  for (const s of data.slots) {
    if (s.kind !== (s.slot === 'natural-1' ? 'natural' : 'resend')) return null;
    if (s.deliveries.some(d => d.eventHash !== s.eventHash || d.bodyHash !== s.canonicalBodyHash || Date.parse(d.verifiedAt) < Date.parse(d.receivedAt) || Date.parse(d.receivedAt) > Date.parse(data.observedAt))) return null;
    if (s.deliveries.filter(d => d.classification === 'verified_new').length !== 1 || s.deliveries[0]?.classification !== 'verified_new') return null;
    if (s.deliveries.some((d, i) => i > 0 && Date.parse(d.receivedAt) < Date.parse(s.deliveries[i - 1]!.receivedAt))) return null;
  }
  const manual = data.slots.filter(s => s.kind === 'resend').map(s => {
    const first = s.deliveries[0]!;
    const accepted = s.resend?.status === 202 && first.responseStatus === 200 && Date.parse(s.resend.requestedAt) >= Date.parse(first.verifiedAt);
    const repeated = accepted && s.deliveries.slice(1).some(d => d.classification === 'verified_duplicate' && d.responseStatus === 200 && d.transmissionHash !== first.transmissionHash && Date.parse(d.receivedAt) >= Date.parse(s.resend!.requestedAt));
    return { ...s, accepted, repeated };
  });
  const natural = data.slots.find(s => s.kind === 'natural')!;
  const first = natural.deliveries[0]!;
  const rule = data.naturalRule;
  const second = natural.deliveries.slice(1).find(d => d.classification === 'verified_duplicate' && d.responseStatus === 200 && Date.parse(d.receivedAt) > Date.parse(first.receivedAt));
  const naturalObserved = natural.resend === null && first.responseStatus === 500 && rule.usedAttemptHash === first.attemptHash && rule.exactOrderHash === natural.orderHash && Date.parse(rule.createdAt) < Date.parse(first.receivedAt) && Date.parse(rule.expiresAt) > Date.parse(first.receivedAt) && Boolean(second);
  return { data, manual, verifiedResends: manual.filter(s => s.repeated).length, natural, naturalObserved,
    naturalDelayMs: naturalObserved && second ? Date.parse(second.receivedAt) - Date.parse(first.receivedAt) : null,
    naturalTransmissionReused: naturalObserved && second ? second.transmissionHash === first.transmissionHash : null,
    verifiedIntakes: all.length };
}

export function webhookDeliveryFact(evidence: EvidenceDTO): ProviderFactDTO | null {
  const result = inspectWebhookCampaign(evidence.body);
  if (!result) return null;
  const n = result.verifiedResends;
  return { id: 'F4', title: 'Authentic webhook delivery', endpoint: '/v1/notifications/webhooks-events/{event_id}/resend', method: 'POST',
    sdkCommit: result.data.sdkCommit, status: n === 5 && result.naturalObserved ? 'supported_observation' : 'inconclusive',
    statement: `${n} of five accepted resend requests have a separate verified delivery at this snapshot.${result.naturalObserved ? ` One natural retry followed the committed event and injected HTTP 500 after ${(result.naturalDelayMs! / 1000).toFixed(3)} seconds.` : ' The natural retry is not yet qualified.'}`,
    limitation: 'Approval events for one sandbox app only. Canonical receiver admission is deduplicated; target fulfillment and capture-event ordering remain unqualified. One natural retry is not a repeated guarantee. Missing deliveries remain inconclusive.',
    scope: 'Historical approval-only campaign · isolated US sandbox app · no captured funds', source: 'live_sandbox', observedAt: result.data.observedAt,
    repetitions: n, requiredRepetitions: 5, documentationUrl: 'https://developer.paypal.com/api/rest/webhooks/rest/', evidenceIds: [evidence.id] };
}
