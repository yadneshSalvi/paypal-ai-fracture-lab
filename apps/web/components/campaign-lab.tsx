"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import Link from "next/link";
import {
  Activity, ArrowDownToLine, ArrowRight, ArrowUpRight, Check,
  ChevronDown, ChevronRight, CircleHelp, Clock3, Copy,
  FileCheck2, Fingerprint, FlaskConical, GitBranch, Layers3, Link2,
  LoaderCircle, LockKeyhole, Minimize2, Pause, Play, Plus, RefreshCw,
  ScanLine, ShieldCheck, Square, TriangleAlert, X,
} from "lucide-react";
import type { ApiEnvelope, ApiFailure, Revision, Verdict } from "@fracture/contracts";
import type {
  CampaignCaseDTO, CampaignLabDTO, CampaignStatus, FaultComponent,
} from "../../../packages/contracts/src/campaign-lab";
import { AppShell, LoadingWorkspace } from "./app-shell";
import { dateLabel, money, shortId, SourceChip } from "./primitives";
import { useWorkspace } from "./workspace-provider";
import s from "./campaign-lab.module.css";

// Browser-only labels. The recipe executor and its server dependencies stay out of this bundle.
const COMPONENTS: Record<FaultComponent, { title: string; short: string }> = {
  lost_capture_answer: { title: "Lose the committed capture answer", short: "Lost answer" },
  malformed_capture_answer: { title: "Return a malformed capture answer", short: "Malformed answer" },
  unavailable_reread: { title: "Make the original reread unavailable", short: "Reread unavailable" },
  never_sent_auth: { title: "Refuse authentication before dispatch", short: "Authentication refused" },
  capture_pending: { title: "Keep the capture pending", short: "Capture pending" },
  harness_denial: { title: "Intervene at the lab boundary", short: "Lab boundary" },
  customer_retry: { title: "Let the customer retry the same purchase", short: "Customer retry" },
};
const SCENARIOS: { id: string; title: string; family: string; description: string; components: FaultComponent[] }[] = [
  { id: "S0", title: "The answer vanished", family: "Unknown outcome", description: "The capture commits. Its response disappears. The customer retries.", components: ["lost_capture_answer", "customer_retry"] },
  { id: "S3", title: "Now the reread is gone", family: "Unknown outcome", description: "Lose the capture answer and make its authoritative reread unavailable.", components: ["lost_capture_answer", "unavailable_reread", "customer_retry"] },
  { id: "S4", title: "Never sent", family: "Pre-dispatch", description: "Authentication refuses the request before any capture is dispatched.", components: ["never_sent_auth"] },
  { id: "S5", title: "Success, unreadable", family: "Unknown outcome", description: "A committed capture returns a malformed answer instead of usable JSON.", components: ["malformed_capture_answer", "customer_retry"] },
  { id: "S10", title: "The boundary intervenes", family: "Harness neutrality", description: "The lab refuses the dispatch. Target behavior remains unproven.", components: ["harness_denial"] },
  { id: "A4", title: "Pending is not paid", family: "Payment lifecycle", description: "The capture is pending. Check whether the download waits.", components: ["capture_pending"] },
];
const ACTIVE = new Set<CampaignStatus>(["queued", "running", "waiting"]);
const TERMINAL_RUNS = new Set(["completed", "inconclusive", "failed_infrastructure", "cancelled_reconciled", "cancelled_uncertain"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SEED = /^[a-zA-Z0-9:_-]{1,100}$/;
type Tone = "rose" | "mint" | "amber" | "violet" | "muted";
type CommandKind = "create" | "minimize" | "resume" | "cancel";
type CommandPayload = Record<string, unknown> & { requestId: string };
interface SavedCommand {
  version: 1;
  sessionId: string;
  kind: CommandKind;
  endpoint: string;
  payload: CommandPayload;
  phase: "uncertain" | "pending" | "rejected";
  message: string;
  code: string | null;
  campaignId: string | null;
  resultCampaignId: string | null;
}
interface MatrixRow { key: string; title: string; scenarioId: string; components: FaultComponent[]; cases: CampaignCaseDTO[] }
type CheckResult = NonNullable<CampaignCaseDTO["result"]>["checks"][number];

class CampaignRequestError extends Error {
  constructor(message: string, readonly code: string, readonly rejected = false) { super(message); }
}
async function request<T>(path: string, payload?: CommandPayload, signal?: AbortSignal): Promise<T> {
  const controller = new AbortController();
  let timedOut = false;
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  const timeout = window.setTimeout(() => { timedOut = true; controller.abort(); }, 25000);
  try {
    const response = await fetch(path, {
      method: payload ? "POST" : "GET", credentials: "same-origin", cache: "no-store",
      ...(payload ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) } : {}),
      signal: controller.signal,
    });
    if (!response.headers.get("content-type")?.includes("application/json")) {
      throw new CampaignRequestError("The campaign service did not return an acknowledgement. Read saved state before retrying.", "ACKNOWLEDGEMENT_UNAVAILABLE");
    }
    const envelope = await response.json() as ApiEnvelope<T> | ApiFailure;
    if (!response.ok || "error" in envelope) {
      throw new CampaignRequestError(
        "error" in envelope ? envelope.error.message : "The campaign request could not be confirmed.",
        "error" in envelope ? envelope.error.code : "REQUEST_FAILED",
        response.status >= 400 && response.status < 500 && "error" in envelope,
      );
    }
    if (!("data" in envelope) || !envelope.data) throw new CampaignRequestError("The campaign response was incomplete. Its execution state is unconfirmed.", "INCOMPLETE_ACKNOWLEDGEMENT");
    return envelope.data;
  } catch (error) {
    if (timedOut) throw new CampaignRequestError("The service did not acknowledge this request in time. Its saved state is unconfirmed; retry with the retained identity.", "ACKNOWLEDGEMENT_TIMEOUT");
    throw error;
  } finally {
    window.clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
}
function messageOf(error: unknown) { return error instanceof Error ? error.message : "The saved campaign could not be read."; }
function storageKey(sessionId: string) { return "fracture:campaign-command:v1:" + sessionId; }
function persistCommand(sessionId: string, command: SavedCommand | null) {
  try {
    if (command) window.sessionStorage.setItem(storageKey(sessionId), JSON.stringify(command));
    else window.sessionStorage.removeItem(storageKey(sessionId));
    return true;
  } catch { return false; }
}
function restoreCommand(sessionId: string): SavedCommand | null {
  try {
    const value = JSON.parse(window.sessionStorage.getItem(storageKey(sessionId)) ?? "null") as SavedCommand | null;
    if (!value || value.version !== 1 || value.sessionId !== sessionId || !UUID.test(value.payload?.requestId ?? "")) return null;
    if (!["create", "minimize", "resume", "cancel"].includes(value.kind) || !["uncertain", "pending", "rejected"].includes(value.phase)) return null;
    const expected = value.kind === "create" ? "/api/campaign-lab" : "/api/campaign-lab/" + value.campaignId;
    if (value.endpoint !== expected || (value.kind !== "create" && !UUID.test(value.campaignId ?? ""))) return null;
    if (value.kind === "create" && (value.payload.projectId !== "bramble" || !SEED.test(String(value.payload.seed ?? "")) || !Array.isArray(value.payload.scenarioIds) || !value.payload.scenarioIds.every(id => SCENARIOS.some(item => item.id === id)) || !Array.isArray(value.payload.revisions) || !value.payload.revisions.every(item => item === "faulty" || item === "hardened"))) return null;
    if (value.kind !== "create" && value.payload.action !== value.kind) return null;
    if (value.kind === "minimize" && (!UUID.test(String(value.payload.caseId ?? "")) || !/^I[1-8]$/.test(String(value.payload.invariantId ?? "")))) return null;
    return value;
  } catch { return null; }
}
function campaignUrl(id: string) { return "/campaigns?campaign=" + encodeURIComponent(id); }
function writeSelection(id: string) {
  const url = new URL(window.location.href);
  url.searchParams.set("campaign", id);
  window.history.replaceState(window.history.state, "", url);
}
function stageLabel(value: string) { return value.replaceAll("_", " "); }
function timeLabel(value: string) {
  return new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, timeZone: "UTC" }).format(new Date(value));
}
function recipeComponents(item: CampaignCaseDTO) { return item.recipe?.components ?? SCENARIOS.find(scenario => scenario.id === item.scenarioId)?.components ?? []; }
function checkTone(verdict: Verdict): Tone { return verdict === "pass" ? "mint" : verdict === "fail" ? "rose" : verdict === "not_applicable" ? "muted" : "amber"; }
function verdictLabel(verdict: Verdict) { return ({ pass: "Passed", fail: "Failed", inconclusive: "Inconclusive", blocked: "Blocked", not_applicable: "Not applicable" })[verdict]; }
function caseState(item: CampaignCaseDTO): { label: string; tone: Tone } {
  if (item.status === "interrupted" || item.result?.stage === "failed_infrastructure") return { label: item.result?.stage === "failed_infrastructure" ? "Infrastructure interrupted" : "Interrupted", tone: "amber" };
  if (item.status === "cancelled") return { label: "Cancelled", tone: "muted" };
  if (item.status === "blocked") return { label: "Blocked", tone: "amber" };
  if (item.status === "pending") return { label: "Queued", tone: "muted" };
  if (item.status === "running") return { label: "Running", tone: "violet" };
  return item.result ? { label: verdictLabel(item.result.verdict), tone: checkTone(item.result.verdict) } : { label: "No result", tone: "amber" };
}
function campaignState(status: CampaignStatus) {
  const labels: Record<CampaignStatus, string> = { queued: "Queued", running: "Running", waiting: "Waiting", completed: "Execution complete", cancelled: "Cancelled", expired: "Expired", needs_attention: "Needs attention" };
  return { label: labels[status], tone: (status === "needs_attention" || status === "expired" || status === "waiting" ? "amber" : status === "running" || status === "queued" ? "violet" : "muted") as Tone };
}
function matrixRows(campaign: CampaignLabDTO): MatrixRow[] {
  const rows = new Map<string, MatrixRow>();
  for (const item of campaign.cases) {
    const key = campaign.manifest.kind === "minimization" ? item.recipeHash : item.scenarioId;
    if (!rows.has(key)) rows.set(key, {
      key, title: campaign.manifest.kind === "minimization" ? String(recipeComponents(item).length) + " component" + (recipeComponents(item).length === 1 ? "" : "s") : SCENARIOS.find(scenario => scenario.id === item.scenarioId)?.title ?? item.scenarioTitle,
      scenarioId: item.scenarioId, components: recipeComponents(item), cases: [],
    });
    rows.get(key)!.cases.push(item);
  }
  return [...rows.values()];
}
function equivalentPair(row: MatrixRow) {
  const baseline = row.cases.find(item => item.revision === "faulty");
  const control = row.cases.find(item => item.revision === "hardened");
  return Boolean(baseline && control && baseline.seed === control.seed && baseline.recipeHash === control.recipeHash && baseline.scenarioHash === control.scenarioHash);
}
function IconForTone({ tone, size = 14 }: { tone: Tone; size?: number }) {
  return tone === "rose" ? <X size={size} /> : tone === "mint" ? <Check size={size} /> : tone === "amber" ? <CircleHelp size={size} /> : tone === "violet" ? <Activity size={size} /> : <Clock3 size={size} />;
}
function State({ label, tone }: { label: string; tone: Tone }) { return <span className={s.state} data-tone={tone}><IconForTone tone={tone} />{label}</span>; }

function useCampaigns(sessionId: string | null) {
  const [campaigns, setCampaigns] = useState<CampaignLabDTO[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [readError, setReadError] = useState<string | null>(null);
  const [command, setCommand] = useState<SavedCommand | null>(null);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [visible, setVisible] = useState(true);
  const [storageWarning, setStorageWarning] = useState(false);
  const mounted = useRef(false);
  const currentSession = useRef(sessionId);
  const readFlight = useRef<Promise<void> | null>(null);
  const commandRef = useRef<SavedCommand | null>(null);
  const commandFlight = useRef(false);
  const selected = campaigns.find(item => item.id === selectedId) ?? null;

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const merge = useCallback((incoming: CampaignLabDTO[]) => {
    setCampaigns(previous => {
      const result = new Map(previous.map(item => [item.id, item]));
      for (const item of incoming) {
        const old = result.get(item.id);
        if (!old || item.updatedAt > old.updatedAt || (item.updatedAt === old.updatedAt && item.events.length >= old.events.length)) result.set(item.id, item);
      }
      return [...result.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    });
  }, []);
  const read = useCallback(async (id: string | null = null, signal?: AbortSignal) => {
    if (!sessionId) return null;
    // Collection reads, detail reads, and polls share one flight.
    while (readFlight.current) {
      await readFlight.current;
      if (signal?.aborted || currentSession.current !== sessionId) return null;
    }
    if (signal?.aborted || currentSession.current !== sessionId) return null;
    let finish!: () => void;
    const flight = new Promise<void>(resolve => { finish = resolve; });
    readFlight.current = flight;
    if (mounted.current) setRefreshing(true);
    try {
      const result = id
        ? [await request<CampaignLabDTO>("/api/campaign-lab/" + encodeURIComponent(id), undefined, signal)]
        : (await request<{ campaigns: CampaignLabDTO[] }>("/api/campaign-lab", undefined, signal)).campaigns;
      if (mounted.current && currentSession.current === sessionId && !signal?.aborted) { merge(result); setReadError(null); }
      return result;
    } catch (error) {
      if (mounted.current && currentSession.current === sessionId && !signal?.aborted) setReadError(messageOf(error));
      return null;
    } finally {
      if (readFlight.current === flight) readFlight.current = null;
      finish();
      if (mounted.current && currentSession.current === sessionId) setRefreshing(false);
    }
  }, [sessionId, merge]);

  useEffect(() => {
    currentSession.current = sessionId;
    setCampaigns([]); setSelectedId(null); setLoaded(false); setReadError(null); setNotice(null);
    const restored = sessionId ? restoreCommand(sessionId) : null;
    commandRef.current = restored; setCommand(restored);
    setStorageWarning(false);
    if (!sessionId) return;
    const controller = new AbortController();
    const requested = new URL(window.location.href).searchParams.get("campaign");
    const preferred = requested && UUID.test(requested) ? requested : restored?.resultCampaignId ?? restored?.campaignId;
    void read(null, controller.signal).then(async items => {
      if (controller.signal.aborted) return;
      const chosen = preferred ?? items?.find(item => ACTIVE.has(item.status))?.id ?? items?.[0]?.id ?? null;
      if (chosen) { setSelectedId(chosen); writeSelection(chosen); }
      if (chosen && !items?.some(item => item.id === chosen)) await read(chosen, controller.signal);
      if (!controller.signal.aborted) setLoaded(true);
    });
    return () => controller.abort();
  }, [sessionId, read]);

  useEffect(() => {
    const visibility = () => setVisible(document.visibilityState === "visible");
    visibility(); document.addEventListener("visibilitychange", visibility);
    return () => document.removeEventListener("visibilitychange", visibility);
  }, []);
  const status = selected?.status;
  useEffect(() => {
    if (!selectedId || !status || !ACTIVE.has(status) || !visible || !sessionId) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | null = null;
    let delay = 2200;
    const poll = async () => {
      if (controller.signal.aborted || document.visibilityState !== "visible") return;
      // A command owns its acknowledgement; polling never claims it succeeded.
      const result = commandFlight.current ? null : await read(selectedId, controller.signal);
      if (controller.signal.aborted) return;
      if (result?.[0] && !ACTIVE.has(result[0].status)) return;
      delay = result ? 2200 : Math.min(delay * 2, 15000);
      timer = setTimeout(() => { void poll(); }, delay);
    };
    timer = setTimeout(() => { void poll(); }, 650);
    return () => { controller.abort(); if (timer) clearTimeout(timer); };
  }, [selectedId, status, visible, sessionId, read]);

  const select = useCallback((id: string) => {
    setSelectedId(id); writeSelection(id); setNotice(null);
    if (!campaigns.some(item => item.id === id)) void read(id);
  }, [campaigns, read]);
  const save = useCallback((value: SavedCommand | null) => {
    commandRef.current = value;
    const stored = sessionId ? persistCommand(sessionId, value) : true;
    if (mounted.current && currentSession.current === sessionId) { setCommand(value); if (!stored) setStorageWarning(true); }
  }, [sessionId]);
  const send = useCallback(async (value: SavedCommand) => {
    if (commandFlight.current || !sessionId || value.sessionId !== sessionId) return null;
    commandFlight.current = true; setSending(true); setNotice(null);
    save({ ...value, phase: "uncertain", message: "Waiting for the server acknowledgement.", code: null });
    try {
      const result = await request<{ campaign: CampaignLabDTO; dispatch: "accepted" | "pending" | "not_required" }>(value.endpoint, value.payload);
      const pending: SavedCommand = { ...value, phase: "pending", resultCampaignId: result.campaign.id, message: "The campaign is saved. Its initial worker dispatch was not acknowledged; execution progress is established only by saved case receipts below.", code: "DISPATCH_PENDING" };
      if (!mounted.current || currentSession.current !== sessionId) {
        persistCommand(sessionId, result.dispatch === "pending" ? pending : null);
        return result.campaign;
      }
      merge([result.campaign]); setSelectedId(result.campaign.id); writeSelection(result.campaign.id);
      if (result.dispatch === "pending" && ACTIVE.has(result.campaign.status)) {
        // Retain the original endpoint and payload, including the parent's id for minimization.
        save(pending);
      } else {
        save(null);
        setNotice(result.dispatch === "pending" || (result.dispatch === "not_required" && value.kind !== "cancel") ? "The original saved command is recovered. Its campaign is " + stageLabel(result.campaign.status) + "; no new execution was reported." : value.kind === "cancel" ? "Campaign stop acknowledged. Saved observations remain; no compensation was submitted." : value.kind === "minimize" ? "Reduction saved. Follow the executed subsets below; a smaller witness is still being tested." : "Campaign saved and dispatch accepted. Results appear only when case evidence is retained.");
      }
      return result.campaign;
    } catch (error) {
      const known = error instanceof CampaignRequestError && error.rejected;
      const next = { ...value, phase: known ? "rejected" as const : "uncertain" as const, message: messageOf(error), code: error instanceof CampaignRequestError ? error.code : "TRANSPORT_UNCONFIRMED" };
      const stored = persistCommand(sessionId, next);
      if (mounted.current && currentSession.current === sessionId) { commandRef.current = next; setCommand(next); if (!stored) setStorageWarning(true); }
      return null;
    } finally {
      commandFlight.current = false;
      if (mounted.current) setSending(false);
    }
  }, [sessionId, save, merge]);
  const issue = useCallback(async (kind: CommandKind, payload: Record<string, unknown>, campaignId: string | null = null) => {
    if (!sessionId || commandRef.current || commandFlight.current) return null;
    const value: SavedCommand = {
      version: 1, sessionId, kind, endpoint: campaignId ? "/api/campaign-lab/" + encodeURIComponent(campaignId) : "/api/campaign-lab",
      payload: { ...payload, requestId: crypto.randomUUID() }, phase: "uncertain", message: "Waiting for the server acknowledgement.", code: null, campaignId, resultCampaignId: null,
    };
    save(value);
    return send(value);
  }, [sessionId, save, send]);
  return {
    campaigns, selected, selectedId, loaded, refreshing, readError, command, sending, notice, visible, storageWarning, read, select, issue,
    retry: () => commandRef.current ? send(commandRef.current) : Promise.resolve(null),
    dismissRejected: () => { if (commandRef.current?.phase === "rejected") save(null); },
    dismissNotice: () => setNotice(null),
  };
}

function Modal({ open, onClose, titleId, className = "", children }: { open: boolean; onClose: () => void; titleId: string; className?: string; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const node = dialog.current;
    if (open && node && !node.open) { opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; node.showModal(); }
    if (!open && node?.open) node.close();
  }, [open]);
  return <dialog ref={dialog} className={s.dialog + " " + className} aria-labelledby={titleId}
    onClose={() => { onClose(); if (opener.current?.isConnected) opener.current.focus(); }}
    onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>{children}</dialog>;
}

export function CampaignLab() { return <AppShell><CampaignWorkspace /></AppShell>; }

function CampaignWorkspace() {
  const { workspace, loading, refresh, activeProjectId, setActiveProjectId } = useWorkspace();
  const lab = useCampaigns(activeProjectId === "bramble" ? workspace?.sessionId ?? null : null);
  const [composer, setComposer] = useState(false);
  const [scenarios, setScenarios] = useState(SCENARIOS.map(item => item.id));
  const [mode, setMode] = useState("paired");
  const [seed, setSeed] = useState("bramble:observatory:01");
  const [formError, setFormError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const admittedScenarios = scenarios.filter(id => workspace?.scenarios.some(scenario => scenario.id === id && scenario.available && scenario.mode === "sample" && scenario.fixtureIds.includes("bramble")));
  const activeCampaign = lab.campaigns.find(item => ACTIVE.has(item.status));
  const locked = lab.sending || Boolean(lab.command);
  const start = async (event: FormEvent) => {
    event.preventDefault();
    if (!admittedScenarios.length || !SEED.test(seed)) { setFormError(!admittedScenarios.length ? "Choose at least one available fault." : "Use 1–100 letters, numbers, colons, underscores, or hyphens for the seed."); return; }
    setFormError(null);
    await lab.issue("create", { projectId: "bramble", scenarioIds: SCENARIOS.filter(item => admittedScenarios.includes(item.id)).map(item => item.id), revisions: mode === "paired" ? ["faulty", "hardened"] : [mode], seed });
    // A retained command is recovered on the main screen; form choices remain available.
    setComposer(false);
  };
  const exportReport = async () => {
    if (!lab.selected || exporting) return;
    setExporting(true); setExportError(null);
    try {
      const response = await fetch("/api/campaign-lab/" + encodeURIComponent(lab.selected.id) + "/report", { credentials: "same-origin", cache: "no-store" });
      if (!response.ok) {
        const failure = await response.json() as ApiFailure;
        throw new Error("error" in failure ? failure.error.message : "The report could not be exported.");
      }
      if (!response.headers.get("content-type")?.includes("application/json") || !/^[a-f0-9]{64}$/i.test(response.headers.get("x-content-sha256") ?? "")) throw new Error("The service did not return a canonical-hash campaign report. Read saved state and retry the export.");
      const blob = await response.blob();
      const href = URL.createObjectURL(blob);
      const anchor = document.createElement("a"); anchor.href = href; anchor.download = "fracture-campaign-" + lab.selected.id + ".json";
      document.body.appendChild(anchor); anchor.click(); anchor.remove(); window.setTimeout(() => URL.revokeObjectURL(href), 1000);
    } catch (error) { setExportError(messageOf(error)); }
    finally { setExporting(false); }
  };

  if (loading) return <LoadingWorkspace />;
  if (!workspace) return <div className={s.disconnected}><ScanLine size={34} /><h1>Your observatory is disconnected.</h1><p>Reconnect to read your saved session and campaigns.</p><button className={s.primaryButton} onClick={() => void refresh(true)}><RefreshCw size={15} />Reconnect workspace</button></div>;
  if (activeProjectId !== "bramble") return <div className={s.scopeBoundary}><span className={s.kicker}><Layers3 size={14} />CAMPAIGN SCOPE</span><h1>Different fixtures.<br /><span>Their own evidence.</span></h1><p>This paired fault campaign and recipe minimizer execute Bramble Books. {activeProjectId === "tandem" ? "Tandem Tickets has its own durable Python workspace." : "Errand has its own agent runner and order evidence."}</p><div><Link href={activeProjectId === "tandem" ? "/tandem" : "/errand"} className={s.primaryButton}>Open {activeProjectId === "tandem" ? "Tandem" : "Errand"}<ArrowUpRight size={15} /></Link><button className={s.secondaryButton} onClick={() => setActiveProjectId("bramble")}>Switch to Bramble<ArrowRight size={15} /></button></div><p className={s.scopeNote}>Results from these fixtures are never folded into a Bramble comparison.</p></div>;

  return <div className={s.lab}>
    <header className={s.heading}>
      <div><div className={s.kicker}><span className={s.instrumentDot} />PAYMENT OBSERVATORY<span className={s.kickerSlash}>/</span>CAMPAIGNS</div>
        <h1>Same purchase.<br /><span>Different consequences.</span></h1>
        <p>Put two revisions under the same fault. Follow the money.<br className={s.desktopBreak} /> Then find the smallest recipe that still breaks the promise.</p>
      </div>
      <div className={s.headingActions}><SourceChip source="sample" /><button className={s.primaryButton} onClick={() => { setFormError(null); setComposer(true); }} disabled={!lab.loaded || locked || Boolean(activeCampaign)} title={activeCampaign ? "Finish or stop the active campaign before creating another." : undefined}><Plus size={16} />New campaign</button></div>
      <div className={s.headingInstrument} aria-hidden="true"><span /><span /><span /><ScanLine size={27} /><small>COMPARE / OBSERVE / REDUCE</small></div>
    </header>

    <div className={s.scopeLine}><FlaskConical size={13} /><span>Deterministic local experiments. No payment or model provider calls.</span><span className={s.scopeProject}>BRAMBLE BOOKS · TYPESCRIPT</span></div>
    {lab.command ? <div className={s.commandNotice} role="alert" data-tone={lab.command.phase === "rejected" ? "rose" : "amber"}>
      <div className={s.noticeIcon}>{lab.sending ? <LoaderCircle className={s.spin} size={20} /> : <TriangleAlert size={20} />}</div>
      <div><strong>{lab.sending ? "Awaiting acknowledgement" : lab.command.phase === "pending" ? "Saved. Dispatch is still pending." : lab.command.phase === "rejected" ? "The command was rejected." : "The command outcome is unconfirmed."}</strong><p>{lab.command.message}</p><small>Retained request <code>{lab.command.payload.requestId}</code>{lab.command.code ? <span> · {lab.command.code}</span> : null}</small>
        {lab.storageWarning ? <p className={s.storageWarning}><LockKeyhole size={13} />Browser recovery storage is unavailable. This request identity is retained only in the open tab; copy it before leaving. Reload recovery is not assured.</p> : null}
        <div className={s.noticeActions}><button className={s.textButton} disabled={lab.refreshing || lab.sending} onClick={() => void lab.read(lab.command?.resultCampaignId ?? lab.command?.campaignId ?? null)}><RefreshCw size={13} />Read saved state</button><button className={s.textButton} disabled={lab.sending} onClick={() => void lab.retry()}><Play size={13} />Retry same request</button>{lab.command.phase === "rejected" ? <button className={s.textButton} onClick={lab.dismissRejected}>Dismiss rejected request<X size={12} /></button> : null}</div>
      </div>
    </div> : null}
    {lab.notice ? <div className={s.notice} role="status"><FileCheck2 size={16} /><span>{lab.notice}</span><button onClick={lab.dismissNotice} aria-label="Dismiss campaign notice"><X size={15} /></button></div> : null}
    {lab.readError ? <div className={s.readError} role="alert"><TriangleAlert size={17} /><div><strong>Updates are disconnected.</strong><p>{lab.readError} The last confirmed evidence stays visible.</p></div><button className={s.secondaryButton} disabled={lab.refreshing} onClick={() => void lab.read(lab.selectedId)}>Read again<RefreshCw size={13} /></button></div> : null}
    {exportError ? <div className={s.readError} role="alert"><TriangleAlert size={16} /><p>{exportError}</p><button className={s.textButton} onClick={() => void exportReport()}>Retry export</button></div> : null}

    <div className={s.campaignToolbar}>
      <div className={s.savedSelect}><label htmlFor="saved-campaign">SAVED CAMPAIGN</label><div><select id="saved-campaign" value={lab.selectedId ?? ""} onChange={event => lab.select(event.target.value)} disabled={!lab.campaigns.length}>
        {!lab.campaigns.length ? <option value="">{lab.loaded ? "Your first campaign starts here" : "Reading saved campaigns…"}</option> : null}
        {lab.selectedId && !lab.campaigns.some(item => item.id === lab.selectedId) ? <option value={lab.selectedId}>Requested campaign</option> : null}
        {lab.campaigns.map(item => <option value={item.id} key={item.id}>{item.title + " · " + dateLabel(item.createdAt)}</option>)}
      </select><ChevronDown size={16} /></div></div>
      <div className={s.toolbarActions}>{activeCampaign && activeCampaign.id !== lab.selectedId ? <button className={s.textButton} onClick={() => lab.select(activeCampaign.id)}><Activity size={13} />View active campaign</button> : null}<button className={s.iconButton} aria-label="Refresh saved campaigns" disabled={lab.refreshing} onClick={() => void lab.read()}><RefreshCw size={16} className={lab.refreshing ? s.spin : ""} /></button><button className={s.secondaryButton} disabled={!lab.selected || exporting} onClick={() => void exportReport()}>{exporting ? <LoaderCircle size={15} className={s.spin} /> : <ArrowDownToLine size={15} />}Export report</button></div>
    </div>

    {!lab.loaded ? <div className={s.campaignLoading} aria-live="polite" aria-busy="true"><ScanLine size={25} /><span>Reading your saved experiments…</span><div /><div /><div /></div> : lab.selected ? <CampaignDetail key={lab.selected.id}
      campaign={lab.selected} activeCampaignId={activeCampaign?.id ?? null} locked={locked}
      visible={lab.visible} refreshing={lab.refreshing} onSelectCampaign={lab.select}
      onCommand={lab.issue} onRead={() => void lab.read(lab.selectedId)} /> : <EmptyCampaign
        unavailable={Boolean(lab.selectedId)} onCreate={() => setComposer(true)} locked={locked || Boolean(activeCampaign)} />}

    <footer className={s.scopeFooter}><Fingerprint size={14} /><p>Every comparison is bound to its saved source, scenario, seed, SDK, and context. A passing property is evidence for that scope.</p><Link href="/provider-facts">Read the boundaries<ArrowUpRight size={12} /></Link></footer>

    <Modal open={composer} onClose={() => setComposer(false)} titleId="create-campaign-title" className={s.composer}>
      <form onSubmit={event => void start(event)}>
        <header className={s.dialogHeader}><div><span className={s.kicker}>NEW EXPERIMENT</span><h2 id="create-campaign-title">Choose where it fractures.</h2></div><button type="button" className={s.iconButton} onClick={() => setComposer(false)} aria-label="Close campaign setup"><X size={19} /></button></header>
        <p className={s.dialogIntro}>The manifest is saved before execution. Each selected fault gets its own run and retained evidence.</p>
        <fieldset className={s.revisionChoice}><legend>Revisions</legend>{[{ value: "paired", title: "Baseline × control", note: "Same fault, both revisions", Icon: GitBranch }, { value: "faulty", title: "Baseline only", note: "Deliberately faulty", Icon: Layers3 }, { value: "hardened", title: "Control only", note: "Hardened reference", Icon: ShieldCheck }].map(choice => <label key={choice.value} data-selected={mode === choice.value}><input type="radio" name="revision" value={choice.value} checked={mode === choice.value} onChange={() => setMode(choice.value)} disabled={locked} /><choice.Icon size={18} /><strong>{choice.title}</strong><small>{choice.note}</small></label>)}</fieldset>
        <fieldset className={s.faultChoice}><legend><span>Faults to explore</span><span>{admittedScenarios.length} / {SCENARIOS.length} selected</span></legend><div className={s.faultGrid}>{SCENARIOS.map(item => {
          const available = workspace.scenarios.some(scenario => scenario.id === item.id && scenario.available && scenario.mode === "sample" && scenario.fixtureIds.includes("bramble"));
          return <label key={item.id} data-selected={admittedScenarios.includes(item.id)} data-disabled={!available}><input type="checkbox" checked={admittedScenarios.includes(item.id)} disabled={locked || !available} onChange={event => setScenarios(previous => event.target.checked ? [...previous, item.id] : previous.filter(id => id !== item.id))} /><span className={s.faultTop}><code>{item.id}</code><span>{item.family}</span><span className={s.checkbox}><Check size={12} /></span></span><strong>{item.title}</strong><p>{item.description}</p><small>{available ? item.components.length + " declared component" + (item.components.length === 1 ? "" : "s") : "Not available in this session"}</small></label>;
        })}</div></fieldset>
        <div className={s.seedField}><label htmlFor="campaign-seed">Reproduction seed</label><input autoComplete="off" id="campaign-seed" value={seed} onChange={event => setSeed(event.target.value)} maxLength={100} required disabled={locked} aria-describedby="seed-description" /><p id="seed-description">1–100 letters, numbers, colons, underscores, or hyphens. Both revisions share each case seed.</p></div>
        {formError ? <p className={s.formError} role="alert">{formError}</p> : null}
        {activeCampaign ? <div className={s.formError}>An existing campaign is active. Finish or stop it before creating another.</div> : null}
        {lab.command ? <div className={s.formError}>Resolve the retained command on the campaign screen before submitting another.</div> : null}
        <footer className={s.composerFooter}><div><SourceChip source="sample" /><span>{admittedScenarios.length * (mode === "paired" ? 2 : 1)} separate runs · original session expiry</span></div><button className={s.primaryButton} type="submit" disabled={locked || Boolean(activeCampaign) || !admittedScenarios.length || !SEED.test(seed)}>{lab.sending ? <LoaderCircle size={15} className={s.spin} /> : <Play size={15} />}Save & run campaign</button></footer>
      </form>
    </Modal>
  </div>;
}

function EmptyCampaign({ unavailable, onCreate, locked }: { unavailable: boolean; onCreate: () => void; locked: boolean }) {
  return <section className={s.empty}><div className={s.emptyInstrument} aria-hidden="true"><div><GitBranch size={18} /><span>BASELINE</span><i /><i /><i /></div><span className={s.emptyFracture}>↯</span><div><ShieldCheck size={18} /><span>CONTROL</span><i /><i /><i /></div></div><span className={s.kicker}>{unavailable ? "CAMPAIGN UNAVAILABLE" : "A PROMISE WORTH TESTING"}</span><h2>{unavailable ? "This campaign could not be read." : "One purchase should mean one charge."}</h2><p>{unavailable ? "Choose a saved campaign in this session, or read again when the service reconnects." : "Explore six controlled fault recipes on the faulty baseline and hardened control. A result appears only after its run leaves evidence."}</p>{!unavailable ? <button className={s.primaryButton} onClick={onCreate} disabled={locked}><Plus size={16} />Create a paired campaign</button> : null}<div className={s.emptySteps}><span><Fingerprint size={14} />Pin the inputs</span><ChevronRight size={13} /><span><Activity size={14} />Observe each case</span><ChevronRight size={13} /><span><Minimize2 size={14} />Reduce the witness</span></div></section>;
}

type CampaignCommand = (kind: CommandKind, payload: Record<string, unknown>, campaignId?: string | null) => Promise<CampaignLabDTO | null>;
function CampaignDetail({ campaign, activeCampaignId, locked, visible, refreshing, onSelectCampaign, onCommand, onRead }: {
  campaign: CampaignLabDTO; activeCampaignId: string | null; locked: boolean; visible: boolean; refreshing: boolean;
  onSelectCampaign: (id: string) => void; onCommand: CampaignCommand; onRead: () => void;
}) {
  const { workspace, activeRunId, refresh } = useWorkspace();
  const [comparisonKey, setComparisonKey] = useState<string | null>(null);
  const [inspectedId, setInspectedId] = useState<string | null>(null);
  const [inspectedCheck, setInspectedCheck] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const syncedReceipts = useRef("");
  const rows = useMemo(() => matrixRows(campaign), [campaign]);
  const chosen = campaign.reduction?.chosenCaseId;
  const defaultRow = rows.find(row => row.cases.some(item => item.id === chosen))
    ?? rows.find(row => row.cases.some(item => item.revision === "faulty" && item.status === "completed" && item.result?.checks.some(check => check.id === "I2" && check.verdict === "fail")))
    ?? rows.find(row => row.cases.some(item => item.status === "completed")) ?? rows[0];
  const comparison = rows.find(row => row.key === comparisonKey) ?? defaultRow;
  const inspected = campaign.cases.find(item => item.id === inspectedId) ?? null;
  const campaignPresentation = campaignState(campaign.status);
  const baseline = campaign.cases.filter(item => item.revision === "faulty");
  const control = campaign.cases.filter(item => item.revision === "hardened");
  const paired = rows.filter(row => equivalentPair(row) && row.cases.filter(item => item.status === "completed" && item.result).length === 2);
  const expired = new Date(campaign.expiresAt).getTime() <= Date.now();
  const resumable = ["queued", "waiting", "needs_attention"].includes(campaign.status) && campaign.cases.some(item => item.status === "pending" || item.status === "running") && !expired;
  const cancellable = (ACTIVE.has(campaign.status) || campaign.status === "needs_attention") && !expired;
  const blockedJourney = workspace?.runs.find(run => run.id === (activeRunId ?? workspace.selectedRunId) && !TERMINAL_RUNS.has(run.stage) && !campaign.cases.some(item => item.runId === run.id))
    ?? workspace?.runs.find(run => run.projectId === "bramble" && !TERMINAL_RUNS.has(run.stage) && !campaign.cases.some(item => item.runId === run.id));
  const inspect = (id: string, checkId?: string) => { setInspectedCheck(checkId ?? null); setInspectedId(id); };
  useEffect(() => {
    const stamp = campaign.cases.filter(item => item.result).map(item => item.id).join(":");
    if (stamp && syncedReceipts.current !== stamp) { syncedReceipts.current = stamp; void refresh(); }
  }, [campaign.cases, refresh]);
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(new URL(campaignUrl(campaign.id), window.location.origin).href); setCopied(true); }
    catch { setCopied(false); }
  };

  return <div className={s.campaign}>
    <div className={s.campaignIdentity}><div><span className={s.kicker}>{campaign.manifest.kind === "minimization" ? "EXECUTED RECIPE REDUCTION" : campaign.manifest.kind === "paired" ? "PAIRED EXPERIMENT" : "SINGLE REVISION EXPERIMENT"}</span><h2>{campaign.title}</h2><p><code>{shortId(campaign.id, 12)}</code><span>·</span>{dateLabel(campaign.createdAt)}<span>·</span><SourceChip source={campaign.manifest.source} small /></p></div>
      <div className={s.campaignActions}><State {...campaignPresentation} />{resumable ? <button className={s.secondaryButton} disabled={locked || Boolean(activeCampaignId && activeCampaignId !== campaign.id)} onClick={() => void onCommand("resume", { action: "resume" }, campaign.id)}><Play size={13} />Resume saved work</button> : null}{cancellable ? <button className={s.stopButton} disabled={locked} onClick={() => void onCommand("cancel", { action: "cancel" }, campaign.id)}><Square size={12} />Stop campaign</button> : null}</div>
    </div>
    <div className={s.screenReaderStatus} role="status" aria-live="polite">{campaignPresentation.label + ". " + campaign.counts.completed + " of " + campaign.counts.planned + " cases have complete receipts. " + campaign.counts.interrupted + " interrupted."}</div>
    {campaign.reason ? <div className={s.savedReason}><TriangleAlert size={17} /><div><strong>{campaign.status === "waiting" ? "The campaign is waiting." : campaign.status === "needs_attention" ? "Execution needs attention." : "Saved execution state"}</strong><p>{campaign.reason}</p>{campaign.status === "needs_attention" ? <small>Resume checks the original running case and unstarted work under the saved binding and expiry. Interrupted cases remain retained and are never rerun by this command.</small> : null}</div></div> : null}
    {blockedJourney && (campaign.status === "waiting" || campaign.status === "queued") ? <div className={s.purchaseWait}><Pause size={18} /><div><strong>A purchase journey is still open.</strong><p>Open its run to finish or explicitly stop it. This campaign keeps its saved case identities while it waits.</p></div><Link href={"/runs/" + blockedJourney.id} className={s.secondaryButton}>Open current purchase<ArrowUpRight size={14} /></Link></div> : null}
    <div className={s.coverage}>
      <div className={s.coverageNumber}><strong>{campaign.counts.completed}<span>/{campaign.counts.planned}</span></strong><span>complete case receipts</span><div className={s.progressTrack} role="progressbar" aria-label="Cases with complete receipts" aria-valuemin={0} aria-valuemax={campaign.counts.planned} aria-valuenow={campaign.counts.completed}><i style={{ width: (campaign.counts.planned ? campaign.counts.completed / campaign.counts.planned * 100 : 0) + "%" }} /></div></div>
      <RevisionCoverage items={baseline} revision="faulty" /><RevisionCoverage items={control} revision="hardened" />
      <div className={s.coverageScope}><span><Link2 size={13} />{campaign.manifest.kind === "single" ? "One revision in scope" : paired.length + "/" + rows.length + " equivalent pairs recorded"}</span><p>{campaign.counts.interrupted ? campaign.counts.interrupted + " interrupted · " : ""}{campaign.counts.pending} pending{campaign.counts.blocked ? " · " + campaign.counts.blocked + " blocked or cancelled" : ""}</p><small>{ACTIVE.has(campaign.status) ? visible ? refreshing ? "Reading saved progress…" : "Following durable progress" : "Updates paused while tab is hidden" : "Terminal state · background polling stopped"}</small></div>
    </div>

    {comparison ? <MoneyComparison row={comparison} rows={rows} onChoose={setComparisonKey} onInspect={inspect} /> : null}
    <div className={s.workbench}>
      <div className={s.mainColumn}>
        <section className={s.matrixSection} aria-labelledby="matrix-title">
          <header className={s.sectionHeader}><div><span className={s.kicker}>EXACT CASES · {campaign.manifest.kind === "minimization" ? "ALL DECLARED SUBSETS" : "ONE SAVED MANIFEST"}</span><h3 id="matrix-title">{campaign.manifest.kind === "minimization" ? "The reduction, subset by subset." : "Where the promise fractures."}</h3></div><span className={s.sectionCount}>{rows.length}<small>{campaign.manifest.kind === "minimization" ? "SUBSETS" : "FAULTS"}</small></span></header>
          <div className={s.matrixLegend}><span data-tone="rose"><X size={11} />Failed</span><span data-tone="mint"><Check size={11} />Passed</span><span data-tone="amber"><CircleHelp size={11} />Unresolved / blocked</span><span><Clock3 size={11} />Not run / N/A</span></div>
          <table className={s.matrix}><caption className={s.screenReaderStatus}>Exact cases from this campaign. Rows are faults or fault subsets; columns are the faulty baseline and hardened control. Select a result or property to inspect its evidence.</caption><thead><tr><th scope="col">{campaign.manifest.kind === "minimization" ? "FAULT RECIPE" : "CONTROLLED FAULT"}</th><th scope="col"><GitBranch size={13} />Faulty baseline</th><th scope="col"><ShieldCheck size={13} />Hardened control</th></tr></thead><tbody>{rows.map(row => <tr key={row.key} data-selected={comparison.key === row.key}><th scope="row"><div className={s.rowIdentifier}><code>{row.scenarioId}</code><span>{campaign.manifest.kind === "minimization" ? shortId(row.key, 6) : SCENARIOS.find(item => item.id === row.scenarioId)?.family}</span></div><button className={s.rowTitle} onClick={() => setComparisonKey(row.key)} aria-label={"Compare " + row.title}>{row.title}<ArrowUpRight size={12} /></button><div className={s.rowRecipe}>{row.components.length ? row.components.map(component => <span key={component}>{COMPONENTS[component].short}</span>) : <span>No injected components</span>}</div></th>{(["faulty", "hardened"] as const).map(revision => <td key={revision} data-revision={revision === "faulty" ? "Faulty baseline" : "Hardened control"}><MatrixCase item={row.cases.find(item => item.revision === revision)} scenarioId={row.scenarioId} revision={revision} onInspect={inspect} /></td>)}</tr>)}</tbody></table>
          <p className={s.matrixNote}><Fingerprint size={13} />Each property tile opens its exact check. Interrupted and infrastructure outcomes cannot count as passing coverage.</p>
        </section>
        {campaign.manifest.kind === "minimization" ? <ReductionResult campaign={campaign} onInspect={inspect} onSelectCampaign={onSelectCampaign} /> : <Minimizer campaign={campaign} locked={locked || Boolean(activeCampaignId)} onCommand={onCommand} />}
        <SymptomGroups campaign={campaign} onInspect={inspect} />
      </div>
      <aside className={s.sideColumn}>
        <CampaignProgress campaign={campaign} onInspect={inspect} />
        <section className={s.bindingCard}><span className={s.kicker}><Fingerprint size={12} />PINNED TO THIS EXPERIMENT</span><dl><div><dt>Seed</dt><dd>{campaign.manifest.seed}</dd></div><div><dt>Mode</dt><dd>Sample · local fault recipes</dd></div><div><dt>Original authority ends</dt><dd>{dateLabel(campaign.expiresAt)}{expired ? <span className={s.expiredLabel}>Expired</span> : null}</dd></div><div><dt>Manifest SHA-256</dt><dd className={s.digest}>{campaign.manifestHash}</dd></div></dl><button className={s.textButton} onClick={() => void copyLink()}>{copied ? <Check size={13} /> : <Copy size={13} />}{copied ? "Campaign link copied" : "Copy campaign link"}</button><details className={s.bindingDetails}><summary>Source, SDK & context<ChevronDown size={13} /></summary><dl><div><dt>Runtime binding</dt><dd className={s.digest}>{campaign.manifest.binding.runtimeHash}</dd></div>{campaign.manifest.binding.revisions.map(item => <div key={item.revision}><dt>{item.revision === "faulty" ? "Baseline source" : "Control source"}</dt><dd>{item.path}<code>{item.sha256}</code></dd></div>)}<div><dt>APIMatic SDK</dt><dd>{campaign.manifest.binding.sdk.package} · {campaign.manifest.binding.sdk.version}<code>{campaign.manifest.binding.sdk.commit}</code></dd></div><div><dt>Payment core</dt><dd>{campaign.manifest.binding.sdk.coreVersion}<code>{campaign.manifest.binding.sdk.coreArchiveHash}</code></dd></div>{campaign.manifest.binding.context.map(item => <div key={item.path}><dt>Context</dt><dd>{item.path}<code>{item.sha256}</code></dd></div>)}</dl></details><div className={s.reportHint}><FileCheck2 size={15} /><p>The export includes canonical hashes and the exact saved runs. No unrelated workspace result is added.</p></div></section>
        <button className={s.lastRead} onClick={onRead} disabled={refreshing}><RefreshCw size={12} />Last saved {timeLabel(campaign.updatedAt)} UTC</button>
      </aside>
    </div>
    <Modal open={Boolean(inspected)} onClose={() => setInspectedId(null)} titleId="case-inspector-title" className={s.inspector}>{inspected ? <CaseInspector campaign={campaign} item={inspected} selectedCheckId={inspectedCheck} onClose={() => setInspectedId(null)} /> : null}</Modal>
  </div>;
}

function RevisionCoverage({ items, revision }: { items: CampaignCaseDTO[]; revision: Revision }) {
  const complete = items.filter(item => item.status === "completed" && item.result);
  const failures = complete.filter(item => item.result!.verdict === "fail").length;
  const passes = complete.filter(item => item.result!.verdict === "pass").length;
  const inconclusive = complete.filter(item => item.result!.verdict === "inconclusive").length;
  const blocked = complete.filter(item => item.result!.verdict === "blocked").length;
  const notApplicable = complete.filter(item => item.result!.verdict === "not_applicable").length;
  return <div className={s.revisionCoverage}><span>{revision === "faulty" ? <GitBranch size={13} /> : <ShieldCheck size={13} />}{revision === "faulty" ? "Faulty baseline" : "Hardened control"}</span>{items.length ? <><strong>{complete.length}<small> / {items.length} complete</small></strong><p><span data-tone="rose">{failures} failed</span><span data-tone="mint">{passes} passed</span>{inconclusive ? <span data-tone="amber">{inconclusive} inconclusive</span> : null}{blocked ? <span data-tone="amber">{blocked} blocked</span> : null}{notApplicable ? <span>{notApplicable} N/A</span> : null}</p></> : <p className={s.outOfScope}>Not included in this manifest</p>}</div>;
}

function MoneyComparison({ row, rows, onChoose, onInspect }: { row: MatrixRow; rows: MatrixRow[]; onChoose: (key: string) => void; onInspect: (id: string, check?: string) => void }) {
  const baseline = row.cases.find(item => item.revision === "faulty");
  const control = row.cases.find(item => item.revision === "hardened");
  const selectedProperty = baseline?.result?.checks.find(check => check.id === "I2" && check.verdict === "fail") ?? baseline?.result?.checks.find(check => check.verdict === "fail") ?? control?.result?.checks.find(check => check.id === "I2") ?? baseline?.result?.checks.find(check => check.id === "I2");
  const failures = row.cases.filter(item => item.status === "completed").flatMap(item => item.result?.checks.filter(check => check.verdict === "fail" && check.id !== selectedProperty?.id) ?? []).length;
  return <section className={s.consequence} aria-label="Observed money for one exact fault pair">
    <header className={s.consequenceHeader}><div><span className={s.kicker}>FOLLOW THE MONEY</span><h3>{row.scenarioId}<span>/</span>{row.title}</h3></div><div className={s.pairSelect}><label className={s.screenReaderStatus} htmlFor="comparison-case">Choose the fault pair to compare</label><select id="comparison-case" value={row.key} onChange={event => onChoose(event.target.value)}>{rows.map(item => <option key={item.key} value={item.key}>{item.scenarioId + " · " + item.title + (rows.some(other => other.title === item.title && other.key !== item.key) ? " · " + shortId(item.key, 5) : "")}</option>)}</select><ChevronDown size={13} /></div></header>
    <div className={s.moneyPair}>{(["faulty", "hardened"] as const).map(revision => {
      const item = revision === "faulty" ? baseline : control;
      const state = item ? caseState(item) : { label: "Outside this manifest", tone: "muted" as const };
      return <div className={s.moneyCard} key={revision} data-tone={state.tone}><div className={s.moneyRevision}>{revision === "faulty" ? <GitBranch size={16} /> : <ShieldCheck size={16} />}<span>{revision === "faulty" ? "FAULTY BASELINE" : "HARDENED CONTROL"}</span><State {...state} /></div><div className={s.moneyAmount}>{item?.result ? money(item.result.capturedMinor, item.result.currency) : <span className={s.awaitingAmount}>—</span>}</div><div className={s.moneyCaption}>{item?.result ? <><strong>{item.result.captureCount} capture{item.result.captureCount === 1 ? "" : "s"}</strong><span>· {item.status === "completed" ? "observed" : "partial observations"}</span></> : <span>{item ? "Awaiting saved observations" : "No case in scope"}</span>}</div><div className={s.moneyDetails}>{item?.result ? <><span>{item.result.fulfillmentCount} fulfillment{item.result.fulfillmentCount === 1 ? "" : "s"}</span><span>{money(item.result.refundedMinor, item.result.currency)} refunded</span></> : <span>Amounts remain unknown until recorded.</span>}{item ? <button className={s.textButton} onClick={() => onInspect(item.id)}>Inspect this case<ArrowUpRight size={13} /></button> : null}</div></div>;
    })}<div className={s.pairFracture} aria-hidden="true"><span /><i>↯</i><span /></div></div>
    <div className={s.pairConclusion}>{selectedProperty ? <><span className={s.pairProperty}>{selectedProperty.id}<strong>{selectedProperty.name}</strong></span><div>{row.cases.map(item => {
      const check = item.result?.checks.find(value => value.id === selectedProperty.id);
      return check ? <button key={item.id} className={s.propertyResult} data-tone={item.status === "completed" ? checkTone(check.verdict) : "amber"} onClick={() => onInspect(item.id, check.id)}>{item.revision === "faulty" ? "Baseline" : "Control"}<IconForTone tone={item.status === "completed" ? checkTone(check.verdict) : "amber"} />{item.status === "completed" ? verdictLabel(check.verdict) : "Partial"}</button> : null;
    })}</div></> : <span className={s.awaitingProperty}><Clock3 size={14} />Property results appear after execution.</span>}</div>
    <p className={s.pairScope}>{equivalentPair(row) ? "Same scenario, recipe, and seed. Two separate purchases in controlled Sample runs." : "Single revision scope. A before/after conclusion requires an equivalent paired case."}{failures ? <span>{failures} other failing check result{failures === 1 ? "" : "s"} in this pair remain visible below.</span> : null}</p>
  </section>;
}

function MatrixCase({ item, scenarioId, revision, onInspect }: { item?: CampaignCaseDTO | undefined; scenarioId: string; revision: Revision; onInspect: (id: string, checkId?: string) => void }) {
  const { refresh } = useWorkspace();
  if (!item) return <div className={s.absentCase}><span>—</span>Outside this manifest</div>;
  const state = caseState(item);
  const provisional = item.status !== "completed";
  return <div className={s.matrixCase} data-tone={state.tone}>
    <button className={s.caseMain} onClick={() => onInspect(item.id)} aria-label={"Inspect " + scenarioId + " " + (revision === "faulty" ? "faulty baseline" : "hardened control") + (item.recipe ? " recipe " + shortId(item.recipeHash, 6) : "") + ": " + state.label}><State {...state} /><ArrowUpRight size={13} /></button>
    <div className={s.caseStage}><span>{item.result ? stageLabel(item.result.stage) : item.status === "running" ? "Case claimed · awaiting receipt" : "Run identity reserved"}</span>{item.result ? <small>{item.result.eventCount} events</small> : null}</div>
    {item.result ? <div className={s.checkPips}>
      {provisional ? <small className={s.provisionalChecks}>Provisional check snapshots</small> : null}
      {item.result.checks.map(check => <button key={check.id} data-tone={provisional ? "amber" : checkTone(check.verdict)} onClick={() => onInspect(item.id, check.id)}
        title={check.id + " · " + check.name + " · " + (provisional ? "Provisional snapshot; recorded " : "") + verdictLabel(check.verdict)}
        aria-label={check.id + " " + check.name + ": " + (provisional ? "Provisional snapshot, recorded " : "") + verdictLabel(check.verdict)}>
        <IconForTone tone={provisional ? "amber" : checkTone(check.verdict)} size={10} /><span>{check.id}</span>
      </button>)}
    </div> : <div className={s.awaitingChecks}><span /><span /><span /><span /><small>Checks await execution</small></div>}
    <div className={s.caseFooter}>{item.result ? <span>{money(item.result.capturedMinor, item.result.currency)}<small> · {item.result.captureCount} capture{item.result.captureCount === 1 ? "" : "s"}</small></span> : <code>{shortId(item.runId, 8)}</code>}
      {item.result ? <Link href={"/runs/" + item.runId} onClick={() => void refresh()} aria-label={"Open exact run for " + scenarioId + " " + revision}>Run<ArrowUpRight size={12} /></Link> : <span className={s.reservedRun}>Reserved</span>}
    </div>
  </div>;
}

function ComponentStrip({ components, kept, pending = false }: { components: FaultComponent[]; kept?: FaultComponent[] | undefined; pending?: boolean }) {
  if (!components.length) return <div className={s.zeroRecipe}><Square size={14} />No injected fault components</div>;
  return <ol className={s.componentStrip}>{components.map((component, index) => {
    const removed = kept !== undefined && !kept.includes(component);
    return <li key={component} data-removed={removed} data-pending={pending}><span className={s.componentNumber}>{removed ? <X size={12} /> : String(index + 1).padStart(2, "0")}</span><span><strong>{COMPONENTS[component].short}</strong><small>{COMPONENTS[component].title}</small></span>{removed ? <span className={s.removedLabel}>Removed</span> : null}</li>;
  })}</ol>;
}
function Minimizer({ campaign, locked, onCommand }: { campaign: CampaignLabDTO; locked: boolean; onCommand: CampaignCommand }) {
  const [caseId, setCaseId] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const failedCases = campaign.cases.filter(item => item.revision === "faulty" && item.status === "completed" && item.result?.checks.some(check => check.verdict === "fail"));
  const selected = failedCases.find(item => item.id === caseId) ?? failedCases.find(item => item.result?.checks.some(check => check.id === "I2" && check.verdict === "fail")) ?? failedCases[0];
  const failedChecks = selected?.result?.checks.filter(check => check.verdict === "fail") ?? [];
  const property = failedChecks.find(check => check.id === propertyId) ?? failedChecks.find(check => check.id === "I2") ?? failedChecks[0];
  const components = selected ? recipeComponents(selected) : [];
  const subsets = 2 ** components.length;
  const expired = new Date(campaign.expiresAt).getTime() <= Date.now();
  return <section className={s.minimizer} aria-labelledby="minimizer-title"><header className={s.sectionHeader}><div><span className={s.kicker}><Minimize2 size={13} />THE MINIMAL WITNESS</span><h3 id="minimizer-title">How little does it take?</h3></div><span className={s.minimizerMark} aria-hidden="true">↯</span></header><p className={s.sectionDescription}>Execute every subset of a declared fault recipe. Keep the smallest one that still fails your selected property on the baseline and passes it on the control.</p>
    {selected && property ? <><div className={s.minimizerFields}><div><label htmlFor="reduction-source">Failed baseline case</label><div className={s.selectWrap}><select id="reduction-source" value={selected.id} onChange={event => { setCaseId(event.target.value); setPropertyId(""); }}>{failedCases.map(item => <option key={item.id} value={item.id}>{item.scenarioId + " · " + item.scenarioTitle}</option>)}</select><ChevronDown size={13} /></div></div><div><label htmlFor="reduction-property">Property to preserve</label><div className={s.selectWrap}><select id="reduction-property" value={property.id} onChange={event => setPropertyId(event.target.value)}>{failedChecks.map(check => <option key={check.id} value={check.id}>{check.id + " · " + check.name}</option>)}</select><ChevronDown size={13} /></div></div></div><ComponentStrip components={components} /><div className={s.reductionPromise}><div><span>{subsets}<small>subsets</small></span><span>×</span><span>2<small>pinned revisions</small></span><ArrowRight size={15} /><strong>{subsets * 2} new runs</strong></div><p>The original case and its observations stay unchanged. Empty and original recipes are included.</p></div><div className={s.minimizerAction}><div><Fingerprint size={14} /><span>Selected failure: <strong>{property.id}</strong> · {property.version}<small>Seed {selected.seed}</small></span></div><button className={s.primaryButton} disabled={locked || expired} onClick={() => void onCommand("minimize", { action: "minimize", caseId: selected.id, invariantId: property.id }, campaign.id)}><Minimize2 size={15} />Explore {subsets} subsets<ArrowRight size={14} /></button></div>{locked ? <p className={s.actionHint}>Finish or stop the active campaign and resolve any retained command before starting a reduction.</p> : expired ? <p className={s.actionHint}>The original authority expired. This evidence remains readable; a reduction cannot renew it.</p> : null}</> : <div className={s.minimizerEmpty}><Minimize2 size={25} /><div><strong>{ACTIVE.has(campaign.status) ? "Waiting for a failing baseline witness." : "No completed baseline failure to reduce."}</strong><p>Choose a baseline case with an observed failed property. Interrupted, blocked, and inconclusive outcomes do not qualify.</p></div></div>}
    <p className={s.minimizerScope}><CircleHelp size={13} />The result is minimal within this recipe grammar and seed. It is a tested witness, not a causal diagnosis or universal certification.</p>
  </section>;
}

function ReductionResult({ campaign, onInspect, onSelectCampaign }: { campaign: CampaignLabDTO; onInspect: (id: string, check?: string) => void; onSelectCampaign: (id: string) => void }) {
  const certificate = campaign.reduction;
  const parent = campaign.manifest.parent;
  if (!certificate || !parent) return <section className={s.minimizer}><h3>The reduction receipt is unavailable.</h3><p>Inspect the retained cases and export before making a minimality claim.</p></section>;
  const chosen = campaign.cases.find(item => item.id === certificate.chosenCaseId);
  const control = campaign.cases.find(item => item.id === certificate.controlCaseId);
  const baselineSubsets = campaign.cases.filter(item => item.revision === "faulty");
  const controlSubsets = campaign.cases.filter(item => item.revision === "hardened");
  const propertyCheck = (item: CampaignCaseDTO | undefined) => item?.result?.checks.find(check => check.id === parent.invariantId && check.version === parent.invariantVersion);
  const verified = certificate.status === "verified" && baselineSubsets.length === certificate.expectedSubsets && campaign.cases.every(item => item.status === "completed" && item.result)
    && chosen?.status === "completed" && control?.status === "completed" && chosen.recipeHash === control.recipeHash && chosen.seed === control.seed
    && propertyCheck(chosen)?.verdict === "fail" && propertyCheck(control)?.verdict === "pass";
  const original = parent.originalRecipe.components;
  const minimal = chosen?.recipe?.components;
  const discarded = campaign.cases.filter(item => certificate.discardedCaseIds.includes(item.id));
  const otherFailures = [chosen, control].flatMap(item => item?.status === "completed" ? item.result?.checks.filter(check => check.id !== certificate.property && check.verdict === "fail").map(check => ({ item, check })) ?? [] : []);
  const completedControls = controlSubsets.filter(item => item.status === "completed" && item.result).length;
  return <section className={s.reductionResult} data-verified={verified} aria-labelledby="reduction-title">
    <header className={s.sectionHeader}><div><span className={s.kicker}><Minimize2 size={13} />EXECUTED MINIMAL WITNESS</span><h3 id="reduction-title">{verified ? "The smaller recipe still breaks it." : certificate.status === "inconclusive" ? "Minimality remains unproven." : "Finding the smallest witness."}</h3></div><State label={verified ? certificate.property + " witness verified" : certificate.status === "inconclusive" ? "Inconclusive" : "Search in progress"} tone={verified ? "mint" : "amber"} /></header>
    <div className={s.reductionHero}><div className={s.reductionNumeral}><span>{original.length}</span><ArrowRight size={28} /><strong>{minimal ? minimal.length : "?"}</strong></div><div><strong>{verified ? "Components in the verified witness" : minimal ? "Smallest reproducing subset found so far" : "No reproducing subset has been retained yet"}</strong><p>{certificate.exploredSubsets}/{certificate.expectedSubsets} baseline subsets completed · {completedControls}/{controlSubsets.length} control runs completed</p><span>{parent.invariantId} · {parent.invariantVersion}</span></div></div>
    <div className={s.stripHeading}><span>ORIGINAL RECIPE</span><button className={s.textButton} onClick={() => onSelectCampaign(parent.campaignId)}>Open original campaign<ArrowUpRight size={12} /></button></div><ComponentStrip components={original} />
    <div className={s.stripHeading}><span>{verified ? "VERIFIED MINIMAL RECIPE" : minimal ? "CURRENT CANDIDATE · NOT YET CERTIFIED" : "REDUCED RECIPE · AWAITING EVIDENCE"}</span><small>same source · same seed · same property</small></div><ComponentStrip components={original} kept={minimal} pending={!minimal} />
    {chosen && control ? <div className={s.reductionChecks}>{[chosen, control].map(item => {
      const check = propertyCheck(item);
      return <button className={s.reductionCheck} key={item.id} onClick={() => onInspect(item.id, certificate.property)} data-tone={check && item.status === "completed" ? checkTone(check.verdict) : "amber"}><span>{item.revision === "faulty" ? "BASELINE WITNESS" : "MATCHED CONTROL"}</span><strong>{certificate.property}<IconForTone tone={check && item.status === "completed" ? checkTone(check.verdict) : "amber"} />{check && item.status === "completed" ? verdictLabel(check.verdict) : "Awaiting completion"}</strong><small>Overall case: {caseState(item).label}<ArrowUpRight size={12} /></small></button>;
    })}</div> : null}
    <div className={s.otherFailures}><span><TriangleAlert size={14} />Other properties stay in view.</span>{otherFailures.length ? <div>{otherFailures.map(({ item, check }) => <button key={item.id + check.id} className={s.otherFailure} onClick={() => onInspect(item.id, check.id)}>{item.revision === "faulty" ? "Baseline" : "Control"} · {check.id}<X size={11} />{check.name}<ArrowUpRight size={11} /></button>)}</div> : <p>{chosen && control && chosen.status === "completed" && control.status === "completed" ? "No additional failing checks in the chosen pair." : "Other checks are still being observed."}</p>}<p>A verified witness certifies only the selected property and bounded minimality. It does not turn the complete case or campaign green.</p></div>
    <div className={s.discarded}><header><span>SUBSETS THAT DID NOT PRESERVE {certificate.property}</span><strong>{discarded.length}</strong></header>{discarded.length ? <ul>{discarded.map(item => {
      const check = propertyCheck(item);
      return <li key={item.id}><button onClick={() => onInspect(item.id, certificate.property)}><span className={s.subsetSize}>{recipeComponents(item).length}<small>components</small></span><span>{recipeComponents(item).length ? recipeComponents(item).map(component => COMPONENTS[component].short).join(" + ") : "Empty recipe"}<small>{certificate.property + ": " + (check ? verdictLabel(check.verdict) : "No applicable check") + " · Overall: " + caseState(item).label}</small></span><ArrowUpRight size={13} /></button></li>;
    })}</ul> : <p>No discarded subset has a completed baseline receipt yet.</p>}</div>
    <div className={s.reductionScope}><Fingerprint size={15} /><p>Minimality is bounded to this grammar and seed, preserving {parent.invariantId}. Every baseline and control subset must complete, and the chosen baseline failure must pass on its matched control. Missing or interrupted cases leave minimality unproven. The original run remains unchanged.</p></div>
  </section>;
}

function SymptomGroups({ campaign, onInspect }: { campaign: CampaignLabDTO; onInspect: (id: string, check?: string) => void }) {
  return <section className={s.symptoms} aria-labelledby="symptoms-title"><header className={s.sectionHeader}><div><span className={s.kicker}>MEASURED SYMPTOMS</span><h3 id="symptoms-title">Shared failures. Open questions.</h3></div><span className={s.sectionCount}>{campaign.clusters.length}<small>GROUPS</small></span></header><p className={s.sectionDescription}>Grouped by the same failed property in completed baseline cases. A shared symptom does not establish a shared cause.</p>{campaign.clusters.length ? <div className={s.symptomGrid}>{campaign.clusters.map(cluster => <article className={s.symptomCard} key={cluster.id}><div><span className={s.symptomProperty}>{cluster.invariantId}</span><span>{cluster.caseIds.length} baseline case{cluster.caseIds.length === 1 ? "" : "s"}</span></div><h4>{cluster.title}</h4><p>{cluster.explanation}</p><footer><span>{cluster.witnessCount} witness reference{cluster.witnessCount === 1 ? "" : "s"}</span><div>{cluster.caseIds.map(id => {
    const item = campaign.cases.find(value => value.id === id);
    return item ? <button key={id} onClick={() => onInspect(id, cluster.invariantId)} aria-label={"Inspect " + cluster.invariantId + " in " + item.scenarioId}>{item.scenarioId}<ArrowUpRight size={11} /></button> : null;
  })}</div></footer></article>)}</div> : <div className={s.noSymptoms}><ScanLine size={20} /><p>{ACTIVE.has(campaign.status) ? "No completed baseline property failures have been grouped yet." : "No failing baseline property was observed in completed cases. Review unresolved and interrupted cases separately."}</p></div>}</section>;
}

function CampaignProgress({ campaign, onInspect }: { campaign: CampaignLabDTO; onInspect: (id: string) => void }) {
  const recent = campaign.events.slice(-5);
  const eventList = (events: CampaignLabDTO["events"]) => <ol className={s.eventList}>{events.map(event => <li key={event.sequence} data-kind={event.kind}><span className={s.eventDot} /><div><div className={s.eventMeta}><code>{String(event.sequence).padStart(3, "0")}</code><time dateTime={event.at}>{timeLabel(event.at)} UTC</time></div>{event.caseId && campaign.cases.some(item => item.id === event.caseId) ? <button onClick={() => onInspect(event.caseId!)}>{event.summary}<ArrowUpRight size={12} /></button> : <p>{event.summary}</p>}</div></li>)}</ol>;
  return <section className={s.progressCard}><header><span className={s.kicker}><Activity size={13} />DURABLE ACTIVITY</span><span>{campaign.events.length} retained</span></header><h3>{ACTIVE.has(campaign.status) ? "The work keeps its place." : "A history that stays attached."}</h3><p>Progress comes from saved events. Workers keep their saved position when you close this tab.</p>{recent.length ? eventList(recent) : <p>No event has been retained yet.</p>}{campaign.events.length > recent.length ? <details className={s.eventHistory}><summary>Read all {campaign.events.length} events<ChevronDown size={13} /></summary>{eventList(campaign.events)}</details> : null}<div className={s.progressFoot}><LockKeyhole size={12} /><span>Original identities · original expiry</span></div></section>;
}

function CaseInspector({ campaign, item, selectedCheckId, onClose }: { campaign: CampaignLabDTO; item: CampaignCaseDTO; selectedCheckId: string | null; onClose: () => void }) {
  const { refresh } = useWorkspace();
  const state = caseState(item);
  return <div className={s.inspectorContent}><header className={s.dialogHeader}><div><span className={s.kicker}>EXACT CASE / {item.scenarioId} / {item.revision === "faulty" ? "BASELINE" : "CONTROL"}</span><h2 id="case-inspector-title">{item.scenarioTitle}</h2></div><button className={s.iconButton} onClick={onClose} aria-label="Close case inspector"><X size={20} /></button></header><div className={s.inspectorStatus}><SourceChip source={campaign.manifest.source} /><State {...state} /><span>{item.result ? stageLabel(item.result.stage) : stageLabel(item.status)}</span></div>
    {item.reason ? <div className={s.savedReason}><TriangleAlert size={16} /><p>{item.reason}</p></div> : null}
    {item.result ? <>
      <div className={s.receiptCutoff} data-provisional={item.status !== "completed"}><Clock3 size={14} /><div><strong>{item.status === "completed" ? "Campaign receipt cutoff" : "Interrupted or provisional snapshot"}</strong><p>{dateLabel(item.result.finishedAt)}. {item.status === "completed" ? "This inspector shows the retained campaign receipt. Opening the run can include later observations." : "Raw recorded verdicts below are partial snapshots. They do not establish completed target proof or passing coverage."}</p></div></div>
      <div className={s.inspectorMoney}><div><span>OBSERVED CAPTURED</span><strong data-tone={state.tone}>{money(item.result.capturedMinor, item.result.currency)}</strong><small>{item.result.captureCount} capture{item.result.captureCount === 1 ? "" : "s"}{item.status !== "completed" ? " · partial observations" : ""}</small></div><div><span>REFUNDED</span><strong>{money(item.result.refundedMinor, item.result.currency)}</strong><small>{item.result.fulfillmentCount} fulfillment{item.result.fulfillmentCount === 1 ? "" : "s"}</small></div></div>
      <div className={s.inspectorLinks}><Link className={s.primaryButton} href={"/runs/" + item.runId} onClick={() => void refresh()}>Open exact run<ArrowUpRight size={14} /></Link><Link className={s.secondaryButton} href={"/reports/" + item.runId} onClick={() => void refresh()}><FileCheck2 size={14} />Run report</Link><span>{item.result.eventCount} retained observations</span></div>
      <div className={s.checkListHeading}><h3>{item.status === "completed" ? "Every evaluated property" : "Raw recorded check snapshots"}</h3><span>{item.status === "completed" ? "Saved result" : "Partial evidence · not passing coverage"}</span></div>
      <div className={s.checkList}>{item.result.checks.map(check => <InspectorCheck key={check.id} check={check} provisional={item.status !== "completed"} selected={check.id === selectedCheckId} />)}</div>
    </> : <div className={s.inspectorPending}><Clock3 size={27} /><h3>{item.status === "running" ? "The original case is claimed." : item.status === "pending" ? "This case has not executed yet." : "No completed receipt was retained."}</h3><p>The reserved run and request identities below remain inspectable. Money and checks are unknown until observations are saved.</p></div>}
    <div className={s.inspectorRecipe}><h3>Declared fault recipe</h3><ComponentStrip components={recipeComponents(item)} /></div>
    <details className={s.exactBinding}><summary><Fingerprint size={15} />Exact source & evidence binding<ChevronDown size={14} /></summary><dl className={s.exactMetadata}><div><dt>Case ID</dt><dd>{item.id}</dd></div><div><dt>Campaign ID</dt><dd>{campaign.id}</dd></div><div><dt>Run ID</dt><dd>{item.runId}</dd></div><div><dt>Request identity</dt><dd>{item.requestId}</dd></div><div><dt>Revision</dt><dd>{item.revision} · {item.sourceHash}</dd></div><div><dt>Scenario</dt><dd>{item.scenarioId} · {item.scenarioHash}</dd></div><div><dt>Recipe SHA-256</dt><dd>{item.recipeHash}</dd></div><div><dt>Exact case seed</dt><dd>{item.seed}</dd></div><div><dt>Manifest SHA-256</dt><dd>{campaign.manifestHash}</dd></div>{item.result ? <><div><dt>Evidence SHA-256</dt><dd>{item.result.evidenceHash}</dd></div><div><dt>Result source hash</dt><dd>{item.result.sourceHash}</dd></div><div><dt>Result scenario hash</dt><dd>{item.result.scenarioHash}</dd></div><div><dt>Result seed</dt><dd>{item.result.seed}</dd></div><div><dt>Receipt saved</dt><dd>{dateLabel(item.result.finishedAt)}</dd></div></> : null}</dl></details>
    <p className={s.inspectorScope}><FlaskConical size={14} />Controlled Sample execution. These observations do not represent new provider payments or a model evaluation.</p>
  </div>;
}

function InspectorCheck({ check, provisional, selected }: { check: CheckResult; provisional: boolean; selected: boolean }) {
  const tone = provisional ? "amber" : checkTone(check.verdict);
  return <details open={check.verdict === "fail" || selected} className={s.checkDetail} data-tone={tone}>
    <summary><span className={s.checkId}>{check.id}</span><span>{check.name}<small>{check.version}</small></span><State label={(provisional ? "Recorded: " : "") + verdictLabel(check.verdict)} tone={tone} /><ChevronDown size={14} /></summary>
    <div className={s.checkDetailBody}><p>{check.reason}</p><dl><div><dt>Expected</dt><dd>{check.expected}</dd></div><div><dt>Observed</dt><dd>{check.observed}</dd></div></dl>
      <div className={s.witnesses}><span><Link2 size={12} />Witness event IDs</span>{check.witnessEventIds.length ? <div>{check.witnessEventIds.map(id => <code key={id}>{id}</code>)}</div> : <p>No witness event IDs are attached to this check.</p>}</div>
    </div>
  </details>;
}
