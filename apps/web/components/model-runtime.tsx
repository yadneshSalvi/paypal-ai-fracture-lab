"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Check, CircleDashed, Clock3, Fingerprint, FlaskConical, GitBranch, LoaderCircle, LockKeyhole, Radio, RefreshCw, ShieldCheck, Sparkles, Terminal, X } from "lucide-react";
import type { RuntimeAttempt, RuntimeView } from "../../../packages/ai/src/runtime-view";
import { AppShell, LoadingWorkspace } from "./app-shell";
import { SourceChip } from "./primitives";
import { useWorkspace } from "./workspace-provider";
import styles from "./model-runtime.module.css";

const roles: Record<string, { title: string; purpose: string }> = {
  diagnosis_tool_selection: { title: "Choose a discriminating read", purpose: "Propose competing hypotheses and select one original, run-owned resource." },
  diagnosis_conclusion: { title: "Conclude from the actual receipt", purpose: "Continue the original conversation and revise the hypotheses using observed resource state." },
  repair_contract_plan: { title: "Bind the repair to its contracts", purpose: "Resolve the five contract categories against exact source and context hashes." },
  repair_candidate_source: { title: "Author the candidate source", purpose: "Produce a reviewable diff and source citations. Generation does not establish behavioral correctness." },
  runtime_background_recovery: { title: "Recover the original response", purpose: "A fresh worker reads the same provider response without submitting a replacement request." },
  toolkit_order_selection: { title: "Select the scoped Toolkit read", purpose: "Use the installed get_order schema within the controlled Sample boundary." },
  toolkit_order_conclusion: { title: "Interpret the Toolkit receipt", purpose: "Continue the original saved interaction and bind the public conclusion to the observed order." },
};
const label = (attempt: RuntimeAttempt) => roles[attempt.role]?.title ?? attempt.role.replaceAll("_", " ");
const elapsed = (value: number | null) => value === null ? "Not reported" : value < 1000 ? `${Math.round(value)} ms` : `${(value / 1000).toFixed(1)} s`;
const short = (value: string | null) => value ? value.slice(0, 12) : "Not recorded";
const errorText = (code: string | null) => code === "MODEL_DISPATCH_UNKNOWN" || code === "MODEL_TRANSPORT_UNKNOWN" || code === "MODEL_TRANSPORT_FAILURE" ? "The original submission has no completed answer. Its identity and failure remain retained; it has not been automatically replaced." : code === "MODEL_INCOMPLETE" ? "The provider returned an incomplete answer. Partial output cannot establish a diagnosis or verified repair." : code === "WORK_CANCELLED" ? "Execution authority ended. Earlier observations remain available." : "This attempt did not produce an accepted response. Its original failure remains available for inspection.";

export function ModelRuntimePage() {
  const { workspace, loading: workspaceLoading, openEvidence, refresh: readSession } = useWorkspace();
  const [checkingSession, setCheckingSession] = useState(false);
  const sessionRead = useRef(false);
  const [data, setData] = useState<RuntimeView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const currentSession = useRef(workspace?.sessionId);
  currentSession.current = workspace?.sessionId;
  const inFlight = useRef<AbortController | null>(null);
  const refresh = useCallback(async () => {
    const sessionId = currentSession.current;
    if (!sessionId || inFlight.current) return;
    const controller = new AbortController(); inFlight.current = controller;
    setLoading(true);
    try {
      const response = await fetch("/api/model-runtime", { cache: "no-store", signal: controller.signal });
      const body = await response.json() as { data?: RuntimeView; error?: { message?: string } };
      if (!response.ok || !body.data || body.data.schemaVersion !== 1 || body.data.sessionId !== sessionId) throw new Error(body.error?.message ?? "The retained model records could not be read.");
      if (currentSession.current !== sessionId || controller.signal.aborted) return;
      setData(body.data); setError(null);
    } catch (failure) {
      if (!controller.signal.aborted && currentSession.current === sessionId) setError(failure instanceof Error ? failure.message : "The retained model records could not be read.");
    } finally { if (inFlight.current === controller) { inFlight.current = null; setLoading(false); } }
  }, []);
  useEffect(() => {
    inFlight.current?.abort(); inFlight.current = null; setData(null); setError(null);
    void refresh();
    return () => { inFlight.current?.abort(); inFlight.current = null; };
  }, [workspace?.sessionId, refresh]);
  const running = Boolean(data?.attempts.some(item => item.status === "running"));
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => { if (document.visibilityState !== "hidden") void refresh(); }, 5000);
    return () => clearInterval(timer);
  }, [running, refresh]);
  const reconnect = async () => {
    if (sessionRead.current) return;
    sessionRead.current = true; setCheckingSession(true);
    try { await readSession(true); } finally { sessionRead.current = false; setCheckingSession(false); }
  };
  return <AppShell>{workspaceLoading ? <LoadingWorkspace /> : !workspace ? <RuntimeEntry checking={checkingSession} onRead={() => void reconnect()} /> : <RuntimeEvidence data={data} loading={loading} error={error} onRefresh={() => void refresh()} onEvidence={openEvidence} />}</AppShell>;
}

export function RuntimeEntry({ checking, onRead }: { checking: boolean; onRead: () => void }) {
  return <section className={styles.root}>
    <header className={styles.hero}><div className={styles.heroCopy}><span className={styles.kicker}><Radio size={13} />AI WORKBENCH / SAVED INVESTIGATIONS</span><h1>Start with<br /><span>the original witness.</span></h1><p>Connect to a saved workspace to inspect its model attempts, tool observations and retained failures.</p><div className={styles.heroTags}><LockKeyhole size={13} /><span>Opening this page only reads your saved session</span></div></div><div className={styles.constellation} aria-hidden="true"><span className={styles.orbit} /><div className={styles.core}><Fingerprint size={31} /><span>SAVED<br />IDENTITY</span></div><span className={styles.satelliteA}><Sparkles size={15} />MODEL</span><span className={styles.satelliteB}><Terminal size={15} />TOOL</span><span className={styles.satelliteC}><ShieldCheck size={15} />RECEIPT</span></div></header>
    <div className={styles.empty}><LockKeyhole size={27} /><h2>No workspace is connected.</h2><p>If you have opened a saved session in this browser, read it again. To begin a new investigation, explicitly create a workspace with registered Sample examples.</p><div className={styles.entryActions}><button type="button" className="button secondary" disabled={checking} onClick={onRead}>{checking ? <LoaderCircle size={14} className="spin" /> : <RefreshCw size={14} />}Read saved session</button><Link className="button primary" href="/judge" prefetch={false}>Create a Sample workspace<ArrowRight size={14} /></Link></div><p>New workspace scope: controlled Sample examples. Model and payment actions require a separate choice.</p></div>
  </section>;
}

export function RuntimeEvidence({ data, loading, error, onRefresh, onEvidence }: { data: RuntimeView | null; loading: boolean; error: string | null; onRefresh: () => void; onEvidence: (id: string) => void }) {
  const [provider, setProvider] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const selectionFocus = useRef(false);
  const attempts = data?.attempts.filter(item => provider === "all" || item.provider === provider) ?? [];
  const selected = attempts.find(item => item.id === selectedId) ?? attempts[0] ?? null;
  useEffect(() => { if (selectionFocus.current) { selectionFocus.current = false; heading.current?.focus(); } }, [selectedId]);
  const completed = data?.attempts.filter(item => item.status === "completed").length ?? 0;
  const failed = data?.attempts.filter(item => item.status === "failed" || item.status === "cancelled").length ?? 0;
  return <section className={styles.root}>
    <header className={styles.hero}><div className={styles.heroCopy}><span className={styles.kicker}><Radio size={13} />AI WORKBENCH / RETAINED EVIDENCE</span><h1>Every conclusion<br /><span>has a receipt.</span></h1><p>See what the model proposed, what the tool actually observed, and which original attempts remain unresolved.</p><div className={styles.heroTags}><SourceChip source="sample" /><span><LockKeyhole size={13} />Private reasoning stays private</span></div></div><div className={styles.constellation} aria-hidden="true"><span className={styles.orbit} /><div className={styles.core}><Fingerprint size={31} /><span>ORIGINAL<br />IDENTITY</span></div><span className={styles.satelliteA}><Sparkles size={15} />MODEL</span><span className={styles.satelliteB}><Terminal size={15} />TOOL</span><span className={styles.satelliteC}><ShieldCheck size={15} />RECEIPT</span></div></header>
    <div className={styles.metrics}><div><span>Retained attempts</span><strong>{data?.totalAttempts ?? "—"}</strong></div><div><span>Accepted responses</span><strong>{data ? completed : "—"}</strong></div><div><span>Unresolved / stopped</span><strong>{data ? failed : "—"}</strong></div><div><span>Observed tool reads</span><strong>{data?.reads.length ?? "—"}</strong></div></div>
    <div className={styles.sectionHeading}><div><span className={styles.kicker}>MODEL → OBSERVATION → CONCLUSION</span><h2>The evidence, step by step.</h2></div><button className="button secondary" type="button" disabled={loading} onClick={onRefresh}>{loading ? <LoaderCircle size={14} className="spin" /> : <RefreshCw size={14} />}Refresh records</button></div>
    {error ? <div className={styles.error} role="alert"><ShieldCheck size={18} /><div><strong>The latest read could not complete.</strong><p>{error}</p><p>{data ? "The saved view below is retained. Refresh only reads the existing records." : "No result has been inferred. Refresh reads the original records."}</p></div></div> : null}
    {!data && loading ? <div className={styles.empty} role="status" aria-busy="true"><LoaderCircle size={25} className="spin" /><h3>Reading the original attempts…</h3><p>Model submissions are never replayed by this view.</p></div> : !data?.attempts.length ? <div className={styles.empty}><CircleDashed size={32} /><h3>{data ? "Your first investigation starts with a witness." : "The evidence view is waiting for a connection."}</h3><p>{data ? "Run a Sample scenario, then ask for an evidence-based diagnosis or grounded candidate. Its actual model receipts will appear here." : "Reconnect to read this session's original records."}</p><Link href="/" className="button primary">Open the Fracture console<ArrowRight size={14} /></Link></div> : <>
      <div className={styles.filters} aria-label="Filter model provider">{["all", "OpenAI", "Gemini"].map(value => <button type="button" key={value} aria-pressed={provider === value} onClick={() => { setProvider(value); setSelectedId(null); }}>{value === "all" ? "All providers" : value}</button>)}<span>Completed model work is not a passing payment test.</span></div>
      <div className={styles.workspace}><div className={styles.attempts} aria-label="Retained model attempts">{attempts.map((attempt, index) => <button type="button" key={attempt.id} className={`${styles.attempt} ${selected?.id === attempt.id ? styles.selected : ""}`} aria-pressed={selected?.id === attempt.id} onClick={() => { selectionFocus.current = true; setSelectedId(attempt.id); if (selectedId === attempt.id) heading.current?.focus(); }}><span className={styles.attemptTop}><span className={styles.index}>{String(attempts.length - index).padStart(2, "0")}</span><span className={`${styles.status} ${styles[attempt.status]}`}>{attempt.status === "completed" ? <Check size={12} /> : attempt.status === "running" ? <Clock3 size={12} /> : <X size={12} />}{attempt.status}</span></span><strong>{label(attempt)}</strong><span className={styles.model}>{attempt.provider}<span>·</span>{attempt.model}</span><span className={styles.attemptFooter}><code>{short(attempt.id)}</code><span>{elapsed(attempt.durationMs)}<ArrowUpRight size={13} /></span></span></button>)}{!attempts.length ? <div className={styles.empty}><h3>No attempts from this provider.</h3><p>The saved work from other providers remains available.</p></div> : null}</div>
      {selected ? <section className={styles.inspector} aria-labelledby="model-attempt-title"><div className={styles.inspectorHeader}><span className={styles.kicker}>ORIGINAL ATTEMPT / {selected.provider.toUpperCase()}</span><h2 tabIndex={-1} ref={heading} id="model-attempt-title">{label(selected)}</h2><p>{roles[selected.role]?.purpose ?? "Inspect the original model response and its retained evidence."}</p></div><div className={styles.identity}><Fingerprint size={18} /><div><span>Request identity stays attached</span><code>{selected.id}</code></div></div>
        {selected.status === "failed" || selected.status === "cancelled" ? <div className={styles.failure}><strong>{selected.errorCode ?? selected.status}</strong><p>{errorText(selected.errorCode)}</p></div> : selected.status === "running" ? <div className={styles.pending}><Clock3 size={18} /><p>The original attempt is still pending. This page reads its saved state; it does not submit another model request.</p></div> : null}
        <dl className={styles.facts}><div><dt>Observed model</dt><dd>{selected.model}</dd></div><div><dt>Provider response</dt><dd><code>{selected.responseId ?? "No response identity retained"}</code></dd></div><div><dt>Reported tokens · input / output</dt><dd>{selected.inputTokens?.toLocaleString() ?? "—"}<span> / </span>{selected.outputTokens?.toLocaleString() ?? "—"}</dd></div><div><dt>Continuation</dt><dd>{selected.continuationFrom ? <><GitBranch size={13} /><span>{selected.provider === "OpenAI" ? "Stateless continuation" : "Saved-interaction continuation"}</span><code>{selected.continuationFrom}</code></> : selected.background ? "Original saved response, recoverable by read" : "No continuation recorded"}</dd></div><div><dt>Private context</dt><dd>{selected.privateContextStored ? `Encrypted on server · ${selected.retainedOutputItems ?? "unreported"} original output items` : selected.background ? "Opaque context held by the original provider response" : "No encrypted-context receipt recorded"}</dd></div></dl>
        {selected.transport ? <details className={styles.transport}><summary><Radio size={14} />Inspect the actual transport receipt</summary><dl><div><dt>HTTP status / elapsed</dt><dd>{selected.transport.httpStatus ?? "No headers"} / {elapsed(selected.transport.durationMs)}</dd></div><div><dt>Read state</dt><dd>{selected.status === "completed" && selected.transport.phase === "consumer_cancelled" ? "Terminal event accepted; stream closed by reader" : selected.transport.phase}</dd></div><div><dt>Endpoint</dt><dd><code>{selected.transport.endpoint}</code></dd></div><div><dt>Runtime / dispatcher</dt><dd>{selected.transport.node ?? "Unreported"} / Undici {selected.transport.dispatcher ?? "unreported"}</dd></div><div><dt>Headers / body silence limits</dt><dd>{elapsed(selected.transport.headersTimeoutMs)} / {elapsed(selected.transport.bodyTimeoutMs)}</dd></div><div><dt>Native failure codes</dt><dd>{selected.transport.nativeCodes.join(" → ") || "None recorded"}</dd></div><div><dt>Full response hash</dt><dd><code>{selected.transport.responseSha256 ?? "No complete-body hash; terminal stream reads may retain only a prefix."}</code></dd></div></dl></details> : <p className={styles.legacy}>This attempt has no retained transport receipt. No runtime behavior is inferred from its absence.</p>}
        <div className={styles.inspectorActions}>{selected.evidenceId ? <button type="button" className="button primary" onClick={() => onEvidence(selected.evidenceId!)}>Open model receipt<ArrowRight size={14} /></button> : null}{selected.runId ? <Link className="text-link" href={`/runs/${selected.runId}`}>Original witness<ArrowUpRight size={13} /></Link> : null}</div>
      </section> : null}</div>
    </>}
    {data?.reads.length ? <section className={styles.readSection}><div className={styles.sectionHeading}><div><span className={styles.kicker}>HOW AI USES PAYPAL</span><h2>These reads actually ran.</h2></div><span className={styles.boundary}><ShieldCheck size={14} />Controlled Sample transport</span></div><div className={styles.reads}>{data.reads.map(read => <article className={styles.read} key={read.id}><span className={styles.readIcon}>{read.kind === "toolkit" ? <Terminal size={20} /> : <BookGlyph />}</span><div><span className={styles.kicker}>{read.kind === "toolkit" ? "PAYPAL AGENT TOOLKIT" : read.kind === "sdk" ? "APIMATIC-GENERATED SDK" : "SCOPED WORKSPACE READ"}</span><h3>{read.operation}</h3><p>{read.summary}</p><div className={styles.readStatus}><span className={styles.status}>{read.observedStatus ?? "Unresolved"}</span><code>{read.orderId ?? "No created order"}</code></div></div><button type="button" className="button secondary" onClick={() => onEvidence(read.id)}>Inspect read<ArrowRight size={14} /></button></article>)}</div></section> : null}
    {data?.truncated ? <p className={styles.legacy}>Showing {data.attempts.length} of {data.totalAttempts} retained model attempts. The complete records remain in this session.</p> : null}
    <footer className={styles.scope}><FlaskConical size={16} /><p>Application work has its own receipts. The sealed 600-case context study keeps its original protocol, failures and denominators.</p><Link href="/evaluations">Open the study<ArrowUpRight size={13} /></Link></footer>
  </section>;
}
function BookGlyph() { return <GitBranch size={20} />; }
