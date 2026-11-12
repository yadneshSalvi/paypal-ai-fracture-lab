"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {usePathname} from 'next/navigation';
import type { ApiEnvelope, ApiFailure, EvidenceDTO, Revision, RunDTO, WorkspaceDTO } from "@fracture/contracts";
import { hasExecutingWorkspaceWork } from "../lib/workspace-polling";

type RunAction = "advance" | "diagnose" | "repair" | "verify" | "remediate" | "cancel" | "cancel_work" | "generate" | "verify_generated";
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
  refresh: (dismissError?: boolean) => Promise<WorkspaceDTO | null>;
  createRun: (projectId: string, scenarioId: string, revision: Revision, seed?: string) => Promise<RunDTO | null>;
  act: (runId: string, action: RunAction, candidate?: "grounded" | "deceptive", repairId?: string) => Promise<WorkspaceDTO | null>;
  createCampaign: (projectId: string, revision: Revision, scenarioIds: string[]) => Promise<boolean>;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);
type WorkspaceEntry = "sample" | "source" | "read";
let initialization: { entry: WorkspaceEntry; promise: Promise<WorkspaceDTO | null> } | null = null;
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

async function readWorkspace(entry: WorkspaceEntry = "sample") {
    const response = await fetch("/api/workspace", { credentials: "same-origin", cache: "no-store" });
    if (response.status === 401) {
      if (entry === "read") return null;
      return api<WorkspaceDTO>(entry === "source" ? "/api/source-workspaces/session" : "/api/judge/sessions", {});
    }
    if (!response.ok) throw new Error("The workspace service is disconnected. Reconnect when the service is available.");
    const envelope = await response.json() as ApiEnvelope<WorkspaceDTO>;
    if (!envelope.data) throw new Error("The workspace response was incomplete. Try reconnecting.");
    return envelope.data;
}

function initializeWorkspace(entry: WorkspaceEntry) {
  if (!initialization || initialization.entry !== entry) {
    const promise = readWorkspace(entry).finally(() => { if (initialization?.promise === promise) initialization = null; });
    initialization = { entry, promise };
  }
  return initialization.promise;
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const researchPage = pathname.startsWith('/evaluations');
  const sourcePage = pathname.startsWith('/sources');
  const entry: WorkspaceEntry = sourcePage ? "source" : pathname.startsWith("/ai-workbench") ? "read" : "sample";
  const [workspace, setWorkspace] = useState<WorkspaceDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [activeProjectId, setActiveProjectId] = useState("bramble");
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [evidenceId, setEvidenceId] = useState<string | null>(null);
  const mounted = useRef(true);
  const errorKind = useRef<"load"|"action"|null>(null);
  const activeCommand = useRef<string|null>(null);

  const refresh = useCallback(async (dismissError=false) => {
    try {
      const next = await readWorkspace(entry);
      if (mounted.current) { setWorkspace(next); if(dismissError || errorKind.current === "load"){setError(null);errorKind.current=null;} }
      return next;
    } catch (cause) {
      if (mounted.current && errorKind.current !== "action") {errorKind.current="load";setError(cause instanceof Error ? cause.message : "Could not load the workspace.");}
      return null;
    }
  }, [entry]);

  useEffect(() => {
    mounted.current = true;
    let cancelled = false;
    if(researchPage){
      setLoading(false);
      if(errorKind.current!=='action'){setError(null);errorKind.current=null;}
      return ()=>{cancelled=true;mounted.current=false;};
    }
    setLoading(true);
    async function initialize() {
      try {
        const next = await initializeWorkspace(entry);
        if (!cancelled) { setWorkspace(next); setError(null); }
      } catch (cause) {
        if (!cancelled) {errorKind.current='load';setError(cause instanceof Error ? cause.message : "Could not start your sample session.");}
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void initialize();
    return () => { cancelled = true; mounted.current = false; };
  }, [researchPage, entry]);

  const hasRunningWork = !researchPage && hasExecutingWorkspaceWork(workspace, busy);
  useEffect(() => { if (activeCommand.current && workspace?.work?.some(work => work.id === activeCommand.current && ["completed", "failed", "cancelled"].includes(work.status))) setBusy(null); }, [workspace]);
  useEffect(() => {
    if (!hasRunningWork) return;
    let inFlight = false;
    const interval = window.setInterval(() => {
      if (document.visibilityState !== "visible" || inFlight) return;
      inFlight = true;
      void refresh().finally(() => { inFlight = false; });
    }, 1800);
    return () => window.clearInterval(interval);
  }, [hasRunningWork, refresh]);

  const createRun = useCallback(async (projectId: string, scenarioId: string, revision: Revision, seed?: string) => {
    setBusy("create-run"); errorKind.current="action";setError(null);
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

  const act = useCallback(async (runId: string, action: RunAction, candidate?: "grounded" | "deceptive", repairId?: string) => {
    setBusy(`${action}:${runId}`); errorKind.current="action";setError(null);
    const requestId=crypto.randomUUID(); activeCommand.current=requestId;
    try {
      await api<unknown>(`/api/runs/${encodeURIComponent(runId)}/actions`, { action, ...(candidate ? { candidate } : {}), ...(repairId ? {repairId} : {}), requestId });
      const next = await refresh();
      const messages: Record<RunAction, string> = {
        generate: "Repair queued. The repair worker will save its contract bindings and generated source.",
        verify_generated: "Verification queued for the exact saved candidate. Follow its independent results below.",
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
    setBusy("create-campaign"); errorKind.current="action";setError(null);
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
