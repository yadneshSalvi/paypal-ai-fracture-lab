"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { ApiEnvelope, ApiFailure, EvidenceDTO, Revision, RunDTO, WorkspaceDTO } from "@fracture/contracts";

type RunAction = "advance" | "diagnose" | "repair" | "verify" | "remediate" | "cancel" | "cancel_work";
type WorkspaceContextValue = {
  workspace: WorkspaceDTO | null;
  loading: boolean;
  error: string | null;
  busy: string | null;
  notice: string | null;
  activeProjectId: string;
  activeRunId: string | null;
  evidence: EvidenceDTO | null;
  setActiveProjectId: (id: string) => void;
  setActiveRunId: (id: string) => void;
  openEvidence: (id: string) => void;
  closeEvidence: () => void;
  dismissNotice: () => void;
  refresh: () => Promise<WorkspaceDTO | null>;
  createRun: (projectId: string, scenarioId: string, revision: Revision, seed?: string) => Promise<RunDTO | null>;
  act: (runId: string, action: RunAction, candidate?: "grounded" | "deceptive") => Promise<WorkspaceDTO | null>;
  createCampaign: (projectId: string, revision: Revision, scenarioIds: string[]) => Promise<boolean>;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);
const finalStages = new Set(["completed", "failed_infrastructure", "cancelled_reconciled", "cancelled_uncertain", "inconclusive"]);
let initialization: Promise<WorkspaceDTO> | null = null;
class WorkspaceRequestError extends Error { constructor(message:string,readonly code:string){super(message);} }

async function api<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method: body === undefined ? "GET" : "POST",
    credentials: "same-origin",
    cache: "no-store",
    ...(body === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
  });
  if (!response.headers.get("content-type")?.includes("application/json")) {
    throw new Error("The workspace service is not connected. Start the service and reconnect.");
  }
  const result = await response.json() as ApiEnvelope<T> | ApiFailure;
  if (!response.ok || "error" in result) {
    const message = "error" in result ? result.error.message : `Request failed (${response.status})`;
    throw new WorkspaceRequestError(message, "error" in result ? result.error.code : "REQUEST_FAILED");
  }
  return result.data;
}

async function readWorkspace() {
    const response = await fetch("/api/workspace", { credentials: "same-origin", cache: "no-store" });
    if (response.status === 401) return api<WorkspaceDTO>("/api/judge/sessions", {});
    if (!response.ok) throw new Error("The workspace service is disconnected. Reconnect when the service is available.");
    const envelope = await response.json() as ApiEnvelope<WorkspaceDTO>;
    if (!envelope.data) throw new Error("The workspace response was incomplete. Try reconnecting.");
    return envelope.data;
}

function initializeWorkspace() {
  if (!initialization) initialization = readWorkspace().catch(cause => { initialization = null; throw cause; });
  return initialization;
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspace, setWorkspace] = useState<WorkspaceDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [activeProjectId, setActiveProjectId] = useState("bramble");
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [evidenceId, setEvidenceId] = useState<string | null>(null);
  const mounted = useRef(true);
  const activeCommand = useRef<string|null>(null);

  const refresh = useCallback(async () => {
    try {
      const next = await readWorkspace();
      if (mounted.current) { setWorkspace(next); setError(null); }
      return next;
    } catch (cause) {
      if (mounted.current) setError(cause instanceof Error ? cause.message : "Could not load the workspace.");
      return null;
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    let cancelled = false;
    async function initialize() {
      try {
        const next = await initializeWorkspace();
        if (!cancelled) { setWorkspace(next); setError(null); }
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Could not start your sample session.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void initialize();
    return () => { cancelled = true; mounted.current = false; };
  }, []);

  const hasRunningWork = Boolean(busy) || workspace?.runs.some(run => !finalStages.has(run.stage)) || workspace?.campaigns.some(campaign => campaign.status === "running") || workspace?.work?.some(work => work.status === "running");
  useEffect(() => { if (activeCommand.current && workspace?.work?.some(work => work.id === activeCommand.current && ["completed", "failed", "cancelled"].includes(work.status))) setBusy(null); }, [workspace]);
  useEffect(() => {
    if (!hasRunningWork) return;
    const interval = window.setInterval(() => { if (document.visibilityState === "visible") void refresh(); }, 1800);
    return () => window.clearInterval(interval);
  }, [hasRunningWork, refresh]);

  const createRun = useCallback(async (projectId: string, scenarioId: string, revision: Revision, seed?: string) => {
    setBusy("create-run"); setError(null);
    try {
      const run = await api<RunDTO>("/api/runs", { projectId, scenarioId, revision, mode: "sample", requestId: crypto.randomUUID(), ...(seed ? { seed } : {}) });
      setActiveRunId(run.id); setActiveProjectId(projectId);
      await refresh();
      setNotice("Sample run saved. Every observation is available in its evidence record.");
      return run;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The run could not start.");
      return null;
    } finally { setBusy(null); }
  }, [refresh]);

  const act = useCallback(async (runId: string, action: RunAction, candidate?: "grounded" | "deceptive") => {
    setBusy(`${action}:${runId}`); setError(null);
    const requestId=crypto.randomUUID(); activeCommand.current=requestId;
    try {
      await api<unknown>(`/api/runs/${encodeURIComponent(runId)}/actions`, { action, ...(candidate ? { candidate } : {}), requestId });
      const next = await refresh();
      const messages: Record<RunAction, string> = {
        advance: "The sample journey advanced. The saved trace is up to date.",
        diagnose: "The read-only sample experiment is recorded with its receipt.",
        repair: "The candidate is saved. Review its diff, citations, and policy checks.",
        verify: "Verification completed. Inspect the unchanged tests and comparison run.",
        remediate: "Sample compensation recorded. The original charge history is preserved.",
        cancel: "Cancellation recorded. Existing observations remain available.",
        cancel_work: "Investigation cancellation recorded. Existing evidence is preserved.",
      };
      setNotice(messages[action]);
      return next;
    } catch (cause) {
      if(cause instanceof WorkspaceRequestError && cause.code === "WORK_CANCELLED") setNotice(cause.message);
      else setError(cause instanceof Error ? cause.message : "The action could not be completed.");
      return null;
    } finally { if(activeCommand.current===requestId) { setBusy(null); activeCommand.current=null; } }
  }, [refresh]);

  const createCampaign = useCallback(async (projectId: string, revision: Revision, scenarioIds: string[]) => {
    setBusy("create-campaign"); setError(null);
    try {
      await api<unknown>("/api/campaigns", { projectId, revision, scenarioIds, requestId: crypto.randomUUID() });
      await refresh(); setNotice("Sample campaign saved. Each matrix result opens its own run.");
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The campaign could not start.");
      return false;
    } finally { setBusy(null); }
  }, [refresh]);

  return <WorkspaceContext.Provider value={{
    workspace, loading, error, busy, notice, activeProjectId, activeRunId,
    evidence: workspace?.evidence.find(item => item.id === evidenceId) ?? null,
    setActiveProjectId, setActiveRunId, openEvidence: setEvidenceId, closeEvidence: () => setEvidenceId(null),
    dismissNotice: () => setNotice(null), refresh, createRun, act, createCampaign,
  }}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error("WorkspaceProvider is missing.");
  return context;
}

export function useSelectedRun(runId?: string, projectId?: string) {
  const { workspace, activeProjectId, activeRunId } = useWorkspace();
  if (!workspace) return null;
  const id = runId ?? activeRunId ?? workspace.selectedRunId;
  const targetProject = projectId ?? activeProjectId;
  const selected = workspace.runs.find(run => run.id === id && (runId ? !projectId || run.projectId === projectId : run.projectId === targetProject));
  return selected ?? workspace.runs.find(run => run.projectId === targetProject) ?? null;
}
