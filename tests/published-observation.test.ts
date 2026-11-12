import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { BRAMBLE_ARCHIVE_SHA256, parseObservationLocation, recordedFrame } from '../packages/ai/src/published-observation';
import { validatePublishedObservation } from '../packages/ai/src/published-observation-validation';
import { decodePublishedObservation } from '../apps/web/lib/published-observation';
const bytes = await readFile(new URL('../docs/evidence/live-bramble-qualification.json', import.meta.url));
const original = JSON.parse(bytes.toString());
const record = validatePublishedObservation(original);

test('only the exact public original archive can cross the page boundary', () => {
  assert.equal(createHash('sha256').update(bytes).digest('hex'), BRAMBLE_ARCHIVE_SHA256);
  assert.equal(decodePublishedObservation(bytes).record.runs.reduce((sum, run) => sum + run.events.length, 0), 35);
  assert.throws(() => decodePublishedObservation(Buffer.concat([bytes, Buffer.from('\n')])), /fingerprint/);
  const changed = structuredClone(original); changed.runs[0].events[7].projection.phoneState = 'paid';
  assert.throws(() => decodePublishedObservation(Buffer.from(JSON.stringify(changed))), /fingerprint/);
  assert.deepEqual(JSON.parse(bytes.toString()), original, 'Projection never changes original bytes.');
});

test('every prefix shows only captured/refunded receipts already observed and withholds late provider reads', () => {
  for (const run of record.runs) for (const event of run.events) {
    const frame = recordedFrame(run, event.sequence);
    assert.equal(frame.history.length, event.sequence);
    assert.equal(frame.captures.length, event.projection.captureCount);
    assert.equal(frame.captures.reduce((sum, row) => sum + row.amountMinor, 0), event.projection.capturedMinor);
    assert.equal(frame.refunds.reduce((sum, row) => sum + row.amountMinor, 0), event.projection.refundedMinor);
    if (!frame.complete) assert.deepEqual(frame.independentResources, []);
    assert.ok(frame.history.every(item => item.sequence <= event.sequence));
    assert.ok(frame.captures.every(item => frame.history.some(e => e.kind === 'capture_completed' && e.resourceId === item.id)));
    assert.ok(frame.refunds.every(item => frame.history.some(e => e.kind === 'refund_completed' && e.resourceId === item.id)));
  }
  const early = recordedFrame(record.runs[0], 8);
  assert.equal(early.event.projection.phoneState, 'failed');
  assert.equal(early.event.projection.providerStatus, 'CAPTURE COMPLETED');
  assert.equal(early.captures.length, 1);
  assert.equal(JSON.stringify(early).includes('6PL28570JN503694M'), false, 'The later second capture must not leak into the early inspector.');
  assert.equal(JSON.stringify(early).includes('2TY77369FW268003W'), false, 'The later refund must not leak into the early inspector.');
});

test('compensation preserves gross charges, the original failure, exact linkage and both dated provider states', () => {
  const before = recordedFrame(record.runs[0], 15), after = recordedFrame(record.runs[0], 20);
  assert.equal(before.verdict, 'fail'); assert.equal(after.verdict, 'fail');
  assert.equal(after.event.projection.capturedMinor, 2400); assert.equal(after.event.projection.refundedMinor, 1200);
  assert.equal(after.refunds[0].captureId, after.captures[1].id);
  assert.equal(after.captures[1].status, 'COMPLETED');
  assert.ok(after.independentResources.some(row => row.id === after.captures[1].id && row.status === 'REFUNDED'));
  assert.equal(recordedFrame(record.runs[1], 10).verdict, 'pending');
  assert.equal(recordedFrame(record.runs[1], 15).verdict, 'pass');
  assert.notEqual(record.runs[0].sourceHash, record.runs[1].sourceHash);
});

test('missing, repeated or unsupported observations and inconsistent money fail closed', () => {
  const mutations = [
    (r: typeof original) => { r.runs[0].events.splice(2, 1); },
    (r: typeof original) => { r.runs[0].events[3].id = r.runs[0].events[2].id; },
    (r: typeof original) => { r.runs[0].events[7].projection.capturedMinor = 0; },
    (r: typeof original) => { r.runs[0].refunds[0].captureId = 'unrelated-capture'; },
    (r: typeof original) => { r.runs[1].events = []; },
    (r: typeof original) => { r.runs[0].events[0].projection.phoneState = 'unsupported'; },
    (r: typeof original) => { r.runs[0].captures[0].orderId = 'unrelated-order'; },
  ];
  for (const change of mutations) { const copy = structuredClone(original); change(copy); assert.throws(() => validatePublishedObservation(copy)); }
  for (const point of [0, -1, 21, NaN, 1.5]) assert.throws(() => recordedFrame(record.runs[0], point));
});

test('share fragments retain exact valid points and reject external or malformed state', () => {
  assert.deepEqual(parseObservationLocation('#faulty:20', record.runs), { revision: 'faulty', sequence: 20 });
  assert.deepEqual(parseObservationLocation('#hardened:15', record.runs), { revision: 'hardened', sequence: 15 });
  assert.deepEqual(parseObservationLocation('#hardened:999', record.runs), { revision: 'hardened', sequence: 10 });
  assert.deepEqual(parseObservationLocation('#https://other.test?secret=x', record.runs), { revision: 'faulty', sequence: 8 });
  assert.equal(parseObservationLocation('#faulty:1', []), null);
});
