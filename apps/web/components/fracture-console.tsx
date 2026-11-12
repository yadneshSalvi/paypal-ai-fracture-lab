"use client";

import { useEffect } from "react";
import Link from "next/link";
import dynamic from 'next/dynamic';
import { AppShell, LoadingWorkspace } from "./app-shell";
import { BrambleStorefront } from "./bramble-phone";
import { EmptyState, SourceChip } from "./primitives";
import { CampaignsView, MapView, ProjectsView, ScenarioStudio } from "./project-views";
import { RepairsView } from "./repair-views";
import { ContractView, EvidenceView, ProviderFactsView } from "./proof-views";
import { ErrandView } from "./research-views";
import { JudgeTour } from "./judge-tour";
import type { JudgeRecorded } from "./judge-recorded";
import { TandemView } from './tandem-view';
import { ReportView } from "./report-view";
import { NoRun, RunWorkbench } from "./run-workbench";
import { useSelectedRun, useWorkspace } from "./workspace-provider";

const EvaluationsView=dynamic(()=>import('./evaluation-view').then(module=>module.EvaluationsView),{loading:()=> <div className="quiet-empty" role="status">Opening the context study…</div>});

export type Screen = "run" | "projects" | "map" | "scenarios" | "campaigns" | "repairs" | "contract" | "facts" | "evidence" | "evaluations" | "errand" | "tandem" | "judge" | "report";
export function FractureConsole({ screen, runId, projectId, repairId, recorded = null, tourStep }: { screen: Screen; runId?: string; projectId?: string; repairId?: string; recorded?: JudgeRecorded | null; tourStep?: number }) {
  const { workspace, loading, refresh, setActiveProjectId, setActiveRunId } = useWorkspace();
  const run = useSelectedRun(runId, projectId);
  useEffect(() => {
    if (projectId) setActiveProjectId(projectId);
    if (runId) {
      setActiveRunId(runId);
      const project = workspace?.runs.find(item => item.id === runId)?.projectId;
      if (project) setActiveProjectId(project);
    }
  }, [projectId, runId, workspace, setActiveProjectId, setActiveRunId]);
  let content;
  if (screen === "evaluations") content = <EvaluationsView />;
  else if (loading) content = <LoadingWorkspace />;
  else if (!workspace) content = <EmptyState title="Your session could not be opened." action={<><button className="button primary" onClick={() => void refresh(true)}>Try again</button><Link className="button secondary" href="/observations" prefetch={false}>Open the recorded observations</Link></>}>The interactive lab needs a session and none could be started just now. The recorded PayPal Sandbox observations need no session and stay available.</EmptyState>;
  else if (runId && !workspace.runs.some(item => item.id === runId)) content = <EmptyState title="This run isn’t in your session." action={<><Link className="button primary" href="/judge">Open the guided tour</Link><Link className="button secondary" href="/runs">Open this session’s run</Link></>}>Runs belong to the session that created them. This link points at a run from an earlier or different session; your current session has its own sample run.</EmptyState>;
  else if (projectId && !workspace.projects.some(item => item.id === projectId)) content = <EmptyState title="Project not found." action={<Link className="button primary" href="/projects">Open your projects</Link>}>This project is not registered in your current sample session.</EmptyState>;
  else if (screen === "projects") content = <ProjectsView />;
  else if (screen === "map") content = <MapView />;
  else if (screen === "scenarios") content = <ScenarioStudio />;
  else if (screen === "campaigns") content = <CampaignsView />;
  else if (screen === "repairs") content = <RepairsView {...(runId ? { runId } : {})} {...(repairId ? { repairId } : {})} />;
  else if (screen === "contract") content = <ContractView />;
  else if (screen === "facts") content = <ProviderFactsView />;
  else if (screen === "evidence") content = <EvidenceView />;
  else if (screen === "errand") content = <ErrandView />;
  else if (screen === 'tandem' || projectId === 'tandem') content = <TandemView />;
  else if (screen === "judge") content = <JudgeTour recorded={recorded} {...(tourStep ? { initialStep: tourStep } : {})} />;
  else if (screen === "report") content = run ? <ReportView run={run} /> : <NoRun />;
  else if(projectId === "errand" || run?.projectId === "errand") content = <ErrandView />;
  else content = run ? <RunWorkbench run={run} /> : <NoRun />;
  return <AppShell>{content}</AppShell>;
}

export function BramblePageClient({ runId, sequence }: { runId?: string; sequence?: number }) {
  const { workspace, loading, busy, act, error, refresh } = useWorkspace();
  const selected = useSelectedRun(runId, "bramble");
  const run = runId ? workspace?.runs.find(item => item.id === runId && item.projectId === "bramble") : selected;
  if (loading) return <div className="bramble-standalone-loading">Opening the saved storefront…</div>;
  if (!workspace) return <div className="bramble-standalone-loading"><span>The workspace service is disconnected.</span><button onClick={() => void refresh()}>Reconnect</button><Link href="/">Return to the lab</Link></div>;
  if (!run) return <div className="bramble-standalone-loading">This run isn’t available. <Link href="/">Return to Fracture Lab</Link></div>;
  if (run.source === "live_sandbox") return <div className="bramble-standalone-loading"><Link className="button primary" href={`/live-bramble?runId=${run.id}`}>Continue the live sandbox experiment</Link></div>;
  const event = run.events.find(item => item.sequence === sequence) ?? run.events.at(-1);
  const projection = event?.projection ?? { phoneState: run.phoneState, applicationStatus: run.applicationStatus, providerStatus: run.providerStatus, capturedMinor: run.capturedMinor, refundedMinor: run.refundedMinor, captureCount: run.captureCount, fulfillmentCount: run.fulfillmentCount, currency: run.currency };
  return <main className="bramble-standalone"><div className="bramble-lab-banner"><Link href={`/runs/${run.id}`}>← Fracture Lab</Link><SourceChip source={run.source} /><span>Fictional merchant</span></div><div className="standalone-storefront"><BrambleStorefront run={run} projection={projection} busy={Boolean(busy)} onAdvance={() => void act(run.id, "advance")} /></div>{error ? <p className="bramble-error" role="alert">{error}</p> : null}<p className="standalone-provenance">This page renders a deterministic sample run.<br />It does not call PayPal or collect a payment.</p></main>;
}
