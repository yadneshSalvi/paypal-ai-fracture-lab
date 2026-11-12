"use client";

import { useCallback, useDeferredValue, useEffect, useId, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import {
  ArrowDownToLine, ArrowRight, ArrowUpRight, Braces, Check, ChevronDown, ChevronLeft,
  ChevronRight, CircleHelp, Clock3, Code2, Copy, FileCode2, FileSearch, Files, Fingerprint,
  GitBranch, GitCompareArrows, Layers3, Link2, List, LoaderCircle, LockKeyhole, Map,
  Network, Plus, RefreshCw, Search, ShieldCheck, ShieldQuestion, SquareTerminal,
  TriangleAlert, Unplug, Waypoints, X,
} from "lucide-react";
import type { ApiEnvelope, ApiFailure } from "@fracture/contracts";
import type { SourceBrowserConnection, SourceFileView, SourceImportSummary, SourceSnapshotExport, SourceWorkspaceIndex, SourceWorkspaceView } from "../../../packages/contracts/src/source-workspaces";
import type { IntegrationNodeKind, SourceChangeReceipt, SourceIntegrationGraph, SourceIntegrationNode, SourceRiskFinding, SourceSpan, SourceWorkspaceSnapshot } from "../../../packages/source-workspaces/src/types";
import { AppShell } from "./app-shell";
import { useWorkspace } from "./workspace-provider";
import s from "./source-workspaces.module.css";

const BASE = "/api/source-workspaces";
const HASH = /^[a-f0-9]{64}$/;
type Failure = { message: string; code: string; recoverable: boolean; denied: boolean };
type Selection = { source: SourceSpan; nodeId: string | null; riskId: string | null };
type DetailTab = "findings" | "files" | "tools" | "coverage" | "changes";
const DETAIL_TABS: { id: DetailTab; label: string; Icon: typeof Files }[] = [
  { id: "findings", label: "Findings", Icon: ShieldQuestion }, { id: "files", label: "Files", Icon: Files },
  { id: "tools", label: "Declarations", Icon: SquareTerminal }, { id: "coverage", label: "Coverage", Icon: Layers3 },
  { id: "changes", label: "Source changes", Icon: GitCompareArrows },
];
const KIND_LABELS: Record<IntegrationNodeKind, string> = {
  file: "Source file", module: "Import", function: "Function", route: "Route", commerce_intent: "Business intent",
  provider_operation: "Provider operation", state_write: "State write", fulfillment: "Fulfillment", webhook: "Webhook",
  identity: "Request identity", reconciliation: "Resource read", outbound_destination: "Declared destination", declared_tool: "Declared command",
};
const bytesLabel = (value: number) => value < 1024 ? `${value} B` : value < 1024 * 1024 ? `${(value / 1024).toFixed(1)} KiB` : `${(value / 1024 / 1024).toFixed(1)} MiB`;
const shortHash = (value: string | null, length = 12) => value ? value.slice(0, length) : "—";
const dateTime = (value: string) => new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
const spanLabel = (source: SourceSpan) => `${source.path}:${source.startLine}:${source.startColumn}`;

class SourceRequestError extends Error {
  constructor(message: string, readonly code: string, readonly recoverable: boolean, readonly status = 0) { super(message); }
}
function failureOf(error: unknown): Failure {
  return error instanceof SourceRequestError ? { message: error.message, code: error.code, recoverable: error.recoverable, denied: [401, 403, 410].includes(error.status) || /REVOKED|EXPIRED|ACCESS_DENIED|SCOPE_DENIED/.test(error.code) } : { message: error instanceof Error ? error.message : "Saved source state could not be read.", code: "SOURCE_CONNECTION_UNAVAILABLE", recoverable: true, denied: false };
}
async function readJson(path: string, options: { method?: "GET" | "POST" | "DELETE"; body?: unknown } = {}, signal?: AbortSignal): Promise<{ value: unknown; contentHash: string | null }> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  let timedOut = false;
  const timer = window.setTimeout(() => { timedOut = true; controller.abort(); }, 25_000);
  try {
    const response = await fetch(path, {
      method: options.method ?? "GET", credentials: "same-origin", cache: "no-store", redirect: "error", signal: controller.signal,
      ...(options.body === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(options.body) }),
    });
    if (!response.headers.get("content-type")?.includes("application/json")) throw new SourceRequestError("The source service returned an unreadable response. Your last verified snapshot is retained.", "SOURCE_RESPONSE_UNAVAILABLE", true, response.status);
    const text = await response.text();
    if (text.length > 64 * 1024 * 1024) throw new SourceRequestError("This response exceeds the source viewer's size limit.", "SOURCE_RESPONSE_LIMIT", false, response.status);
    const value = JSON.parse(text) as unknown;
    if (!response.ok || value && typeof value === "object" && "error" in value) {
      const error = (value as ApiFailure)?.error;
      throw new SourceRequestError(error?.message ?? "The source request could not be confirmed.", error?.code ?? "SOURCE_REQUEST_FAILED", error?.recoverable ?? response.status >= 500, response.status);
    }
    return { value, contentHash: response.headers.get("x-content-sha256") };
  } catch (error) {
    if (timedOut) throw new SourceRequestError("The source service did not respond in time. Refresh saved state or retry the same connection request.", "SOURCE_REQUEST_TIMEOUT", true);
    throw error;
  } finally { window.clearTimeout(timer); signal?.removeEventListener("abort", abort); }
}
async function api<T>(path: string, options?: { method?: "GET" | "POST" | "DELETE"; body?: unknown }, signal?: AbortSignal): Promise<T> {
  const { value } = await readJson(path, options, signal);
  if (!value || typeof value !== "object" || !("data" in value)) throw new SourceRequestError("The source service response was incomplete. Refresh saved state.", "SOURCE_RESPONSE_INCOMPLETE", true);
  return (value as ApiEnvelope<T>).data;
}
function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(",")}}`;
}
async function browserHash(value: string): Promise<string> {
  if (!globalThis.crypto?.subtle) throw new SourceRequestError("A secure browser context is needed to verify this source checksum.", "SOURCE_BROWSER_CRYPTO_UNAVAILABLE", true);
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

function Notice({ failure, onRetry }: { failure: Failure; onRetry?: () => void }) {
  return <div className={s.error} role="alert"><TriangleAlert size={18} /><div><strong>{failure.denied ? "Source access is unavailable" : "Saved state could not be confirmed"}</strong><p>{failure.message}</p><code>{failure.code}</code></div>{onRetry && failure.recoverable ? <button className={s.quietButton} onClick={onRetry}><RefreshCw size={14} />Retry</button> : null}</div>;
}
function CopyButton({ value, label = "Copy command", compact = false }: { value: string; label?: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false), [failed, setFailed] = useState(false);
  return <button className={compact ? s.copyIcon : s.quietButton} title={label} aria-label={copied ? "Copied to clipboard" : label} onClick={() => {
    void (async () => { try { if (!navigator.clipboard) throw new Error(); await navigator.clipboard.writeText(value); setCopied(true); setFailed(false); } catch { setFailed(true); } })();
  }}>{copied ? <Check size={14} /> : <Copy size={14} />}{compact ? <span className="sr-only">{failed ? "Clipboard unavailable; select the text to copy" : copied ? "Copied" : label}</span> : failed ? "Select text to copy" : copied ? "Copied" : label}</button>;
}
function CliCommand({ command, label }: { command: string; label: string }) {
  return <div className={s.command}><div><SquareTerminal size={13} /><span>{label}</span><CopyButton value={command} compact /></div><pre tabIndex={0} aria-label={label}><code>{command}</code></pre></div>;
}
function HashLine({ label, value }: { label: string; value: string }) {
  return <div className={s.hashLine}><span>{label}</span><code title={value}>{value}</code><CopyButton value={value} label={`Copy ${label}`} compact /></div>;
}

export function SourceAtlas() {
  const { workspace, loading } = useWorkspace();
  return <AppShell>{loading ? <div className={s.atlas}><AtlasHeading /><div className={s.sourceLoading} role="status" aria-busy="true"><LoaderCircle className={s.spinning} size={23} /><h2>Opening your private source scope</h2><p>Checking this browser session before any source is loaded.</p></div></div> : workspace ? <SourceSession key={workspace.sessionId} sessionId={workspace.sessionId} /> : <div className={s.atlas}><AtlasHeading /><div className={s.emptyCard}><LockKeyhole size={28} /><h2>A workspace session is needed.</h2><p>Reconnect the workspace to request a source view. Private source is never loaded without an active session.</p></div></div>}</AppShell>;
}
function AtlasHeading() {
  return <header className={s.hero}><div><span className={s.eyebrow}><span />SOURCE INTELLIGENCE</span><h1>Your code.<br /><em>Its payment story.</em></h1><p>Follow the integration from intent to fulfillment.<br className={s.desktopBreak} /> Every connection starts with an exact source citation.</p></div><div className={s.heroMark} aria-hidden="true"><svg viewBox="0 0 240 190" fill="none"><path d="M20 45H91L125 94H215M20 144H91L125 94M164 24V63L125 94V168" stroke="currentColor" strokeWidth="1.5" /><path d="M20 45H91L125 94H215" stroke="#b8a6ef" strokeWidth="2" /><path d="M20 144H91L125 94V168" stroke="#78d5c0" strokeWidth="2" /><circle cx="20" cy="45" r="5" /><circle cx="20" cy="144" r="5" /><circle cx="164" cy="24" r="5" /><circle cx="215" cy="94" r="5" /><circle cx="125" cy="168" r="5" /><circle cx="125" cy="94" r="12" /><circle cx="125" cy="94" r="4" /></svg><span>TRACEABLE BY DESIGN</span></div></header>;
}

function SourceSession({ sessionId }: { sessionId: string }) {
  const [index, setIndex] = useState<SourceWorkspaceIndex | null>(null), [error, setError] = useState<Failure | null>(null);
  const [loading, setLoading] = useState(true), [refreshing, setRefreshing] = useState(false), [refreshToken, setRefreshToken] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null), [connection, setConnection] = useState<SourceBrowserConnection | null>(null);
  const [connectionOpen, setConnectionOpen] = useState(false), [connectionBusy, setConnectionBusy] = useState(false), [connectionError, setConnectionError] = useState<Failure | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const indexFlight = useRef<Promise<void> | null>(null), connectionFlight = useRef(false), mounted = useRef(true);
  const connectionRequestId = useRef<string | null>(null);
  const activeRequests = useRef(new Set<AbortController>());
  const refreshIndex = useCallback((): Promise<void> => {
    if (indexFlight.current) return indexFlight.current;
    const controller = new AbortController(); activeRequests.current.add(controller); setRefreshing(true);
    const promise = api<SourceWorkspaceIndex>(BASE, undefined, controller.signal).then(next => {
      if (!mounted.current) return;
      setIndex(next); setError(null);
      setSelectedId(current => current ?? next.imports.find(item => item.status === "ready")?.id ?? next.imports[0]?.id ?? null);
      setConnection(current => current ?? next.connections.find(item => item.status === "pending") ?? next.connections.find(item => item.status === "approved") ?? null);
    }).catch(cause => { if (!controller.signal.aborted && mounted.current) setError(failureOf(cause)); }).finally(() => {
      activeRequests.current.delete(controller); if (mounted.current && !controller.signal.aborted) { setLoading(false); setRefreshing(false); } if (indexFlight.current === promise) indexFlight.current = null;
    });
    indexFlight.current = promise; return promise;
  }, []);
  useEffect(() => {
    mounted.current = true; void refreshIndex();
    const revalidate = () => { if (document.visibilityState === "visible") { void refreshIndex(); setRefreshToken(value => value + 1); } };
    document.addEventListener("visibilitychange", revalidate);
    return () => { mounted.current = false; document.removeEventListener("visibilitychange", revalidate); for (const request of activeRequests.current) request.abort(); activeRequests.current.clear(); indexFlight.current = null; };
  }, [refreshIndex, sessionId]);
  const readConnection = useCallback(async (id: string) => {
    if (connectionFlight.current) return; connectionFlight.current = true;
    const controller = new AbortController(); activeRequests.current.add(controller);
    try {
      const next = await api<SourceBrowserConnection>(`${BASE}/connections/${encodeURIComponent(id)}`, undefined, controller.signal);
      if (!mounted.current) return;
      setConnection(next); setConnectionError(null);
      if (next.status === "approved" && next.importId) { setSelectedId(next.importId); setAnnouncement("An owner approved this exact snapshot. Read-only source view connected."); await refreshIndex(); }
    } catch (cause) { if (!controller.signal.aborted && mounted.current) setConnectionError(failureOf(cause)); }
    finally { activeRequests.current.delete(controller); connectionFlight.current = false; }
  }, [refreshIndex]);
  useEffect(() => {
    if (!connection || connection.status !== "pending") return;
    const { id, approvalExpiresAt } = connection;
    const timer = window.setInterval(() => { if (document.visibilityState === "visible" && Date.now() < Date.parse(approvalExpiresAt)) void readConnection(id); }, 2200);
    const expiry = window.setTimeout(() => { if (document.visibilityState === "visible") void readConnection(id); }, Math.max(1, Date.parse(approvalExpiresAt) - Date.now() + 100));
    return () => { window.clearInterval(timer); window.clearTimeout(expiry); };
  }, [connection?.id, connection?.status, connection?.approvalExpiresAt, readConnection]);
  async function createConnection() {
    if (connectionBusy) return;
    setConnectionOpen(true); setConnectionBusy(true); setConnectionError(null);
    const requestId = connectionRequestId.current ?? crypto.randomUUID(); connectionRequestId.current = requestId;
    const controller = new AbortController(); activeRequests.current.add(controller);
    try {
      const next = await api<SourceBrowserConnection>(`${BASE}/connections`, { method: "POST", body: { requestId } }, controller.signal);
      if (!mounted.current) return;
      setConnection(next); setAnnouncement("Read-only connection requested. Approve its confirmation label from the authenticated owner CLI."); await refreshIndex();
    } catch (cause) { if (!controller.signal.aborted && mounted.current) setConnectionError(failureOf(cause)); }
    finally { activeRequests.current.delete(controller); if (mounted.current) setConnectionBusy(false); }
  }
  async function cancelConnection() {
    if (!connection || connectionBusy) return;
    setConnectionBusy(true); setConnectionError(null);
    const currentId = connection.id, controller = new AbortController(); activeRequests.current.add(controller);
    // Hide source immediately on withdrawal; the server acknowledgement remains separately visible.
    if (connection.status === "approved") setError({ message: "Source view withdrawal is being confirmed. File content is locked.", code: "SOURCE_VIEW_WITHDRAWING", recoverable: true, denied: true });
    try {
      const next = await api<SourceBrowserConnection>(`${BASE}/connections/${encodeURIComponent(currentId)}`, { method: "DELETE" }, controller.signal);
      if (!mounted.current) return;
      setConnection(next); connectionRequestId.current = null; setAnnouncement("Source connection withdrawn. Private file reads are closed."); await refreshIndex(); setRefreshToken(value => value + 1);
    } catch (cause) { if (!controller.signal.aborted && mounted.current) setConnectionError(failureOf(cause)); }
    finally { activeRequests.current.delete(controller); if (mounted.current) setConnectionBusy(false); }
  }
  const selected = index?.imports.find(item => item.id === selectedId);
  const missingSelectedScope = !!selectedId && !!index && !selected;
  const denied = !!error?.denied || missingSelectedScope || connection?.status === "cancelled" && connection.importId === selectedId;
  return <div className={s.atlas}>
    <AtlasHeading />
    <div className={s.policy}><span><LockKeyhole size={14} />Authorized source snapshots</span><span><Waypoints size={14} />Static inspection</span><span><SquareTerminal size={14} />0 application commands</span></div>
    <div className="sr-only" role="status" aria-live="polite">{announcement}</div>
    {error ? <Notice failure={error} onRetry={() => { void refreshIndex(); setRefreshToken(value => value + 1); }} /> : null}
    <div className={s.workspaceToolbar}><div className={s.workspaceSelect}><label htmlFor="source-workspace"><GitBranch size={15} />SOURCE WORKSPACE</label><select id="source-workspace" value={selectedId ?? ""} disabled={!index?.imports.length} onChange={event => setSelectedId(event.target.value)}><option value="" disabled>{loading ? "Loading saved snapshots…" : "Choose an approved snapshot"}</option>{index?.imports.map(item => <option value={item.id} key={item.id}>{item.title}{item.status === "ready" ? "" : ` · ${item.status}`}</option>)}</select><ChevronDown size={13} /></div><div className={s.toolbarActions}><button className={s.quietButton} disabled={refreshing} onClick={() => { void refreshIndex(); setRefreshToken(value => value + 1); }}><RefreshCw size={14} className={refreshing ? s.spinning : undefined} />{refreshing ? "Reading saved state" : "Refresh"}</button><button className={s.primaryButton} onClick={() => { setConnectionOpen(value => !value); if (!connection && !connectionBusy) void createConnection(); }} aria-expanded={connectionOpen}><Link2 size={15} />Connect source</button></div></div>
    {connectionOpen || connectionError ? <ConnectionPanel key={connection?.id ?? "new"} connection={connection} busy={connectionBusy} failure={connectionError} onCreate={() => { connectionRequestId.current = null; void createConnection(); }} onRetry={() => void createConnection()} onRead={() => { if (connection) void readConnection(connection.id); }} onCancel={() => void cancelConnection()} onClose={() => { setConnectionOpen(false); setConnectionError(null); }} /> : null}
    {loading ? <div className={s.sourceLoading} role="status"><LoaderCircle className={s.spinning} size={22} /><h2>Reading your source workspace</h2><p>Checking the saved snapshot and its current access scope.</p></div> : selectedId ? <SnapshotWorkspace key={selectedId} importId={selectedId} summary={selected ?? null} refreshToken={refreshToken} accessBlocked={denied} onRefresh={() => { void refreshIndex(); setRefreshToken(value => value + 1); }} /> : <EmptyWorkspace onConnect={() => { setConnectionOpen(true); if (!connection && !connectionBusy) void createConnection(); }} />}
  </div>;
}

function EmptyWorkspace({ onConnect }: { onConnect: () => void }) {
  return <section className={s.emptyCard}><div className={s.emptyGlyph} aria-hidden="true"><FileCode2 size={34} /><span /><Network size={32} /></div><span className={s.eyebrow}>A SOURCE MAP YOU CAN INSPECT</span><h2>Bring the application.<br />Keep the evidence.</h2><p>Import from an authorized local root, then approve this browser for one exact snapshot. Your code stays private and every finding stays linked to its source.</p><button className={s.primaryButton} onClick={onConnect}><Link2 size={16} />Connect a source snapshot<ArrowRight size={15} /></button><div className={s.emptySteps}><div><span>01</span><strong>Authorize locally</strong><small>The owner CLI selects a configured root.</small></div><div><span>02</span><strong>Freeze the source</strong><small>Exact bytes, immutable hashes, secret checks.</small></div><div><span>03</span><strong>Follow the path</strong><small>Inspect the graph and cited source spans.</small></div></div><div className={s.emptyFoot}><ShieldCheck size={14} />Source import grants no permission to execute code or move money.</div></section>;
}

function ConnectionPanel({ connection, busy, failure, onCreate, onRetry, onRead, onCancel, onClose }: { connection: SourceBrowserConnection | null; busy: boolean; failure: Failure | null; onCreate: () => void; onRetry: () => void; onRead: () => void; onCancel: () => void; onClose: () => void }) {
  const [approvalRequest] = useState(() => crypto.randomUUID());
  const [importRequest] = useState(() => crypto.randomUUID());
  const approvalCommand = connection ? `npm run cli -- call approve_source_view '${JSON.stringify({ connectionId: connection.id, importId: "<chosen import id>", requestId: approvalRequest })}'` : "";
  const importCommand = `npm run cli -- call import_source_workspace '${JSON.stringify({ rootId: "YOUR_ROOT_ID", path: "relative/project", title: "Your checkout", requestId: importRequest })}'`;
  const pending = connection?.status === "pending", approved = connection?.status === "approved";
  return <section className={s.connection} aria-labelledby="source-connection-title"><header><span className={s.connectionIcon}><Link2 size={20} /></span><div><span className={s.eyebrow}>EXPLICIT OWNER APPROVAL</span><h2 id="source-connection-title">{approved ? "One snapshot. Read-only access." : "Connect your local source"}</h2></div><button className={s.copyIcon} aria-label="Close connection instructions" onClick={onClose}><X size={18} /></button></header>
    {failure ? <Notice failure={failure} onRetry={onRetry} /> : null}
    {!connection ? <div className={s.connectionWaiting}>{busy ? <LoaderCircle size={18} className={s.spinning} /> : <Unplug size={18} />}<p>{busy ? "Creating a public confirmation challenge…" : "The connection was not acknowledged. Retry keeps its request identity."}</p>{!busy ? <button className={s.quietButton} onClick={onRetry}>Retry connection</button> : null}</div> : approved ? <div className={s.connectionApproved}><Check size={19} /><div><strong>Approved for this browser session</strong><p>Import <code>{connection.importId}</code>{connection.viewExpiresAt ? ` · access ends ${dateTime(connection.viewExpiresAt)}` : ""}</p></div><button className={s.quietButton} disabled={busy} onClick={onCancel}><Unplug size={14} />Withdraw view</button></div> : pending ? <><div className={s.confirmation}><div><span className={s.statusDot} /><strong>Waiting for the owner CLI</strong><small>Approval window ends {dateTime(connection.approvalExpiresAt)}</small></div><div><span>COMPARE THIS CONFIRMATION</span><code>{connection.confirmationLabel}</code></div></div><p className={s.connectionIntro}>Use the authenticated owner CLI on the machine that holds your source. Approve the exact import ID and compare the confirmation above before granting this browser access.</p><div className={s.connectionSteps}><div><span>1</span><div><h3>Choose an authorized root and import</h3><CliCommand label="List configured source roots" command="npm run cli -- call list_source_roots '{}'" /><CliCommand label="Import template — replace root ID and relative path" command={importCommand} /><p>Replace <code>YOUR_ROOT_ID</code> and <code>relative/project</code>. Repository paths cannot expand host authority. A repeated request UUID returns its original outcome.</p></div></div><div><span>2</span><div><h3>Choose the saved import ID</h3><CliCommand label="List your source imports" command="npm run cli -- call list_source_workspaces '{}'" /></div></div><div><span>3</span><div><h3>Approve this browser for that snapshot</h3><CliCommand label="Approve one exact snapshot" command={approvalCommand} /><p>Replace <code>&lt;chosen import id&gt;</code>. The challenge is public; the CLI still requires its private owner credential.</p></div></div></div><footer><span><Clock3 size={13} />Only this pending challenge is polled.</span><button className={s.quietButton} disabled={busy} onClick={onRead}><RefreshCw size={13} />Check approval</button><button className={s.quietButton} disabled={busy} onClick={onCancel}>Cancel request</button></footer></> : <div className={s.connectionWaiting}><Clock3 size={20} /><div><h3>{connection.status === "expired" ? "This approval window has ended." : "This connection was withdrawn."}</h3><p>The original connection is retained. Start a new request to approve another source view.</p></div><button className={s.primaryButton} disabled={busy} onClick={onCreate}><Plus size={14} />New connection</button></div>}
  </section>;
}

function SnapshotWorkspace({ importId, summary, refreshToken, accessBlocked, onRefresh }: { importId: string; summary: SourceImportSummary | null; refreshToken: number; accessBlocked: boolean; onRefresh: () => void }) {
  const [view, setView] = useState<SourceWorkspaceView | null>(null), [failure, setFailure] = useState<Failure | null>(null), [reading, setReading] = useState(true);
  const [scopeDenied, setScopeDenied] = useState(false), [selection, setSelection] = useState<Selection | null>(null), [tab, setTab] = useState<DetailTab>("findings");
  const [exporting, setExporting] = useState(false), [exportFailure, setExportFailure] = useState<Failure | null>(null), [exportHash, setExportHash] = useState<string | null>(null);
  const exportController = useRef<AbortController | null>(null), inspectorHeading = useRef<HTMLHeadingElement | null>(null);
  const tabsId = useId();
  useEffect(() => {
    const controller = new AbortController(); setReading(true);
    void api<SourceWorkspaceView>(`${BASE}/${encodeURIComponent(importId)}`, undefined, controller.signal).then(next => {
      if (controller.signal.aborted) return;
      if (next.import.id !== importId) throw new SourceRequestError("The returned snapshot belongs to a different source import.", "SOURCE_RESPONSE_MISMATCH", false);
      setView(next); setFailure(null); setScopeDenied(!next.access.readSource || Date.parse(next.access.expiresAt) <= Date.now());
      if (next.snapshot) {
        const snapshot = next.snapshot;
        setSelection(current => current && snapshot.files.some(file => file.path === current.source.path && file.hash === current.source.hash) ? current : initialSelection(snapshot));
      }
    }).catch(cause => {
      if (controller.signal.aborted) return;
      const error = failureOf(cause); setFailure(error); if (error.denied) setScopeDenied(true);
    }).finally(() => { if (!controller.signal.aborted) setReading(false); });
    return () => controller.abort();
  }, [importId, refreshToken]);
  useEffect(() => {
    if (!view) return;
    const remaining = Date.parse(view.access.expiresAt) - Date.now();
    if (remaining <= 0) { setScopeDenied(true); return; }
    const timer = window.setTimeout(() => { setScopeDenied(true); exportController.current?.abort(); }, Math.min(remaining, 2_147_000_000));
    return () => window.clearTimeout(timer);
  }, [view?.access.expiresAt]);
  const canRead = !!view?.access.readSource && Date.parse(view.access.expiresAt) > Date.now() && !accessBlocked && !scopeDenied;
  const handleDenied = useCallback((error: Failure) => { setScopeDenied(true); setFailure(error); }, []);
  useEffect(() => { if (!canRead) exportController.current?.abort(); return () => exportController.current?.abort(); }, [canRead]);
  const snapshot = view?.snapshot ?? null;
  function select(next: Selection) {
    setSelection(next);
    window.requestAnimationFrame(() => {
      inspectorHeading.current?.focus({ preventScroll: true });
      if (window.matchMedia("(max-width: 1000px)").matches) inspectorHeading.current?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
    });
  }
  function selectNode(node: SourceIntegrationNode) { select({ source: node.evidence.source, nodeId: node.id, riskId: null }); }
  function selectRisk(risk: SourceRiskFinding) { const source = risk.evidence[0]?.source; if (source) select({ source, nodeId: risk.nodeIds[0] ?? null, riskId: risk.id }); }
  async function download() {
    if (!canRead || !snapshot || exporting) return;
    const controller = new AbortController(); exportController.current = controller; setExporting(true); setExportFailure(null);
    try {
      const { value, contentHash } = await readJson(`${BASE}/${encodeURIComponent(importId)}/export`, {}, controller.signal);
      const report = value as SourceSnapshotExport;
      if (!report || report.view?.import.id !== importId || report.view.snapshot?.id !== snapshot.id || !HASH.test(report.contentHash ?? "") || contentHash !== report.contentHash) throw new SourceRequestError("The export did not match the selected snapshot and checksum.", "SOURCE_EXPORT_MISMATCH", false);
      const { contentHash: expected, ...body } = report;
      if (await browserHash(canonicalJson(body)) !== expected) throw new SourceRequestError("The export payload did not match its canonical checksum.", "SOURCE_EXPORT_HASH_MISMATCH", false);
      if (controller.signal.aborted) return;
      const blob = new Blob([JSON.stringify(report, null, 2) + "\n"], { type: "application/json" });
      const url = URL.createObjectURL(blob), anchor = document.createElement("a");
      anchor.href = url; anchor.download = `fracture-source-${importId.slice(0, 8)}.json`; anchor.rel = "noopener"; document.body.appendChild(anchor); anchor.click(); anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000); setExportHash(expected);
    } catch (cause) {
      if (controller.signal.aborted) return;
      const error = failureOf(cause); setExportFailure(error); if (error.denied) setScopeDenied(true);
    } finally { setExporting(false); }
  }
  if (!view) return <section className={s.sourceLoading} aria-busy={reading}>{failure ? <Notice failure={failure} onRetry={onRefresh} /> : <><LoaderCircle className={s.spinning} size={24} /><h2>Opening the exact source revision</h2><p>Verifying saved metadata and this session's read scope.</p></>}</section>;
  if (!snapshot) return <section className={s.emptyCard}><Clock3 size={28} /><span className={s.eyebrow}>{view.import.status.toUpperCase()}</span><h2>{view.import.title}</h2><p>{view.import.status === "pending" ? "This source import has not published a complete snapshot. Refresh saved state after the owner CLI finishes." : "The original import outcome was preserved. Inspect it from the owner CLI before starting a new request."}</p>{view.import.errorCode ? <code>{view.import.errorCode}</code> : null}<button className={s.quietButton} onClick={onRefresh}><RefreshCw size={14} />Refresh saved state</button></section>;
  const risks = snapshot.graph.findings.filter(finding => finding.severity === "risk").length;
  return <>
    {failure ? <Notice failure={failure} onRetry={onRefresh} /> : null}
    {!canRead ? <div className={s.accessClosed} role="status"><LockKeyhole size={19} /><div><strong>Private source reads are locked.</strong><p>The last verified map remains visible in this tab. Refresh or request a new owner-approved view to read file contents.</p></div><button className={s.quietButton} onClick={onRefresh}><RefreshCw size={14} />Check access</button></div> : null}
    <section className={s.snapshotHeader}><div><span className={s.eyebrow}><span className={s.mintDot} />IMMUTABLE SOURCE SNAPSHOT</span><h2>{view.import.title}</h2><p><GitBranch size={13} /><code>{shortHash(snapshot.revisionHash)}</code><span>·</span>Accepted {dateTime(snapshot.createdAt)}<span>·</span>{summary?.access === "owner" ? "Owner scope" : "Approved read-only view"}</p></div><div className={s.snapshotActions}><button className={s.quietButton} disabled={!canRead || exporting} onClick={() => void download()}>{exporting ? <LoaderCircle size={15} className={s.spinning} /> : <ArrowDownToLine size={15} />}{exporting ? "Verifying export…" : "Export snapshot"}</button><small>Includes private source · checksum verified</small></div></section>
    {exportFailure ? <Notice failure={exportFailure} onRetry={() => void download()} /> : null}
    {exportHash ? <div className={s.exportNotice} role="status"><Check size={14} />Export checksum verified <code>{shortHash(exportHash, 18)}</code><CopyButton value={exportHash} label="Copy export checksum" compact /></div> : null}
    <div className={s.metrics}><div><Files size={16} /><span>ACCEPTED FILES</span><strong>{snapshot.files.length}<small>{bytesLabel(snapshot.totalBytes)}</small></strong></div><div><Network size={16} /><span>SOURCE CONNECTIONS</span><strong>{snapshot.graph.edges.length}<small>{snapshot.graph.nodes.length} cited nodes</small></strong></div><div className={s.riskMetric}><ShieldQuestion size={16} /><span>STATIC QUESTIONS</span><strong>{snapshot.graph.findings.length}<small>{risks} risks · {snapshot.graph.findings.length - risks} unverified</small></strong></div><div><Fingerprint size={16} /><span>REVISION BINDING</span><strong className={s.hashMetric}>{shortHash(snapshot.revisionHash)}<small>Exact source bytes</small></strong></div></div>
    <div className={s.workbench}><section className={s.graphPanel}><header className={s.panelHeading}><span className={s.panelIcon}><Waypoints size={18} /></span><div><h3>Follow the payment path</h3><p>Source syntax and supported static inferences.</p></div><span className={s.staticBadge}>STATIC</span></header><SourceGraph graph={snapshot.graph} selection={selection} onSelect={selectNode} /><div className={s.graphFoot}><span><i />Syntax link</span><span><i className={s.dashed} />Inferred connection</span><span><i className={s.dotted} />Unresolved</span><p>{reading ? <><LoaderCircle size={12} className={s.spinning} />Refreshing saved state</> : <><ShieldQuestion size={12} />Runtime evidence is still required</>}</p></div></section><SourceInspector key={`${snapshot.id}:${canRead ? "open" : "locked"}`} importId={importId} snapshot={snapshot} selection={selection} canRead={canRead} headingRef={inspectorHeading} onSelect={select} onDenied={handleDenied} /></div>
    <section className={s.detailPanel}><div className={s.detailTabs} role="tablist" aria-label="Source snapshot details">{DETAIL_TABS.map(({ id, label, Icon }) => <button id={`${tabsId}-${id}`} role="tab" aria-selected={tab === id} aria-controls={`${tabsId}-panel-${id}`} tabIndex={tab === id ? 0 : -1} key={id} onClick={() => setTab(id)} onKeyDown={event => {
      const current = DETAIL_TABS.findIndex(item => item.id === id); let target = current;
      if (event.key === "ArrowRight") target = (current + 1) % DETAIL_TABS.length; else if (event.key === "ArrowLeft") target = (current + DETAIL_TABS.length - 1) % DETAIL_TABS.length; else if (event.key === "Home") target = 0; else if (event.key === "End") target = DETAIL_TABS.length - 1; else return;
      event.preventDefault(); const next = DETAIL_TABS[target]!.id; setTab(next); document.getElementById(`${tabsId}-${next}`)?.focus();
    }}><Icon size={15} />{label}{id === "findings" ? <span>{snapshot.graph.findings.length}</span> : id === "changes" && view.latestChanges && !view.latestChanges.unchanged ? <span>{view.latestChanges.changes.length}</span> : null}</button>)}</div><div className={s.tabContent} role="tabpanel" id={`${tabsId}-panel-${tab}`} aria-labelledby={`${tabsId}-${tab}`} tabIndex={0}>{tab === "findings" ? <Findings findings={snapshot.graph.findings} selected={selection?.riskId ?? null} onSelect={selectRisk} /> : tab === "files" ? <SourceFiles snapshot={snapshot} onSelect={selectNode} /> : tab === "tools" ? <ToolDeclarations snapshot={snapshot} onSelect={source => select({ source, nodeId: null, riskId: null })} /> : tab === "coverage" ? <Coverage snapshot={snapshot} /> : <SourceChanges importId={importId} receipt={view.latestChanges} checks={view.changeChecks} snapshot={snapshot} onSelect={selectNode} onRefresh={onRefresh} />}</div></section>
    <details className={s.manifestDetails}><summary><Fingerprint size={14} />Snapshot identity and integrity<span>SHA256</span><ChevronDown size={14} /></summary><div><HashLine label="Revision" value={snapshot.revisionHash} /><HashLine label="Manifest" value={snapshot.manifestHash} /><HashLine label="Tool declarations" value={snapshot.tools.hash} /><HashLine label="Snapshot" value={snapshot.id} /><p>Read access ends {dateTime(view.access.expiresAt)}. This map contains no runtime observations.</p></div></details>
  </>;
}

function adapterHint(adapter: NonNullable<SourceIntegrationNode["adapter"]>): string {
  return adapter === "apimatic_context" ? "paypal import syntax · installation unverified" : adapter === "paypal_server_sdk" ? "@paypal/paypal-server-sdk import syntax · installation unverified" : adapter === "legacy_paypal" ? "Legacy PayPal import syntax" : adapter === "raw_http" ? "Raw HTTP call syntax" : "Unresolved receiver";
}

function initialSelection(snapshot: SourceWorkspaceSnapshot): Selection | null {
  const risk = snapshot.graph.findings[0]; if (risk?.evidence[0]) return { source: risk.evidence[0].source, riskId: risk.id, nodeId: risk.nodeIds[0] ?? null };
  const node = snapshot.graph.nodes.find(item => item.kind === "provider_operation") ?? snapshot.graph.nodes[0];
  return node ? { source: node.evidence.source, nodeId: node.id, riskId: null } : null;
}

function laneFor(kind: IntegrationNodeKind): number {
  return ["file", "module", "function", "route", "commerce_intent", "declared_tool"].includes(kind) ? 0 : ["provider_operation", "identity", "outbound_destination"].includes(kind) ? 1 : ["state_write", "reconciliation", "webhook"].includes(kind) ? 2 : 3;
}
const LANES = ["INTENT & ENTRY", "PROVIDER BOUNDARY", "STATE & RECOVERY", "FULFILLMENT"];
function SourceGraph({ graph, selection, onSelect }: { graph: SourceIntegrationGraph; selection: Selection | null; onSelect: (node: SourceIntegrationNode) => void }) {
  const [display, setDisplay] = useState<"map" | "list">("map"), [query, setQuery] = useState(""), [riskOnly, setRiskOnly] = useState(false), [page, setPage] = useState(0);
  const deferredQuery = useDeferredValue(query.toLowerCase());
  const riskIds = useMemo(() => new Set(graph.findings.flatMap(finding => [...finding.nodeIds])), [graph.findings]);
  const filtered = useMemo(() => graph.nodes.filter(node => (!riskOnly || riskIds.has(node.id)) && (!deferredQuery || `${node.label} ${node.kind} ${node.evidence.source.path}`.toLowerCase().includes(deferredQuery))), [graph.nodes, riskOnly, riskIds, deferredQuery]);
  const mapData = useMemo(() => {
    const score = (node: SourceIntegrationNode) => riskIds.has(node.id) ? 0 : ["provider_operation", "fulfillment", "webhook", "commerce_intent", "reconciliation"].includes(node.kind) ? 1 : node.kind === "function" ? 2 : node.kind === "state_write" || node.kind === "identity" ? 3 : 4;
    const lanes: SourceIntegrationNode[][] = [[], [], [], []];
    for (const node of [...filtered].sort((a, b) => score(a) - score(b) || a.evidence.source.path.localeCompare(b.evidence.source.path) || a.evidence.source.startOffset - b.evidence.source.startOffset)) { const lane = lanes[laneFor(node.kind)]!; if (lane.length < 5) lane.push(node); }
    const positions = new globalThis.Map(lanes.flatMap((lane, column) => lane.map((node, row) => [node.id, { node, column, row, x: 125 + column * 250, y: 100 + row * 96 }] as const)));
    const edges = graph.edges.filter(edge => positions.has(edge.from) && positions.has(edge.to)).slice(0, 70);
    return { lanes, positions, edges, height: Math.max(3, ...lanes.map(lane => lane.length)) * 96 + 74 };
  }, [filtered, graph.edges, riskIds]);
  const maxPage = Math.max(0, Math.ceil(filtered.length / 32) - 1), visiblePage = Math.min(page, maxPage);
  return <><div className={s.graphToolbar}><label><Search size={14} /><span className="sr-only">Search graph nodes and source paths</span><input value={query} onChange={event => { setQuery(event.target.value); setPage(0); }} placeholder="Find a call, state, or file…" /></label><button className={`${s.filterButton}${riskOnly ? ` ${s.filterActive}` : ""}`} aria-pressed={riskOnly} onClick={() => { setRiskOnly(value => !value); setPage(0); }}><ShieldQuestion size={13} />Findings</button><div className={s.viewToggle} aria-label="Graph display"><button aria-pressed={display === "map"} aria-label="Show source map" onClick={() => setDisplay("map")}><Map size={15} /></button><button aria-pressed={display === "list"} aria-label="Show accessible source list" onClick={() => setDisplay("list")}><List size={16} /></button></div></div>
    {filtered.length ? display === "map" ? <><div className={s.mapScroll} tabIndex={0} aria-label="Source graph, scroll horizontally for all pathways"><div className={s.mapSurface} style={{ height: mapData.height } as CSSProperties}><svg className={s.graphEdges} viewBox={`0 0 1000 ${mapData.height}`} preserveAspectRatio="none" aria-hidden="true"><defs><pattern id="source-map-dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".8" fill="#444c573d" /></pattern></defs><rect width="1000" height={mapData.height} fill="url(#source-map-dots)" />{mapData.edges.map(edge => {
      const a = mapData.positions.get(edge.from)!, b = mapData.positions.get(edge.to)!;
      const forward = b.column > a.column, same = a.column === b.column;
      const x1 = a.x + (forward || same ? 100 : -100), x2 = b.x + (forward ? -100 : 100), curve = same ? 135 : Math.max(35, Math.abs(x2 - x1) * .42);
      const path = `M${x1},${a.y} C${x1 + (forward || same ? curve : -curve)},${a.y} ${x2 + (forward ? -curve : curve)},${b.y} ${x2},${b.y}`;
      const related = edge.from === selection?.nodeId || edge.to === selection?.nodeId;
      return <path key={edge.id} d={path} fill="none" stroke={related ? "#9cd9c5" : "#53616b"} opacity={related ? .9 : .5} strokeWidth={related ? 2 : 1.15} strokeDasharray={edge.confidence === "inferred" ? "5 5" : edge.confidence === "unresolved" ? "2 5" : undefined} />;
    })}</svg>{mapData.lanes.map((lane, column) => <div key={column}><span className={s.laneTitle} style={{ left: `${2.5 + column * 25}%` }}><i className={s[`lane${column}`]} />{LANES[column]}</span>{lane.map((node, row) => <button className={`${s.mapNode} ${s[`lane${column}`]}${riskIds.has(node.id) ? ` ${s.mapRisk}` : ""}${selection?.nodeId === node.id ? ` ${s.mapSelected}` : ""}`} style={{ left: `${2.5 + column * 25}%`, top: 62 + row * 96 }} key={node.id} aria-pressed={selection?.nodeId === node.id} aria-label={`${KIND_LABELS[node.kind]}: ${node.label}. ${spanLabel(node.evidence.source)}. ${node.confidence}. Open cited source.`} onClick={() => onSelect(node)}><span><i />{KIND_LABELS[node.kind]}{riskIds.has(node.id) ? <TriangleAlert size={11} /> : null}</span><strong>{node.label}</strong><small>{node.evidence.source.path.split("/").pop()}<b>:{node.evidence.source.startLine}</b></small></button>)}</div>)}</div></div><div className={s.graphCount}><span>{mapData.positions.size} of {filtered.length} matching nodes shown</span><button onClick={() => setDisplay("list")}>Open full source list<ArrowRight size={12} /></button></div></> : <div className={s.nodeList}>{filtered.slice(visiblePage * 32, (visiblePage + 1) * 32).map(node => <button key={node.id} onClick={() => onSelect(node)} aria-pressed={selection?.nodeId === node.id}><span className={`${s.nodeDot} ${s[`lane${laneFor(node.kind)}`]}`} /><span><strong>{node.label}</strong><small>{KIND_LABELS[node.kind]} · {spanLabel(node.evidence.source)}</small></span><span className={s.confidence}>{node.confidence}</span><ChevronRight size={14} /></button>)}<Pager page={visiblePage} totalPages={maxPage + 1} onPage={setPage} label="graph nodes" /></div> : <div className={s.quietEmpty}><Search size={24} /><h4>No matching source nodes</h4><p>Try another call, file path, or clear the risk filter.</p><button className={s.quietButton} onClick={() => { setQuery(""); setRiskOnly(false); }}>Clear filters</button></div>}
  </>;
}

function Pager({ page, totalPages, onPage, label }: { page: number; totalPages: number; onPage: (page: number) => void; label: string }) {
  if (totalPages <= 1) return null;
  return <nav className={s.pager} aria-label={`${label} pages`}><span>Page {page + 1} of {totalPages}</span><button className={s.quietButton} disabled={page === 0} aria-label={`Previous ${label}`} onClick={() => onPage(page - 1)}><ChevronLeft size={14} />Previous</button><button className={s.quietButton} disabled={page + 1 >= totalPages} aria-label={`Next ${label}`} onClick={() => onPage(page + 1)}>Next<ChevronRight size={14} /></button></nav>;
}

function SourceInspector({ importId, snapshot, selection, canRead, headingRef, onSelect, onDenied }: { importId: string; snapshot: SourceWorkspaceSnapshot; selection: Selection | null; canRead: boolean; headingRef: { current: HTMLHeadingElement | null }; onSelect: (selection: Selection) => void; onDenied: (failure: Failure) => void }) {
  const [file, setFile] = useState<SourceFileView | null>(null), [failure, setFailure] = useState<Failure | null>(null), [loading, setLoading] = useState(false), [retry, setRetry] = useState(0);
  const [display, setDisplay] = useState<"source" | "evidence">("source");
  const path = selection?.source.path ?? "", expectedHash = selection?.source.hash ?? "";
  useEffect(() => {
    if (!path || !expectedHash || !canRead) return;
    const controller = new AbortController(); setLoading(true); setFailure(null); setFile(current => current?.path === path && current.hash === expectedHash ? current : null);
    const params = new URLSearchParams({ path, hash: expectedHash });
    void api<SourceFileView>(`${BASE}/${encodeURIComponent(importId)}/files?${params}`, undefined, controller.signal).then(async next => {
      if (controller.signal.aborted) return;
      if (next.importId !== importId || next.snapshotId !== snapshot.id || next.path !== path || next.hash !== expectedHash || typeof next.content !== "string" || new TextEncoder().encode(next.content).length !== next.bytes || await browserHash(next.content) !== expectedHash) throw new SourceRequestError("The returned file did not match this snapshot's exact content hash.", "SOURCE_FILE_HASH_MISMATCH", false);
      if (!controller.signal.aborted) setFile(next);
    }).catch(cause => {
      if (controller.signal.aborted) return;
      const error = failureOf(cause); setFailure(error); if (error.denied) { setFile(null); onDenied(error); }
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [importId, snapshot.id, path, expectedHash, canRead, retry, onDenied]);
  const nodeById = useMemo(() => new globalThis.Map(snapshot.graph.nodes.map(node => [node.id, node])), [snapshot.graph.nodes]);
  const node = selection?.nodeId ? nodeById.get(selection.nodeId) : null;
  const risk = selection?.riskId ? snapshot.graph.findings.find(item => item.id === selection.riskId) : null;
  const connections = useMemo(() => selection?.nodeId ? snapshot.graph.edges.filter(edge => edge.from === selection.nodeId || edge.to === selection.nodeId).slice(0, 12).map(edge => ({ edge, other: nodeById.get(edge.from === selection.nodeId ? edge.to : edge.from) })).filter(item => !!item.other) : [], [selection?.nodeId, snapshot.graph.edges, nodeById]);
  return <aside className={s.inspector} aria-label="Exact source inspector"><header><span className={s.eyebrow}><FileSearch size={13} />SOURCE CITATION</span><h3 ref={headingRef} tabIndex={-1}>{path || "Select a source node"}</h3>{selection ? <div className={s.citationCoordinates}><code>L{selection.source.startLine}:{selection.source.startColumn}—{selection.source.endLine}:{selection.source.endColumn}</code><CopyButton value={`${spanLabel(selection.source)} sha256:${expectedHash}`} label="Copy source citation" compact /></div> : null}</header>
    <div className={s.inspectorToolbar}><div><button aria-pressed={display === "source"} onClick={() => setDisplay("source")}><Code2 size={13} />Source</button><button aria-pressed={display === "evidence"} onClick={() => setDisplay("evidence")}><Fingerprint size={13} />Evidence</button></div>{file && canRead ? <span><Check size={11} />Hash matched</span> : <span><LockKeyhole size={11} />Private</span>}</div>
    {!selection ? <div className={s.inspectorEmpty}><FileSearch size={30} /><h4>The proof is in the source.</h4><p>Select a node, risk or file to open its exact cited bytes.</p></div> : display === "evidence" ? <div className={s.evidenceBody}>{risk ? <><span className={`${s.riskBadge} ${risk.severity === "risk" ? s.rose : s.amber}`}>{risk.severity === "risk" ? <TriangleAlert size={12} /> : <CircleHelp size={12} />}{risk.severity}</span><h4>{risk.title}</h4><p>{risk.explanation}</p><div className={s.evidenceRequired}><ShieldQuestion size={15} />Runtime evidence required</div></> : node ? <><span className={s.nodeKind}>{KIND_LABELS[node.kind]}</span><h4>{node.label}</h4><p>{node.confidence === "syntax" ? "This syntax appears at the cited span in the accepted source." : node.confidence === "inferred" ? "This connection is a static inference from the cited syntax. It has not been observed at runtime." : "The target or behavior could not be resolved statically."}</p>{node.adapter ? <dl><div><dt>Syntax recognition</dt><dd>{adapterHint(node.adapter)}</dd></div>{node.identity ? <div><dt>Identity syntax</dt><dd>{node.identity}</dd></div> : null}</dl> : null}</> : <><h4>Declared source evidence</h4><p>This citation is bound to an exact source revision. Its content is untrusted data.</p></>}
      <dl><div><dt>Evidence type</dt><dd>{node?.evidence.type ?? (risk?.evidence[0]?.type ?? "manifest")}</dd></div><div><dt>UTF-16 range</dt><dd>{selection.source.startOffset}–{selection.source.endOffset}</dd></div><div><dt>UTF-8 bytes</dt><dd>{selection.source.startByte}–{selection.source.endByte}</dd></div><div><dt>Source SHA256</dt><dd className={s.fullHash}>{expectedHash}</dd></div></dl>{connections.length ? <div className={s.relatedNodes}><h5>Source connections</h5>{connections.map(({ edge, other }) => other ? <button key={edge.id} onClick={() => onSelect({ source: other.evidence.source, nodeId: other.id, riskId: null })}><span><small>{edge.relation.replaceAll("_", " ")} · {edge.confidence}</small><strong>{other.label}</strong></span><ArrowUpRight size={13} /></button> : null)}</div> : null}</div> : !canRead ? <div className={s.inspectorEmpty}><LockKeyhole size={28} /><h4>Read scope is closed.</h4><p>The citation remains attached to the map. Its private source text has been removed from this view.</p></div> : <>{failure ? <Notice failure={failure} onRetry={() => setRetry(value => value + 1)} /> : null}{loading && !file ? <div className={s.inspectorEmpty} role="status"><LoaderCircle size={24} className={s.spinning} /><h4>Reading exact source bytes</h4><p>Checking the file hash before display.</p></div> : file && file.path === path && file.hash === expectedHash ? <CodePreview key={`${expectedHash}:${selection.source.startOffset}:${selection.source.endOffset}`} content={file.content} source={selection.source} /> : !loading ? <div className={s.inspectorEmpty}><FileCode2 size={27} /><h4>Source text is unavailable.</h4><p>The saved citation is retained. Retry after checking read access.</p></div> : null}</>}
    <footer><Fingerprint size={12} /><code>{shortHash(expectedHash, 20)}</code><span>End offsets are exclusive</span></footer></aside>;
}

function CodePreview({ content, source }: { content: string; source: SourceSpan }) {
  const lines = useMemo(() => content.split("\n"), [content]);
  const offsets = useMemo(() => { let offset = 0; return lines.map(line => { const start = offset; offset += line.length + 1; return start; }); }, [lines]);
  const [start, setStart] = useState(() => Math.max(0, source.startLine - 5));
  const end = Math.min(lines.length, start + 100);
  return <div className={s.codePreview}><div className={s.codeRange}><span>Lines {start + 1}–{end} of {lines.length}</span><span>Exact UTF-8 source</span></div><div className={s.codeScroll} tabIndex={0} aria-label={`Cited source, ${source.path}, lines ${start + 1} to ${end}`}><pre>{lines.slice(start, end).map((raw, index) => {
    const lineIndex = start + index, line = raw.replace(/\r$/, ""), offset = offsets[lineIndex]!;
    const markedStart = Math.max(0, Math.min(line.length, source.startOffset - offset)), markedEnd = Math.max(0, Math.min(line.length, source.endOffset - offset));
    const highlighted = markedEnd > markedStart;
    return <span className={`${s.codeLine}${highlighted ? ` ${s.citedLine}` : ""}`} key={lineIndex}><span className={s.lineNumber} aria-hidden="true">{lineIndex + 1}</span><code>{highlighted ? <>{line.slice(0, markedStart)}<mark>{line.slice(markedStart, markedEnd)}</mark>{line.slice(markedEnd)}</> : line || " "}</code></span>;
  })}</pre></div>{lines.length > 100 ? <div className={s.codePaging}><button className={s.quietButton} disabled={start === 0} onClick={() => setStart(value => Math.max(0, value - 80))}><ChevronLeft size={13} />Earlier lines</button><button className={s.quietButton} disabled={end >= lines.length} onClick={() => setStart(value => Math.min(Math.max(0, lines.length - 100), value + 80))}>Later lines<ChevronRight size={13} /></button></div> : null}<div className={s.codeSafety}><ShieldCheck size={12} />Displayed as text. Never executed.</div></div>;
}

function Findings({ findings, selected, onSelect }: { findings: readonly SourceRiskFinding[]; selected: string | null; onSelect: (finding: SourceRiskFinding) => void }) {
  const [filter, setFilter] = useState<"all" | "risk" | "unverified">("all"), [page, setPage] = useState(0);
  const filtered = findings.filter(finding => filter === "all" || finding.severity === filter);
  const totalPages = Math.max(1, Math.ceil(filtered.length / 9)), current = Math.min(page, totalPages - 1);
  return <><div className={s.sectionHeading}><div><span className={s.eyebrow}>QUESTIONS WORTH REPRODUCING</span><h3>Static findings, with the source attached.</h3><p>These are review leads. A source pattern is not a reproduced payment defect.</p></div><label className={s.filterSelect}><span className="sr-only">Filter static findings</span><select value={filter} onChange={event => { setFilter(event.target.value as typeof filter); setPage(0); }}><option value="all">All findings ({findings.length})</option><option value="risk">Risks</option><option value="unverified">Unverified</option></select><ChevronDown size={13} /></label></div>{filtered.length ? <div className={s.findingGrid}>{filtered.slice(current * 9, (current + 1) * 9).map(finding => <button className={`${s.findingCard}${selected === finding.id ? ` ${s.findingSelected}` : ""}`} key={finding.id} onClick={() => onSelect(finding)} aria-pressed={selected === finding.id}><div><span className={`${s.riskBadge} ${finding.severity === "risk" ? s.rose : s.amber}`}>{finding.severity === "risk" ? <TriangleAlert size={11} /> : <CircleHelp size={11} />}{finding.severity}</span>{finding.providerFactId ? <span className={s.factTag}>{finding.providerFactId} unresolved</span> : <ArrowUpRight size={14} />}</div><h4>{finding.title}</h4><p>{finding.explanation}</p><span className={s.findingCitation}><FileCode2 size={12} /><code>{finding.evidence[0] ? spanLabel(finding.evidence[0].source) : "Source citation"}</code><ChevronRight size={13} /></span></button>)}</div> : <div className={s.quietEmpty}><ShieldQuestion size={28} /><h4>{findings.length ? "No findings in this category" : "No named risks were recognized."}</h4><p>Static coverage is bounded. Runtime verification and adapter qualification remain separate.</p></div>}<Pager page={current} totalPages={totalPages} onPage={setPage} label="static findings" /></>;
}

function SourceFiles({ snapshot, onSelect }: { snapshot: SourceWorkspaceSnapshot; onSelect: (node: SourceIntegrationNode) => void }) {
  const [query, setQuery] = useState(""), [page, setPage] = useState(0), deferred = useDeferredValue(query.toLowerCase());
  const files = snapshot.files.filter(file => file.path.toLowerCase().includes(deferred));
  const nodes = useMemo(() => new globalThis.Map(snapshot.graph.nodes.filter(node => node.kind === "file").map(node => [node.evidence.source.path, node])), [snapshot.graph.nodes]);
  const totalPages = Math.max(1, Math.ceil(files.length / 30)), current = Math.min(page, totalPages - 1);
  return <><div className={s.sectionHeading}><div><span className={s.eyebrow}>CONTENT MANIFEST</span><h3>{snapshot.files.length} files. Exact accepted bytes.</h3><p>Hidden files, secrets, dependencies and generated trees were excluded.</p></div><label className={s.fileSearch}><Search size={14} /><span className="sr-only">Filter source files</span><input value={query} onChange={event => { setQuery(event.target.value); setPage(0); }} placeholder="Filter source paths…" /></label></div><div className={s.fileList}>{files.slice(current * 30, (current + 1) * 30).map(file => <button key={file.path} onClick={() => { const node = nodes.get(file.path); if (node) onSelect(node); }}><FileCode2 size={17} /><span><strong>{file.path}</strong><small>{file.language} · {bytesLabel(file.bytes)}</small></span><code title={file.hash}>{shortHash(file.hash, 16)}</code><ArrowUpRight size={14} /></button>)}</div>{!files.length ? <div className={s.quietEmpty}><Search size={24} /><h4>No matching files</h4><p>Try a different relative source path.</p></div> : null}<Pager page={current} totalPages={totalPages} onPage={setPage} label="source files" /><details className={s.exclusions}><summary>{snapshot.exclusions.length} excluded paths<ChevronDown size={13} /></summary><ul>{snapshot.exclusions.slice(0, 100).map(exclusion => <li key={exclusion.path}><code>{exclusion.path}</code><span>{exclusion.reason.replaceAll("_", " ")}</span></li>)}</ul>{snapshot.exclusions.length > 100 ? <p>The first 100 exclusions are shown. The complete manifest is in the private export.</p> : null}</details></>;
}

function ToolDeclarations({ snapshot, onSelect }: { snapshot: SourceWorkspaceSnapshot; onSelect: (source: SourceSpan) => void }) {
  const [page, setPage] = useState(0), totalPages = Math.max(1, Math.ceil(snapshot.tools.tools.length / 12));
  const current = Math.min(page, totalPages - 1);
  return <><div className={s.sectionHeading}><div><span className={s.eyebrow}>INSPECT BEFORE EXECUTION</span><h3>Commands are declarations.</h3><p>These scripts and destinations came from untrusted source. None were executed or contacted.</p></div><span className={s.staticBadge}><LockKeyhole size={12} />EXECUTION DISABLED</span></div>{snapshot.tools.tools.length ? <div className={s.toolGrid}>{snapshot.tools.tools.slice(current * 12, (current + 1) * 12).map(tool => <article className={s.toolCard} key={tool.id}><header><SquareTerminal size={18} /><div><h4>{tool.name}</h4><span>{tool.kind.replaceAll("_", " ")}</span></div><span className={s.notExecuted}>Not executed</span></header>{tool.shellSyntax ? <p><TriangleAlert size={12} />Contains shell syntax</p> : null}<div className={s.origins}>{tool.outboundOrigins.length ? tool.outboundOrigins.map(origin => <code key={origin}>{origin}</code>) : <span>No literal outbound origin recognized</span>}</div><HashLine label="Command hash" value={tool.commandHash} /><button className={s.textButton} onClick={() => onSelect(tool.source)}><FileCode2 size={13} />Inspect declaration<ArrowUpRight size={13} /></button></article>)}</div> : <div className={s.quietEmpty}><SquareTerminal size={26} /><h4>No supported command declarations found</h4><p>Unrecognized build systems remain outside this tool manifest.</p></div>}<Pager page={current} totalPages={totalPages} onPage={setPage} label="declarations" /><div className={s.dependencySummary}><div><Files size={16} /><span><strong>{snapshot.tools.dependencyManifests.length} dependency manifests</strong><small>Declarations retained; dependencies not installed.</small></span></div><div><Fingerprint size={16} /><span><strong>{snapshot.tools.lockfiles.length} lockfiles</strong><small>Exact file hashes retained in the tool manifest.</small></span></div></div></>;
}

function Coverage({ snapshot }: { snapshot: SourceWorkspaceSnapshot }) {
  return <><div className={s.sectionHeading}><div><span className={s.eyebrow}>WHAT THE MAP CAN SAY</span><h3>Coverage has a boundary.</h3><p>AST parsing describes source syntax. It does not establish runtime behavior or provider guarantees.</p></div></div><div className={s.coverageGrid}>{snapshot.graph.coverage.map(item => <article key={item.language}><header><Braces size={19} /><h4>{item.language}</h4><span className={item.status === "parsed" ? s.parsedTag : s.partialTag}>{item.status === "parsed" ? "AST parsed" : item.status}</span></header><strong>{item.parsedFiles}<small> / {item.files} files inspected</small></strong><ul>{item.limitations.map(limitation => <li key={limitation}>{limitation}</li>)}</ul></article>)}</div><div className={s.limitations}><h4><CircleHelp size={16} />Interpretation limits</h4><ul>{snapshot.graph.limitations.map(limitation => <li key={limitation}>{limitation}</li>)}</ul></div><details className={s.executionGate}><summary><LockKeyhole size={16} /><span>Arbitrary source execution is gated</span><span className={s.staticBadge}>STATIC ONLY</span><ChevronDown size={14} /></summary><p>A snapshot is an input to a future qualified adapter. It grants no code-execution or payment authority.</p><ol>{snapshot.execution.requiredGates.map(gate => <li key={gate}>{gate}</li>)}</ol></details></>;
}

function SourceChanges({ importId, receipt: latestReceipt, checks, snapshot, onSelect, onRefresh }: {
  importId: string;
  receipt: SourceChangeReceipt | null;
  checks: SourceWorkspaceView["changeChecks"];
  snapshot: SourceWorkspaceSnapshot;
  onSelect: (node: SourceIntegrationNode) => void;
  onRefresh: () => void;
}) {
  const [requestId] = useState(() => crypto.randomUUID());
  const [page, setPage] = useState(0), [selectedCheckId, setSelectedCheckId] = useState<string | null>(null);
  const receipt = checks.find(check => check.id === selectedCheckId && check.status === "ready")?.receipt ?? latestReceipt;
  const historical = !!receipt && receipt.receiptHash !== latestReceipt?.receiptHash;
  const latestCheck = checks[0];
  const newerIncomplete = latestCheck && latestCheck.status !== "ready" && (!latestReceipt || Date.parse(latestCheck.createdAt) >= Date.parse(latestReceipt.checkedAt));
  const command = `npm run cli -- call check_source_changes '${JSON.stringify({ importId, requestId })}'`;
  const totalPages = Math.max(1, Math.ceil((receipt?.changes.length ?? 0) / 24)), current = Math.min(page, totalPages - 1);
  const files = useMemo(() => new globalThis.Map(snapshot.graph.nodes.filter(node => node.kind === "file").map(node => [node.evidence.source.path, node])), [snapshot.graph.nodes]);
  return <>
    <div className={s.sectionHeading}>
      <div>
        <span className={s.eyebrow}>{historical ? "SELECTED COMPLETED OBSERVATION" : "LAST COMPLETED OBSERVATION"}</span>
        <h3>{receipt ? receipt.unchanged ? "Included source matched at this check." : `${receipt.changes.length} changes in this completed check.` : "Has the local source changed?"}</h3>
        <p>{receipt ? `Observed ${dateTime(receipt.checkedAt)}. This is a dated receipt, not a claim about the current filesystem.` : "Run a source check locally, then refresh this view to read its saved outcome."}</p>
      </div>
      <button className={s.quietButton} onClick={onRefresh}><RefreshCw size={14} />Refresh checks</button>
    </div>
    {newerIncomplete ? <div className={s.checkWarning} role="status">
      {latestCheck.status === "pending" ? <Clock3 size={19} /> : <TriangleAlert size={19} />}
      <div>
        <strong>{latestCheck.status === "pending" ? "A newer source check is not complete." : "The newer source check was interrupted."}</strong>
        <p>Started {dateTime(latestCheck.createdAt)}. {latestReceipt ? "The completed receipt below predates this unfinished observation." : "No completed source comparison is available."}</p>
        {latestCheck.errorCode ? <code>{latestCheck.errorCode}</code> : null}
      </div>
    </div> : null}
    {checks.length ? <details className={s.checkHistory} open={!!newerIncomplete}>
      <summary><Clock3 size={14} />{checks.length} retained source checks<span>Newest first</span><ChevronDown size={13} /></summary>
      <ol>{checks.map(check => <li key={check.id}>
        <span className={`${s.checkStatus} ${check.status === "ready" ? s.checkReady : s.checkIncomplete}`}>{check.status === "ready" ? <Check size={12} /> : <Clock3 size={12} />}{check.status}</span>
        <div><strong>{dateTime(check.createdAt)}</strong><code title={check.requestId}>Request {shortHash(check.requestId, 18)}</code>{check.errorCode ? <small>{check.errorCode}</small> : null}</div>
        {check.receipt && check.status === "ready" ? <button className={s.textButton} onClick={() => { setSelectedCheckId(check.id); setPage(0); }} aria-pressed={receipt?.receiptHash === check.receipt.receiptHash}>Inspect receipt<ArrowRight size={12} /></button> : <span className={s.checkMissing}>No completed receipt</span>}
      </li>)}</ol>
    </details> : null}
    {historical ? <button className={s.textButton} onClick={() => { setSelectedCheckId(null); setPage(0); }}><ArrowRight size={13} />Return to the latest completed receipt</button> : null}
    <CliCommand label="Check the original authorized source from the owner CLI" command={command} />
    {receipt ? <>
      <div className={s.changeSummary}>
        <span><i className={s.addedDot} />{receipt.changes.filter(change => change.kind === "added").length} added</span>
        <span><i className={s.modifiedDot} />{receipt.changes.filter(change => change.kind === "modified").length} modified</span>
        <span><i className={s.deletedDot} />{receipt.changes.filter(change => change.kind === "deleted").length} deleted</span>
        {receipt.exclusionsChanged ? <span>Exclusion manifest changed</span> : null}
      </div>
      <div className={s.changesList}>{receipt.changes.slice(current * 24, (current + 1) * 24).map(change => <article key={change.path}>
        <header><span className={`${s.changeKind} ${s[change.kind]}`}>{change.kind}</span><code>{change.path}</code>{change.beforeHash && files.has(change.path) ? <button className={s.textButton} onClick={() => onSelect(files.get(change.path)!)}>Read snapshot<ArrowUpRight size={13} /></button> : null}</header>
        <div><span>Before</span><code>{change.beforeHash ?? "No snapshot file"}</code><small>{change.beforeBytes === null ? "—" : bytesLabel(change.beforeBytes)}</small></div>
        <div><span>After</span><code>{change.afterHash ?? "Deleted from source"}</code><small>{change.afterBytes === null ? "—" : bytesLabel(change.afterBytes)}</small></div>
      </article>)}</div>
      {receipt.unchanged ? <div className={s.unchanged}><Check size={20} /><div><strong>Included file bytes were unchanged at {dateTime(receipt.checkedAt)}.</strong><p>{newerIncomplete ? "The newer incomplete check does not refresh this observation." : "The baseline was preserved. Nothing was executed."}</p></div></div> : null}
      <Pager page={current} totalPages={totalPages} onPage={setPage} label="source changes" />
      <div className={s.receiptHashes}><HashLine label="Baseline revision" value={receipt.baselineRevisionHash} /><HashLine label="Checked revision" value={receipt.currentRevisionHash} /><HashLine label="Receipt" value={receipt.receiptHash} /></div>
    </> : <div className={s.quietEmpty}><GitCompareArrows size={28} /><h4>No completed source check yet</h4><p>A local check records exact added, changed and deleted hashes. Pending and interrupted attempts remain visible above.</p></div>}
  </>;
}
