'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowDownToLine, ArrowLeft, ArrowRight, BookOpen, Check, CheckCircle2, ChevronRight, CircleHelp, Clock3, Code2, CreditCard, FileCheck2, History, PanelRightClose, ShieldCheck, Smartphone, Split, X } from 'lucide-react';
import { defaultSequence, eventTitle, parseObservationLocation, recordedDate, recordedFrame, recordedMoney, type PublishedObservation, type PublishedObservationResult, type RecordedEvent, type RecordedRevision } from '../../../packages/ai/src/published-observation';
import styles from './recorded-observations.module.css';

export function RecordedObservations({ result }: { result: PublishedObservationResult }) {
  if (result.status === 'unavailable' || !result.record.runs.length) return <section className={styles.empty} aria-labelledby="archive-unavailable"><History size={30}/><p className={styles.eyebrow}>RECORDED OBSERVATIONS</p><h1 id="archive-unavailable">The original history is unavailable.</h1><p>{result.status === 'unavailable' ? result.reason : 'There are no verified observations in this archive.'}</p><a className={styles.primaryButton} href="/observations">Read the archive again</a><small>This page opens a public record. It does not start a payment or a lab session.</small></section>;
  return <ObservationExplorer key={result.sha256} record={result.record} sha256={result.sha256}/>;
}

export function RecordedObservationLoading() {
  return <section className={styles.loading} aria-busy="true" aria-label="Loading recorded observations"><p className={styles.eyebrow}>READING THE ORIGINAL ARCHIVE</p><div/><div/><div/><p>Verifying the saved observations and their fingerprint…</p></section>;
}

function ObservationExplorer({ record, sha256 }: { record: PublishedObservation; sha256: string }) {
  const [selection, setSelection] = useState(() => ({ revision: record.runs[0].revision, sequence: defaultSequence(record.runs[0]) }));
  const [inspecting, setInspecting] = useState(false);
  const [showEarlier, setShowEarlier] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const focusAfterSelection = useRef(false);
  const drawer = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const tabs = useRef<Partial<Record<RecordedRevision, HTMLButtonElement | null>>>({});
  const run = record.runs.find(item => item.revision === selection.revision) ?? record.runs[0];
  const frame = recordedFrame(run, selection.sequence);
  const projection = frame.event.projection;
  const history = showEarlier ? frame.history : frame.history.slice(-6);
  const revisionLabel = run.revision === 'faulty' ? 'Faulty checkout' : 'Hardened reference';

  useEffect(() => {
    const read = () => { const saved = parseObservationLocation(window.location.hash, record.runs); if (saved) setSelection(saved); };
    read(); window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
  }, [record.runs]);
  useEffect(() => {
    if (focusAfterSelection.current) { heading.current?.focus({ preventScroll: true }); focusAfterSelection.current = false; }
  }, [selection]);
  useEffect(() => {
    if (inspecting && !drawer.current?.open) drawer.current?.showModal();
    else if (!inspecting && drawer.current?.open) drawer.current.close();
  }, [inspecting]);

  function choose(revision: RecordedRevision, sequence: number, focus = true) {
    focusAfterSelection.current = focus;
    setSelection({ revision, sequence }); setShowEarlier(false);
    window.history.replaceState(null, '', `#${revision}:${sequence}`);
  }
  function changeRevision(revision: RecordedRevision, focus = true) {
    const next = record.runs.find(item => item.revision === revision)!;
    choose(revision, defaultSequence(next), focus);
  }
  function inspect(trigger: HTMLElement) { opener.current = trigger; setInspecting(true); }
  function closeInspector() {
    setInspecting(false);
    if (drawer.current?.open) drawer.current.close();
    if (opener.current?.isConnected) opener.current.focus({ preventScroll: true });
  }
  const stops = [
    { key: 'response_dropped', label: 'Lost response' },
    { key: run.revision === 'faulty' ? 'unknown_outcome_presented_failed' : 'checking_unknown', label: 'What the app knew' },
    { key: 'fulfilled', label: 'Purchase outcome' },
    { key: run.revision === 'faulty' ? 'refund_completed' : 'recovery_read', label: run.revision === 'faulty' ? 'Separate refund' : 'Recovery confirmed' },
  ].flatMap(stop => { const event = run.events.find(item => item.kind === stop.key); return event ? [{ ...stop, sequence: event.sequence }] : []; });

  return <div className={styles.archive}>
    <header className={styles.intro}>
      <div><p className={styles.eyebrow}><span className={styles.recordDot}/> RECORDED PAYPAL SANDBOX <span>11 NOV 2026</span></p><h1>One payment.<br/><span>Different stories.</span></h1><p className={styles.lede}>Rewind the moment a successful charge became a failed checkout. See only what was recorded at the point you choose.</p></div>
      <div className={styles.archiveStamp}><History size={21}/><strong>Original observations</strong><span>1 approved comparison · 2 revisions</span><small>Controlled response loss<br/>Fictional merchant and buyer</small></div>
    </header>

    <div className={styles.revisionBar}>
      <div role="tablist" aria-label="Recorded checkout revision" className={styles.revisionTabs}>{record.runs.map(item => <button key={item.revision} ref={node => { tabs.current[item.revision] = node; }} id={`revision-${item.revision}`} role="tab" type="button" aria-selected={item.revision === run.revision} aria-controls="recorded-purchase" tabIndex={item.revision === run.revision ? 0 : -1} onClick={() => changeRevision(item.revision)} onKeyDown={event => {
        if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) { event.preventDefault(); const target = event.key === 'Home' ? 'faulty' : event.key === 'End' ? 'hardened' : item.revision === 'faulty' ? 'hardened' : 'faulty'; changeRevision(target, false); tabs.current[target]?.focus(); }
      }}>{item.revision === 'faulty' ? <Split size={16}/> : <ShieldCheck size={16}/>}<span>{item.revision === 'faulty' ? 'Faulty checkout' : 'Hardened reference'}</span></button>)}</div>
      <p>{run.revision === 'hardened' ? 'Historical reference, recorded before the later AI-generated repairs.' : 'Original faulty implementation. Every capture remains in its history.'}</p>
    </div>

    <section id="recorded-purchase" role="tabpanel" aria-labelledby={`revision-${run.revision}`} className={styles.purchase}>
      <div className={styles.moneyBand}>
        <button type="button" className={styles.moneyButton} onClick={event => inspect(event.currentTarget)} aria-label={`Inspect ${projection.captureCount} recorded captures, ${recordedMoney(projection.capturedMinor)} gross`}>
          <span className={styles.smallLabel}>GROSS CAPTURED AT THIS POINT <ChevronRight size={13}/></span><strong className={projection.captureCount > 1 ? styles.rose : styles.mint}>{recordedMoney(projection.capturedMinor)}<small>USD</small></strong><span>{projection.captureCount} {projection.captureCount === 1 ? 'completed capture' : 'completed captures'} · 1 purchase intent</span>
        </button>
        <div className={styles.refundTotal}><span className={styles.smallLabel}>SEPARATE REFUNDS</span><strong>{recordedMoney(projection.refundedMinor)}</strong><span>{projection.refundedMinor ? 'Original charges preserved' : 'None recorded yet'}</span></div>
        <div className={styles.invariant} data-verdict={frame.verdict}>{frame.verdict === 'fail' ? <X size={20}/> : frame.verdict === 'pass' ? <CheckCircle2 size={20}/> : <CircleHelp size={20}/>}<div><span>One purchase → one charge</span><strong>{frame.verdict === 'fail' ? 'Failed in this record' : frame.verdict === 'pass' ? 'Passed in this record' : 'Verdict not yet complete'}</strong><small>{frame.verdict === 'fail' ? 'A refund does not erase a duplicate.' : frame.verdict === 'pass' ? 'Bounded to this original run.' : 'Continue through the recorded observations.'}</small></div></div>
      </div>

      <div className={styles.workbench}>
        <div className={styles.customerView}>
          <div className={styles.laneEyebrow}><Smartphone size={14}/> MAYA · CUSTOMER</div>
          <div className={styles.phone} data-phone-state={projection.phoneState}>
            <div className={styles.phoneTop}><span>BRAMBLE BOOKS</span><BookOpen size={17}/></div>
            <div className={styles.book}><span>BRAMBLE<br/>FIELD NOTES</span><i/><small>A DIGITAL EDITION</small></div>
            <p className={styles.bookTitle}>A little more wonder.</p><span className={styles.bookPrice}>Digital edition · $12.00</span>
            <div className={styles.phoneOutcome}>
              <span className={styles.phoneGlyph}>{projection.phoneState === 'failed' ? <X size={21}/> : projection.phoneState === 'paid' ? <Check size={21}/> : projection.phoneState === 'checking' ? <Clock3 size={21}/> : <CreditCard size={21}/>}</span>
              <strong>{projection.phoneState === 'failed' ? 'Payment failed' : projection.phoneState === 'checking' ? 'Checking your payment' : projection.phoneState === 'paid' ? 'You’re all set' : 'Ready to pay'}</strong>
              <p>{projection.phoneState === 'failed' ? 'The app offered another try.' : projection.phoneState === 'checking' ? 'The original payment is still being checked.' : projection.phoneState === 'paid' ? `${projection.fulfillmentCount} digital book fulfilled.` : 'The checkout has not confirmed payment.'}</p>
              {projection.phoneState === 'failed' ? <span className={styles.recordedRetry}>“Try again” was shown</span> : null}
            </div>
            <div className={styles.phoneFoot}>Recorded app state · lab rendering</div>
          </div>
          <p className={styles.phoneCaption}>This view follows the saved application projection. It is not a PayPal account screen.</p>
        </div>

        <div className={styles.knowledge}>
          <div className={styles.currentEvent}><div><span className={styles.smallLabel}>OBSERVATION {selection.sequence} OF {run.events.length}</span><h2 id="observation-state-title" ref={heading} tabIndex={-1}>{eventTitle(frame.event)}</h2></div><button type="button" className={styles.inspectButton} onClick={event => inspect(event.currentTarget)}><FileCheck2 size={16}/>Inspect this point<ChevronRight size={13}/></button></div>
          <div className={styles.lanes} data-divergent={frame.divergent}>
            <KnowledgeLane tone="customer" Icon={Smartphone} name="Customer sees" status={projection.phoneState === 'failed' ? 'Payment failed' : projection.phoneState === 'checking' ? 'Checking payment' : projection.phoneState === 'paid' ? 'Paid' : 'No payment confirmation'} detail="Saved phone state"/>
            <KnowledgeLane tone="application" Icon={Code2} name="Application records" status={projection.applicationStatus} detail={`${projection.fulfillmentCount} fulfillment${projection.fulfillmentCount === 1 ? '' : 's'} recorded`}/>
            <KnowledgeLane tone="provider" Icon={CreditCard} name="Provider projection" status={projection.providerStatus} detail={`${recordedMoney(projection.capturedMinor)} gross · ${projection.captureCount} capture${projection.captureCount === 1 ? '' : 's'}`}/>
          </div>
          <div className={styles.explanation} data-tone={projection.phoneState === 'failed' ? 'rose' : 'neutral'}><Split size={17}/><p>{explainEvent(frame.event)}</p></div>

          <div className={styles.cursor}>
            <div className={styles.cursorHeading}><label htmlFor="observation-cursor">Rewind what was known</label><span>Sequence, not elapsed time</span></div>
            <input id="observation-cursor" type="range" min={1} max={run.events.length} step={1} value={selection.sequence} aria-valuetext={`Observation ${selection.sequence} of ${run.events.length}: ${eventTitle(frame.event)}`} onChange={event => choose(run.revision, Number(event.target.value), false)}/>
            <div className={styles.cursorControls}><button type="button" disabled={selection.sequence === 1} onClick={() => choose(run.revision, selection.sequence - 1)}><ArrowLeft size={15}/>Previous</button><output htmlFor="observation-cursor">{String(selection.sequence).padStart(2, '0')} <span>/ {run.events.length}</span></output><button type="button" disabled={selection.sequence === run.events.length} onClick={() => choose(run.revision, selection.sequence + 1)}>Next<ArrowRight size={15}/></button></div>
          </div>
          <div className={styles.stops} aria-label="Jump to a recorded moment">{stops.map(stop => <button type="button" key={stop.key} aria-pressed={stop.sequence === selection.sequence} onClick={() => choose(run.revision, stop.sequence)}><span>{String(stop.sequence).padStart(2, '0')}</span>{stop.label}</button>)}</div>
        </div>
      </div>

      <div className={styles.historySection}>
        <div className={styles.historyHeading}><div><span className={styles.smallLabel}>KNOWN THROUGH THIS POINT</span><h3>The receipts arrive in order.</h3></div><span>{frame.history.length} visible observations · {run.events.length - frame.history.length} later observations hidden</span></div>
        {frame.history.length > 6 ? <button type="button" className={styles.textButton} onClick={() => setShowEarlier(value => !value)}>{showEarlier ? 'Show the most recent six' : `Show ${frame.history.length - 6} earlier observations`}</button> : null}
        <ol className={styles.historyList}>{history.map(event => <li key={event.id}><button type="button" aria-current={event.sequence === selection.sequence ? 'step' : undefined} aria-label={`Observation ${event.sequence}: ${eventTitle(event)}`} onClick={() => choose(run.revision, event.sequence)}><span className={styles.sequence}>{String(event.sequence).padStart(2, '0')}</span><span className={styles.eventLane} data-lane={event.lane}>{event.lane === 'lab' ? 'Controlled fault / lab' : event.lane}</span><strong>{eventTitle(event)}</strong><ChevronRight size={14}/></button></li>)}</ol>
        <p className={styles.historyNote}>{frame.complete ? 'The complete sequence is selected. Dated independent provider reads are now included in the inspector.' : 'Later captures, refunds and final independent provider reads stay outside this point’s inspector.'}</p>
      </div>
    </section>

    <div className={styles.provenanceRow}><div><ShieldCheck size={18}/><p><strong>A bounded original comparison.</strong> Actual PayPal Sandbox resources; response loss was introduced locally after capture. Each distinct order had a separate buyer approval. No real money or physical delivery.</p></div><a href="/observations/archive" className={styles.download} download><ArrowDownToLine size={15}/>Complete archive<span>All 35 observations</span></a></div>
    <details className={styles.archiveDetails}><summary>Source, scope and original limitations<ChevronRight size={15}/></summary><div><dl><div><dt>Archive observed</dt><dd>{recordedDate(record.observedAt)}</dd></div><div><dt>SHA-256 of original JSON</dt><dd className={styles.hash}>{sha256}</dd></div><div><dt>Selected original run</dt><dd className={styles.hash}>{run.id}</dd></div><div><dt>Original source revision</dt><dd className={styles.hash}>{run.sourceHash}</dd></div></dl><ul>{record.limitations.map(item => <li key={item}>{item}</li>)}</ul><p>The hardened reference belongs to this historical comparison. It is separate from subsequent AI-generated candidates and the sealed context study. Opening this archive neither renews its original authority nor executes a scenario.</p></div></details>
    <p className={styles.announcement} role="status" aria-live="polite">{revisionLabel}. Observation {selection.sequence} of {run.events.length}. {eventTitle(frame.event)}.</p>

    <dialog className={styles.drawer} ref={drawer} onCancel={event => { event.preventDefault(); closeInspector(); }} onClose={() => { setInspecting(false); if (opener.current?.isConnected) opener.current.focus({ preventScroll: true }); }} onClick={event => { if (event.target === event.currentTarget) closeInspector(); }} aria-labelledby="recorded-proof-title" aria-describedby="recorded-proof-scope">
      <div className={styles.drawerInner}><header><div><p className={styles.eyebrow}>RECORDED PAYPAL SANDBOX</p><h2 id="recorded-proof-title">Evidence at observation {selection.sequence}</h2></div><button type="button" className={styles.closeButton} aria-label="Close observation evidence" onClick={closeInspector}><PanelRightClose size={21}/></button></header><p id="recorded-proof-scope">Only receipts already present at this point. Original event order has no per-event timestamps; receipt observation times below are retained exactly.</p>
        <div className={styles.inspectorEvent}><span>{frame.event.lane} · {frame.event.kind}</span><h3>{eventTitle(frame.event)}</h3><code>{frame.event.id}</code></div>
        <h3>Capture receipts at this point</h3>{frame.captures.length ? frame.captures.map(capture => <article className={styles.receipt} key={capture.id}><div><strong>{recordedMoney(capture.amountMinor)}</strong><span>COMPLETED when captured</span></div><dl><div><dt>Capture</dt><dd>{capture.id}</dd></div><div><dt>Original order</dt><dd>{capture.orderId}</dd></div><div><dt>Observed</dt><dd>{recordedDate(capture.observedAt)}</dd></div><div><dt>Evidence ID</dt><dd>{capture.evidenceId}</dd></div></dl></article>) : <p className={styles.emptyReceipt}>No completed capture is recorded yet.</p>}
        <h3>Separate refund receipts</h3>{frame.refunds.length ? frame.refunds.map(refund => <article className={styles.receipt} key={refund.id}><div><strong>{recordedMoney(refund.amountMinor)}</strong><span>COMPLETED refund</span></div><dl><div><dt>Refund</dt><dd>{refund.id}</dd></div><div><dt>Exact capture</dt><dd>{refund.captureId}</dd></div><div><dt>Observed</dt><dd>{recordedDate(refund.observedAt)}</dd></div><div><dt>Evidence ID</dt><dd>{refund.evidenceId}</dd></div></dl></article>) : <p className={styles.emptyReceipt}>No refund is recorded at this point.</p>}
        {frame.complete ? <section className={styles.independent}><h3>Later independent provider reads</h3><p>These final reads were observed after the sequence. A refunded capture’s later status does not replace its original completed-capture receipt.</p>{frame.independentResources.map((resource, index) => <div className={styles.independentRow} key={`${resource.id}-${index}`}><span>{resource.kind} · {resource.status}</span><code>{resource.id}</code><small>{recordedDate(resource.observedAt)}</small></div>)}</section> : <p className={styles.futureNote}><Clock3 size={16}/>Final independent reads are withheld here. Select the final observation to inspect them.</p>}
        <details className={styles.raw}><summary>Original event and source identities</summary><dl><div><dt>Run</dt><dd>{run.id}</dd></div><div><dt>Purchase intent</dt><dd>{run.businessIntentId}</dd></div><div><dt>Source SHA-256</dt><dd>{run.sourceHash}</dd></div><div><dt>Scenario SHA-256</dt><dd>{run.scenarioHash}</dd></div></dl><pre>{JSON.stringify(frame.event, null, 2)}</pre></details>
      </div>
    </dialog>
  </div>;
}

function KnowledgeLane({ tone, Icon, name, status, detail }: { tone: string; Icon: typeof Smartphone; name: string; status: string; detail: string }) {
  return <div className={styles.lane} data-tone={tone}><span className={styles.laneIcon}><Icon size={17}/></span><div><span>{name}</span><strong>{status}</strong><small>{detail}</small></div><span className={styles.laneEnd}/></div>;
}

function explainEvent(event: RecordedEvent) {
  const p = event.projection;
  if (event.kind === 'response_dropped') return 'The lab retained a completed upstream capture, then withheld its response. The failure was introduced in the response path.';
  if (p.phoneState === 'failed') return 'The application says “failed,” while its recorded provider projection contains a completed capture. A missing answer is not evidence of a failed payment.';
  if (event.kind === 'refund_completed') return 'A separately approved refund compensates the exact duplicate capture. The two original charges and the failed invariant remain in history.';
  if (p.captureCount > 1) return 'Two distinct completed captures now belong to one purchase intent. Both followed separate buyer approvals; gross captures remain $24.00.';
  if (p.phoneState === 'checking') return 'The historical reference keeps the outcome open. It checks the original payment instead of treating uncertainty as permission for another purchase.';
  if (p.phoneState === 'paid') return 'The saved application projection records fulfillment. Inspect the original capture and the later independent read separately.';
  if (event.kind === 'buyer_approved') return 'The record contains a legitimate buyer approval for this distinct order. An order or approval by itself is not a completed charge.';
  if (p.captureCount) return 'The provider projection records a completed capture. The application has not yet confirmed payment to the customer at this point.';
  return 'Follow the original sequence. Order creation and buyer approval stay separate from capture and fulfillment.';
}
