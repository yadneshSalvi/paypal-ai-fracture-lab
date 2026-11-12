"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Check, CircleDashed, Download, Fingerprint, LoaderCircle, RefreshCw, ShieldCheck, Sparkles, Square, Terminal } from "lucide-react";
import type { ToolkitInvestigation } from "../../../packages/ai/src/investigations";
import { isInvestigation, isInvestigationView, type InvestigationView } from "../../../packages/ai/src/investigation-view";
import styles from "./toolkit-investigations.module.css";

type Pending = { schemaVersion: 1; sessionId: string; requestId: string; runId: string };
type CommandReply = { sessionId: string; review: ToolkitInvestigation; dispatch: string };
const storageKey = (sessionId: string) => `fracture:toolkit-intent:v1:${sessionId}`;
const active = (review: ToolkitInvestigation) => ["queued", "running", "waiting"].includes(review.status);
const stateLabel = { queued: "Saved in queue", running: "Original work running", waiting: "Continuation stopped", completed: "Conclusion saved", failed: "Failure retained", cancelled: "Stopped" };
const phases = [
  { id: "selection", name: "Model selects", detail: "Gemini chooses the original order.", icon: Sparkles },
  { id: "read", name: "Toolkit observes", detail: "Installed get_order reads Sample state.", icon: Terminal },
  { id: "conclusion", name: "Model concludes", detail: "The saved interaction receives the actual receipt.", icon: ShieldCheck },
] as const;
const failureCopy = (code: string | null) => code === "MODEL_OBSERVATION_CONFLICT" ? "The model's claimed order status did not match the actual Toolkit observation. That conclusion was rejected." : ["MODEL_DISPATCH_UNKNOWN", "MODEL_TRANSPORT_UNKNOWN", "MODEL_TRANSPORT_FAILURE"].includes(code ?? "") ? "The original provider submission has an unresolved outcome. No replacement request has been sent." : code === "MODEL_CONFIGURATION_CHANGED" ? "The configured model changed after this investigation was saved. No substitute was dispatched." : "This original attempt did not produce an accepted conclusion. Earlier observations remain attached.";

function readPending(sessionId: string): Pending | null {
  try {
    const raw = localStorage.getItem(storageKey(sessionId));
    if (!raw) return null;
    const value = JSON.parse(raw) as Pending;
    return value.schemaVersion === 1 && value.sessionId === sessionId && typeof value.requestId === "string" && typeof value.runId === "string" ? value : null;
  } catch { return null; }
}

export function ToolkitInvestigationsPanel({ sessionId, onEvidence, onReceiptChange }: { sessionId: string; onEvidence: (id: string) => void; onReceiptChange: () => void }) {
  const [view, setView] = useState<InvestigationView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [runId, setRunId] = useState("");
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [focusVersion, setFocusVersion] = useState(0);
  const actor = useRef(sessionId); actor.current = sessionId;
  const mounted = useRef(true);
  const receiptChange = useRef(onReceiptChange); receiptChange.current = onReceiptChange;
  const reading = useRef<AbortController | null>(null);
  const command = useRef<{ actor: string; id: string } | null>(null);
  const pendingRef = useRef<Pending | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const fingerprint = useRef("");
  const selected = view?.reviews.find(item => item.id === selectedId) ?? view?.reviews[0] ?? null;
  const witness = view?.witnesses.find(item => item.id === runId);

  const forgetPending = useCallback((owner: string) => {
    try { localStorage.removeItem(storageKey(owner)); } catch { /* Server records remain authoritative. */ }
    if (actor.current === owner) { pendingRef.current = null; setPending(null); }
  }, []);
  const read = useCallback(async () => {
    if (!mounted.current || reading.current || command.current?.actor === actor.current) return;
    const owner = actor.current, controller = new AbortController(); reading.current = controller;
    const timeout = setTimeout(() => controller.abort(), 20_000);
    setLoading(true);
    try {
      const pendingId = pendingRef.current?.requestId;
      const response = await fetch(`/api/model-investigations${pendingId ? `?requestId=${encodeURIComponent(pendingId)}` : ""}`, { credentials: "same-origin", cache: "no-store", signal: controller.signal });
      const result = await response.json() as { data?: InvestigationView; error?: { message?: string } };
      const data = result.data;
      if (!response.ok || !isInvestigationView(data, owner)) throw new Error(result.error?.message ?? "The saved investigations could not be read.");
      if (actor.current !== owner || controller.signal.aborted) return;
      const retained = pendingRef.current && [data.recovered, ...data.reviews].find(item => item?.actionId === pendingRef.current?.requestId && item?.runId === pendingRef.current?.runId);
      const reviews = retained && !data.reviews.some(item => item.id === retained.id) ? [retained, ...data.reviews] : data.reviews;
      setView({ ...data, reviews }); setError(null);
      setRunId(previous => data.witnesses.some(item => item.id === previous) ? previous : data.witnesses[0]?.id ?? "");
      setSelectedId(previous => reviews.some(item => item.id === previous) ? previous : reviews[0]?.id ?? null);
      if (retained) { forgetPending(owner); setSelectedId(retained.id); setNotice("The original investigation was found. Its saved work is shown below."); setFocusVersion(value => value + 1); }
      const next = reviews.map(item => `${item.id}:${item.status}:${item.phase}:${item.availableReceiptIds.join(",")}`).join("|");
      if (next !== fingerprint.current) { fingerprint.current = next; receiptChange.current(); }
    } catch (failure) {
      if (actor.current === owner && reading.current === controller) setError(controller.signal.aborted ? "The read timed out. Saved work is retained; read it again when the service responds." : failure instanceof Error ? failure.message : "The saved investigations could not be read.");
    } finally {
      clearTimeout(timeout);
      if (reading.current === controller) { reading.current = null; if (actor.current === owner) setLoading(false); }
    }
  }, [forgetPending]);

  useEffect(() => {
    mounted.current = true;
    reading.current?.abort(); reading.current = null; command.current = null;
    setView(null); setSelectedId(null); setError(null); setNotice(null); setBusy(null); fingerprint.current = "";
    const saved = readPending(sessionId); pendingRef.current = saved; setPending(saved);
    void read();
    return () => { mounted.current = false; reading.current?.abort(); reading.current = null; };
  }, [sessionId, read]);
  const polling = Boolean(view?.reviews.some(item => item.status === "queued" || item.status === "running"));
  useEffect(() => {
    if (!polling) return;
    const tick = () => { if (document.visibilityState !== "hidden") void read(); };
    const timer = setInterval(tick, 5000); document.addEventListener("visibilitychange", tick);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", tick); };
  }, [polling, read]);
  useEffect(() => { if (focusVersion) heading.current?.focus(); }, [focusVersion]);

  const send = async (kind: "create" | "resume" | "cancel", original?: Pending) => {
    const owner = sessionId;
    if (command.current?.actor === owner || kind !== "create" && !selected) return;
    if (kind === "create" && !original && (pendingRef.current || !witness || !view?.configured)) return;
    const requestId = original?.requestId ?? crypto.randomUUID();
    const intent: Pending | null = kind === "create" ? original ?? { schemaVersion: 1, sessionId: owner, requestId, runId } : null;
    if (intent) {
      try { localStorage.setItem(storageKey(owner), JSON.stringify(intent)); }
      catch { setError("The browser could not retain this request identity. Enable local storage before submitting; no model request was started."); return; }
      pendingRef.current = intent; setPending(intent);
    }
    command.current = { actor: owner, id: requestId }; setBusy(kind); setError(null); setNotice(null);
    reading.current?.abort(); reading.current = null; setLoading(false);
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 35_000);
    try {
      const response = await fetch(kind === "create" ? "/api/model-investigations" : `/api/model-investigations/${selected!.id}`, { method: "POST", credentials: "same-origin", cache: "no-store", signal: controller.signal, headers: { "content-type": "application/json" }, body: JSON.stringify(intent ? { runId: intent.runId, requestId } : { action: kind, requestId }) });
      const result = await response.json() as { data?: CommandReply; error?: { code?: string; message?: string } };
      if (!response.ok || !result.data || result.data.sessionId !== owner || !isInvestigation(result.data.review)) {
        if (intent && ["INVALID_REQUEST", "SESSION_REQUIRED", "SESSION_EXPIRED", "ACTION_IN_PROGRESS", "TOOLKIT_WITNESS_REQUIRED", "TOOLKIT_RESOURCE_MISSING", "MODEL_CONFIGURATION_REQUIRED", "RATE_LIMITED"].includes(result.error?.code ?? "")) forgetPending(owner);
        throw new Error(result.error?.message ?? "The submission acknowledgement was not received. Read the saved work before trying again.");
      }
      if (!mounted.current || actor.current !== owner) return;
      const review = result.data.review;
      if (intent && (review.actionId !== intent.requestId || review.runId !== intent.runId)) throw new Error("The reply did not match this original request. Read the saved work to reconcile it.");
      forgetPending(owner);
      setView(previous => previous ? { ...previous, reviews: [review, ...previous.reviews.filter(item => item.id !== review.id)] } : previous);
      setSelectedId(review.id); setFocusVersion(value => value + 1);
      setNotice(review.status === "cancelled" ? "Investigation stopped. Its earlier observations remain attached." : kind === "create" ? "Investigation saved. Inspect its original receipts below." : review.status === "failed" ? "The original failure is retained. No replacement request was started." : review.status === "completed" ? "The completed conclusion is retained with its original receipts." : "Continuation acknowledged. The same saved phases and request identities are retained.");
      receiptChange.current();
    } catch (failure) {
      if (mounted.current && actor.current === owner) setError(failure instanceof Error ? failure.message : "The command could not be confirmed. Read its saved state before continuing.");
    } finally {
      clearTimeout(timeout);
      if (command.current?.id === requestId) { command.current = null; if (mounted.current && actor.current === owner) { setBusy(null); void read(); } }
    }
  };

  const download = async (format: "json" | "html") => {
    if (!selected || command.current?.actor === sessionId) return;
    const owner = sessionId, id = selected.id; command.current = { actor: owner, id: `export:${format}` }; setBusy(`export:${format}`);
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 20_000);
    try {
      const response = await fetch(`/api/model-investigations/${id}/report?format=${format}`, { credentials: "same-origin", cache: "no-store", signal: controller.signal });
      if (!response.ok) throw new Error("The report could not be downloaded. The saved investigation is retained.");
      const blob = await response.blob(); if (!mounted.current || actor.current !== owner) return;
      const url = URL.createObjectURL(blob), anchor = document.createElement("a");
      anchor.href = url; anchor.download = `fracture-investigation-${id}.${format}`; document.body.append(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
      setNotice("The scoped report was prepared with public receipts and provenance."); setError(null);
    } catch (failure) { if (mounted.current && actor.current === owner) setError(failure instanceof Error ? failure.message : "The report could not be downloaded."); }
    finally { clearTimeout(timeout); if (actor.current === owner) { command.current = null; if (mounted.current) setBusy(null); } }
  };

  return <section className={styles.panel} id="toolkit-investigations" aria-labelledby="toolkit-heading">
    <header className={styles.header}><div><span className={styles.eyebrow}><Terminal size={13} />PAYPAL AGENT TOOLKIT / ORIGINAL ORDER</span><h2 id="toolkit-heading">Ask the model.<br /><span>Keep the observation.</span></h2><p>Choose an existing Sample witness. Gemini selects the read, the installed Toolkit observes it, and the same interaction explains that exact receipt.</p></div><span className={styles.boundary}><ShieldCheck size={15} />Controlled Sample transport</span></header>
    <form className={styles.create} onSubmit={event => { event.preventDefault(); void send("create"); }}>
      <div className={styles.witnessSelect}><label htmlFor="toolkit-witness">Original purchase witness</label><select id="toolkit-witness" value={runId} disabled={Boolean(busy || pending || !view?.witnesses.length)} onChange={event => setRunId(event.target.value)}>{view?.witnesses.length ? view.witnesses.map(item => <option key={item.id} value={item.id}>{item.title} · {item.scenario} · {item.id.slice(0, 8)}</option>) : <option value="">{loading ? "Reading saved witnesses…" : "No completed Sample purchase"}</option>}</select>{witness ? <p><Fingerprint size={12} /><code>{witness.orderId}</code><span>{witness.captureCount} recorded {witness.captureCount === 1 ? "capture" : "captures"}</span></p> : <p>Finish a Sample purchase to retain an order that the tool can inspect.</p>}</div>
      <div className={styles.scope}><strong>Two actual model calls. One scoped read.</strong><p><code>@paypal/agent-toolkit 1.11.0</code> · <code>get_order</code></p><p>Create, capture and refund tools are unavailable.</p><button type="submit" className="button primary" disabled={Boolean(!view?.configured || !witness || busy || pending)}>{busy === "create" ? <LoaderCircle size={15} className="spin" /> : <Sparkles size={15} />}Ask Gemini to inspect<ArrowRight size={14} /></button>{view && !view.configured ? <p className={styles.unavailable}>Gemini is not configured here. Existing receipts remain readable.</p> : view?.model ? <small>{view.model}</small> : null}</div>
    </form>
    {error ? <div className={styles.error} role="alert"><strong>The latest request could not be confirmed.</strong><p>{error}</p><p>Saved observations remain available. Refresh only reads existing work.</p></div> : null}
    {notice ? <p className={styles.notice} role="status"><Check size={14} />{notice}</p> : null}
    {pending ? <div className={styles.recovery}><Fingerprint size={20} /><div><strong>Keep the original submission.</strong><p>This browser retained request <code>{pending.requestId}</code>. Read its saved state first; resubmission uses this exact identity.</p><div><button type="button" className="button secondary" disabled={loading || Boolean(busy)} onClick={() => void read()}><RefreshCw size={14} />Find saved submission</button><button type="button" className="text-link" disabled={loading || Boolean(busy) || !view || Boolean(error)} onClick={() => void send("create", pending)}>Resubmit original identity</button></div></div></div> : null}
    <div className={styles.listHeading}><h3>Saved investigations <span>{view?.reviews.length ?? "—"}</span></h3><button type="button" className="button secondary" disabled={loading} onClick={() => void read()}>{loading ? <LoaderCircle size={14} className="spin" /> : <RefreshCw size={14} />}Read saved work</button></div>
    {!view && loading ? <div className={styles.empty} role="status" aria-busy="true"><LoaderCircle size={24} className="spin" /><h3>Reading retained investigations…</h3><p>This read does not submit model work.</p></div> : !view?.reviews.length ? <div className={styles.empty}><CircleDashed size={28} /><h3>{view ? "The first receipt starts with your choice." : "Saved work is awaiting a connection."}</h3><p>{view ? "Choose a witness above to begin. Its original model identities and observations will stay together here." : "Read the saved work again when this workspace is available."}</p>{view && !view.witnesses.length ? <Link href="/" className="text-link">Open the Sample console<ArrowUpRight size={13} /></Link> : null}</div> : <div className={styles.workspace}>
      <div className={styles.list} aria-label="Saved Toolkit investigations">{view.reviews.map(item => <button type="button" key={item.id} className={`${styles.item} ${item.id === selected?.id ? styles.selected : ""}`} aria-pressed={item.id === selected?.id} onClick={() => { setSelectedId(item.id); setFocusVersion(value => value + 1); }}><span className={`${styles.status} ${styles[item.status]}`}>{stateLabel[item.status]}</span><strong>{item.witness.title}</strong><span>{item.witness.scenario}</span><code>{item.id.slice(0, 12)}</code><ArrowUpRight size={14} /></button>)}</div>
      {selected ? <article className={styles.detail} aria-labelledby="toolkit-review-title"><header><span className={styles.eyebrow}>ORIGINAL INVESTIGATION / {selected.model}</span><h3 id="toolkit-review-title" tabIndex={-1} ref={heading}>{stateLabel[selected.status]}</h3><p><code>{selected.id}</code></p></header>
        <ol className={styles.phases}>{phases.map(phase => { const Icon = phase.icon, receiptId = selected.receiptIds[phase.id], ready = selected.availableReceiptIds.includes(receiptId), current = selected.phase === phase.id && active(selected); return <li key={phase.id} className={`${ready ? styles.observed : ""} ${current ? styles.current : ""}`}><span className={styles.phaseIcon}>{ready ? <Check size={16} /> : <Icon size={16} />}</span><div><strong>{phase.name}</strong><p>{phase.detail}</p>{ready ? <button type="button" className="text-link" onClick={() => onEvidence(receiptId)}>Inspect original receipt<ArrowUpRight size={12} /></button> : <span className={styles.phaseState}>{current ? selected.status === "waiting" ? "Continuation needs attention" : "Saved phase in progress" : "No accepted receipt recorded"}</span>}</div></li>; })}</ol>
        {selected.result ? <div className={styles.conclusion}><span className={styles.eyebrow}>MODEL CONCLUSION / SAMPLE OBSERVATION</span><h4>{selected.result.observedOrderStatus}</h4><p>{selected.result.conclusion}</p>{selected.result.uncertainty.length ? <ul>{selected.result.uncertainty.map((item, index) => <li key={index}>{item}</li>)}</ul> : null}<button type="button" className="text-link" onClick={() => onEvidence(selected.result!.evidenceId)}>Inspect conclusion receipt<ArrowUpRight size={13} /></button></div> : selected.status === "failed" ? <div className={styles.failure}><strong>{selected.errorCode ?? "Original attempt failed"}</strong><p>{failureCopy(selected.errorCode)}</p></div> : selected.status === "cancelled" ? <div className={styles.waiting}><strong>Stopped with earlier observations retained.</strong><p>Stopping does not erase completed reads or establish a conclusion.</p></div> : <div className={styles.waiting}><strong>{selected.status === "waiting" ? "The original continuation stopped." : "Waiting for the original receipt chain."}</strong><p>{selected.status === "waiting" ? "Continue from the same saved phases. An unresolved provider submission will remain failed rather than be resubmitted." : "Progress is read every five seconds while this page is visible. Each model request keeps its original identity."}</p></div>}
        <details className={styles.provenance}><summary><Fingerprint size={14} />Source and request provenance</summary><dl><div><dt>Original request</dt><dd><code>{selected.actionId}</code></dd></div><div><dt>Source SHA-256</dt><dd><code>{selected.witness.sourceHash}</code></dd></div><div><dt>Original order</dt><dd><code>{selected.witness.orderId}</code></dd></div><div><dt>Workflow</dt><dd><code>{selected.workflowId ?? "Dispatch acknowledgement pending"}</code><span>Continuation version {selected.dispatchVersion}</span></dd></div></dl></details>
        <div className={styles.actions}>{active(selected) ? <><button type="button" className="button secondary" disabled={Boolean(busy)} onClick={() => void send("cancel")}><Square size={13} />Stop investigation</button>{selected.status === "waiting" || selected.status === "queued" || selected.status === "running" && selected.leaseUntil && Date.parse(selected.leaseUntil) <= Date.now() ? <button type="button" className="button primary" disabled={Boolean(busy)} onClick={() => void send("resume")}>Continue saved work<ArrowRight size={14} /></button> : null}</> : null}<Link href={`/runs/${selected.runId}`} className="text-link">Original witness<ArrowUpRight size={13} /></Link><div className={styles.exports}><button type="button" className="text-link" disabled={Boolean(busy)} onClick={() => void download("json")}><Download size={13} />JSON</button><button type="button" className="text-link" disabled={Boolean(busy)} onClick={() => void download("html")}><Download size={13} />HTML report</button></div></div>
      </article> : null}
    </div>}
    <p className={styles.footnote}>The model observes controlled Sample state through the installed Toolkit. Its conclusion is separate from repair verification and the sealed context study.</p>
  </section>;
}
