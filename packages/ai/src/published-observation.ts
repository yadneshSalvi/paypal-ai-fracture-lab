/** Public, immutable observation history. No runtime or provider dependencies. */
export const BRAMBLE_ARCHIVE_SHA256 = 'd81039b1fd67eb93a5cce6c53e148075dc4140c53ba372adbfc4f4f1ef873a0a';
export type RecordedRevision = 'faulty' | 'hardened';
export type RecordedProjection = {
  phoneState: 'ready' | 'failed' | 'checking' | 'paid';
  applicationStatus: string; providerStatus: string;
  capturedMinor: number; refundedMinor: number; captureCount: number; fulfillmentCount: number; currency: 'USD';
};
export type RecordedEvent = {
  id: string; sequence: number; kind: string; lane: 'application' | 'customer' | 'provider' | 'lab';
  identity: 'absent' | 'stable' | 'not_applicable'; resourceId?: string | undefined; requestId?: string | undefined; projection: RecordedProjection;
};
export type RecordedCapture = {
  id: string; orderId: string; status: 'COMPLETED'; amountMinor: number; currency: 'USD'; observedAt: string; source: 'live_sandbox'; evidenceId: string;
};
export type RecordedRefund = Omit<RecordedCapture, 'orderId'> & { captureId: string };
export type RecordedResource = {
  kind: 'order' | 'capture' | 'refund'; id: string; status: string; money: { currency: 'USD'; minor: number } | null; parentId: string | null; observedAt: string;
};
export type RecordedRun = {
  id: string; revision: RecordedRevision; sourceHash: string; scenarioHash: string; businessIntentId: string; orderIds: string[];
  captures: RecordedCapture[]; refunds: RecordedRefund[]; events: RecordedEvent[]; independentResources: RecordedResource[];
};
export type PublishedObservation = {
  schemaVersion: 1; kind: 'browser-approved-live-bramble-qualification'; observedAt: string; source: 'live_sandbox'; faultSource: string;
  checks: Array<{ name: string; passed: boolean }>; passed: boolean;
  summary: { baseline: { grossMinor: number; refundMinor: number; fulfillments: number; verdict: 'fail' }; control: { grossMinor: number; fulfillments: number; verdict: 'pass' } };
  runs: RecordedRun[]; limitations: string[];
};
export type PublishedObservationResult = { status: 'ready'; record: PublishedObservation; sha256: string } | { status: 'unavailable'; reason: string };

export const recordedMoney = (minor: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(minor / 100);
export const recordedDate = (iso: string) => new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'medium', timeZone: 'UTC' }).format(new Date(iso)) + ' UTC';

export function eventTitle(event: RecordedEvent): string {
  const titles: Record<string, string> = {
    checkout_started: 'One purchase begins', order_payer_action_required: 'A provider order awaits approval', resource_read: 'A resource is read',
    buyer_approved: 'The buyer approves this order', capture_completed: event.projection.captureCount > 1 ? 'A second capture completes' : 'The first capture completes',
    response_dropped: 'The response is deliberately lost', unknown_outcome_presented_failed: 'The app calls uncertainty a failure', customer_retry: 'The customer chooses to try again',
    fulfilled: 'The app fulfills the purchase', live_compensation_approved: 'Separate compensation is approved', refund_completed: 'The duplicate capture is refunded',
    checkout_claimed: 'The original intent is claimed', checking_unknown: 'The app keeps the outcome open', recovery_read: 'Recovery confirms the original payment',
  };
  return titles[event.kind] ?? event.kind.replaceAll('_', ' ');
}

/** Project only observations at or before the cursor. Later GETs are intentionally separate. */
export function recordedFrame(run: RecordedRun, sequence: number) {
  if (!Number.isSafeInteger(sequence) || sequence < 1 || sequence > run.events.length) throw new Error('Choose a recorded observation.');
  const event = run.events[sequence - 1];
  if (!event || event.sequence !== sequence) throw new Error('The observation sequence is incomplete.');
  const history = run.events.slice(0, sequence);
  const captureIds = new Set(history.filter(item => item.kind === 'capture_completed').map(item => item.resourceId));
  const refundIds = new Set(history.filter(item => item.kind === 'refund_completed').map(item => item.resourceId));
  const captures = run.captures.filter(item => captureIds.has(item.id));
  const refunds = run.refunds.filter(item => refundIds.has(item.id));
  const complete = sequence === run.events.length;
  return {
    event, history, captures, refunds, complete,
    independentResources: complete ? run.independentResources : [],
    verdict: event.projection.captureCount > 1 ? 'fail' as const : complete && run.revision === 'hardened' ? 'pass' as const : 'pending' as const,
    divergent: event.projection.captureCount > 0 && ['failed', 'checking', 'ready'].includes(event.projection.phoneState),
  };
}

export function defaultSequence(run: RecordedRun) {
  return run.events.find(event => event.kind === (run.revision === 'faulty' ? 'unknown_outcome_presented_failed' : 'checking_unknown'))?.sequence ?? 1;
}

export function parseObservationLocation(hash: string, runs: RecordedRun[]) {
  const match = /^#(faulty|hardened):(\d{1,3})$/.exec(hash);
  const run = runs.find(item => item.revision === match?.[1]) ?? runs[0];
  if (!run || !run.events.length) return null;
  const sequence = match ? Number(match[2]) : defaultSequence(run);
  return { revision: run.revision, sequence: sequence >= 1 && sequence <= run.events.length ? sequence : defaultSequence(run) };
}
