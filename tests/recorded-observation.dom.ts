import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire, register } from 'node:module';
import { act, createElement, StrictMode } from 'react';
register('./helpers/css-module-loader.mjs', import.meta.url);
register('./helpers/navigation-loader.mjs', import.meta.url);
const { JSDOM } = createRequire(new URL('./component-runtime/package.json', import.meta.url))('jsdom') as { JSDOM: new (html: string, options: { url: string; pretendToBeVisual: boolean }) => { window: Window & typeof globalThis } };
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/observations', pretendToBeVisual: true });
for (const name of ['window', 'self', 'document', 'navigator', 'HTMLElement', 'HTMLDialogElement', 'HTMLInputElement', 'Event', 'MouseEvent', 'KeyboardEvent', 'Node'] as const) Object.defineProperty(globalThis, name, { value: dom.window[name], configurable: true, writable: true });
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true, __fractureTestPathname: '/observations' });
dom.window.HTMLDialogElement.prototype.showModal = function () { this.open = true; this.querySelector<HTMLElement>('button')?.focus(); };
dom.window.HTMLDialogElement.prototype.close = function () { if (!this.open) return; this.open = false; queueMicrotask(() => this.dispatchEvent(new dom.window.Event('close'))); };
const { createRoot } = await import('react-dom/client');
const { WorkspaceProvider, useWorkspace } = await import('../apps/web/components/workspace-provider');
const { AppShell } = await import('../apps/web/components/app-shell');
const { RecordedObservations, RecordedObservationLoading } = await import('../apps/web/components/recorded-observations');
const { decodePublishedObservation } = await import('../apps/web/lib/published-observation');
const result = decodePublishedObservation(await readFile(new URL('../docs/evidence/live-bramble-qualification.json', import.meta.url)));
const button = (text: string) => [...document.querySelectorAll<HTMLButtonElement>('button')].find(node => node.textContent?.includes(text))!;
const click = async (text: string) => { assert.ok(button(text), `Missing ${text}`); await act(async () => button(text).click()); };
async function mount(t: TestContext, hash = '') {
  document.body.innerHTML = '<div id="root"></div>'; window.history.replaceState(null, '', `/observations${hash}`);
  Object.assign(globalThis, { __fractureTestPathname: '/observations' });
  const root = createRoot(document.getElementById('root')!); let unmounted = false;
  t.after(async () => { if (!unmounted) await act(async () => root.unmount()); });
  await act(async () => root.render(createElement(StrictMode, null, createElement(WorkspaceProvider, null, createElement(AppShell, null, createElement(RecordedObservations, { result }))))));
  return { root, close: async () => { unmounted = true; await act(async () => root.unmount()); } };
}

test('anonymous archive entry, strict mounting, local selection and recovery perform zero workspace requests', async t => {
  const requests: string[] = []; t.mock.method(globalThis, 'fetch', async (url: unknown) => { requests.push(String(url)); throw new Error('No runtime is allowed on this public archive.'); });
  await mount(t);
  assert.match(document.body.textContent!, /Recorded PayPal Sandbox/); assert.match(document.body.textContent!, /11 NOV 2026/);
  assert.equal(document.querySelector('.project-header'), null);
  assert.equal(document.querySelector('.project-tabs'), null);
  assert.match(document.getElementById('observation-state-title')!.textContent!, /uncertainty a failure/);
  await click('Purchase outcome'); await click('Separate refund');
  assert.deepEqual(requests, []);
  const archiveLink = document.querySelector<HTMLAnchorElement>('a[download]')!;
  assert.equal(archiveLink.getAttribute('href'), '/observations/archive');
  assert.match(archiveLink.textContent!, /All 35 observations/);
});

test('the mounted inspector withholds future receipts and Escape returns to its exact opener', async t => {
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('No network'); });
  await mount(t, '#faulty:8');
  const trigger = button('Inspect this point'); trigger.focus(); await act(async () => trigger.click());
  let dialog = document.querySelector<HTMLDialogElement>('dialog[aria-labelledby="recorded-proof-title"]')!;
  assert.equal(dialog.open, true); assert.match(dialog.textContent!, /5X59700848833580D/);
  assert.doesNotMatch(dialog.textContent!, /6PL28570JN503694M|2TY77369FW268003W/);
  assert.match(dialog.textContent!, /Final independent reads are withheld/);
  await act(async () => dialog.dispatchEvent(new dom.window.Event('cancel', { cancelable: true })));
  assert.equal(dialog.open, false); assert.equal(document.activeElement, trigger);
  await click('Purchase outcome'); assert.equal(document.activeElement?.id, 'observation-state-title');
  assert.match(document.querySelector('[data-verdict]')!.textContent!, /Failed/);
  await click('Separate refund'); await click('Inspect this point');
  dialog = document.querySelector<HTMLDialogElement>('dialog[aria-labelledby="recorded-proof-title"]')!;
  assert.match(dialog.textContent!, /6PL28570JN503694M/); assert.match(dialog.textContent!, /2TY77369FW268003W/);
  assert.match(dialog.textContent!, /capture · REFUNDED/);
  assert.match(document.querySelector('[data-verdict]')!.textContent!, /Failed/);
  assert.equal(document.querySelector('[aria-label="Inspect 2 recorded captures, $24.00 gross"]') !== null, true);
});

test('keyboard revision selection, retained hash, final reference verdict and rewind all use original state', async t => {
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('No network'); });
  const mounted = await mount(t);
  const faulty = document.getElementById('revision-faulty')!; faulty.focus();
  await act(async () => faulty.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })));
  assert.equal(document.activeElement?.id, 'revision-hardened');
  assert.equal(window.location.hash, '#hardened:10');
  assert.match(document.getElementById('observation-state-title')!.textContent!, /keeps the outcome open/);
  assert.match(document.body.textContent!, /Historical reference, recorded before the later AI-generated repairs/);
  await click('Recovery confirmed'); assert.match(document.querySelector('[data-verdict]')!.textContent!, /Passed/);
  assert.equal(window.location.hash, '#hardened:15');
  await mounted.close();
  await mount(t, '#hardened:15');
  assert.match(document.querySelector('[data-verdict]')!.textContent!, /Passed/);
  await click('Previous'); assert.match(document.querySelector('[data-verdict]')!.textContent!, /not yet complete/);
  const range = document.getElementById('observation-cursor') as HTMLInputElement;
  range.focus();
  await act(async () => { Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value')!.set!.call(range, '1'); range.dispatchEvent(new dom.window.Event('input', { bubbles: true })); range.dispatchEvent(new dom.window.Event('change', { bubbles: true })); });
  assert.equal(document.activeElement, range, 'Range adjustments keep focus for continuing keyboard movement.');
  assert.equal(window.location.hash, '#hardened:1');
  assert.match(document.getElementById('observation-state-title')!.textContent!, /One purchase begins/);
});

test('unavailable and loading states stay explicit, and public refresh cannot admit a session', async t => {
  const requests: string[] = []; t.mock.method(globalThis, 'fetch', async (url: unknown) => { requests.push(String(url)); throw new Error('No network'); });
  const mounted = await mount(t);
  function PublicRefresh() { const workspace = useWorkspace(); return createElement('button', { onClick: () => void workspace.refresh() }, 'Refresh context probe'); }
  await act(async () => mounted.root.render(createElement(WorkspaceProvider, null, createElement(PublicRefresh), createElement(RecordedObservations, { result: { status: 'unavailable', reason: 'The original observation archive could not be verified.' } }))));
  await click('Refresh context probe'); assert.deepEqual(requests, []);
  assert.match(document.body.textContent!, /original history is unavailable/);
  assert.equal(document.querySelector<HTMLAnchorElement>('a')!.getAttribute('href'), '/observations');
  assert.doesNotMatch(document.body.textContent!, /\$24/);
  await act(async () => mounted.root.render(createElement(WorkspaceProvider, null, createElement(RecordedObservationLoading))));
  assert.equal(document.querySelector('[aria-busy="true"]') !== null, true); assert.deepEqual(requests, []);
});
