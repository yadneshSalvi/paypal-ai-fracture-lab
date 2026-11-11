"use client";
import { ArrowUpRight, Check, Radio, RotateCcw } from 'lucide-react';
import { inspectWebhookCampaign } from '../../../packages/provider-webhooks/src/fact';
import { useWorkspace } from './workspace-provider';

export function WebhookDeliveryExperiment() {
  const { workspace, openEvidence } = useWorkspace();
  const proof = workspace?.evidence.find(e => e.id === 'artifact:paypal-webhook-delivery-qualification.json');
  const result = proof ? inspectWebhookCampaign(proof.body) : null;
  if (!proof || !result) return null;
  return <section className="identity-experiment webhook-experiment" aria-labelledby="webhook-title">
    <div className="identity-heading"><span className="round-icon violet"><Radio size={22}/></span><div><span className="eyebrow">AUTHENTIC PAYPAL DELIVERY</span><h2 id="webhook-title">The message came back.</h2><p>A failed acknowledgment. A real retry. Every arrival retained beside one canonical event.</p></div><span className="identity-spend">{result.verifiedIntakes}<span>verified arrivals</span></span></div>
    <div className="webhook-natural"><div><span className="tiny-tag">ONE NATURAL RETRY</span><h3>{result.naturalObserved ? `500 → ${(result.naturalDelayMs! / 1000).toFixed(1)}s → 200` : 'Still awaiting qualified evidence'}</h3><p>The first event was committed before the controlled 500 response. {result.naturalObserved ? 'PayPal delivered it again; the receiver admitted no second canonical event.' : 'A resend acknowledgment alone cannot establish this result.'}</p></div><div className="webhook-dedup"><RotateCcw size={22}/><strong>1</strong><span>canonical event</span></div></div>
    <div className="webhook-trials" aria-label="Five explicit resend observations">{result.manual.map((s, i) => <article key={s.slot} className={s.repeated ? 'observed' : 'pending'}><span className="eyebrow">RESEND {i + 1}</span><strong>{s.repeated ? <><Check size={16}/>Observed</> : 'Unobserved'}</strong><p>{s.accepted ? 'Request accepted · 202' : 'Request not qualified'}</p><span>{s.deliveries.length} verified arrival{s.deliveries.length === 1 ? '' : 's'}</span></article>)}</div>
    <div className="identity-footer"><p>{result.verifiedResends} / 5 separate resend deliveries observed at the saved snapshot. {result.naturalTransmissionReused ? 'The natural retry reused its transmission ID; intake records have their own identity. ' : ''}Approval events only. No captures, target fulfillment or ordering claim.</p><button className="text-link" onClick={() => openEvidence(proof.id)}>Inspect every arrival<ArrowUpRight size={14}/></button></div>
  </section>;
}
