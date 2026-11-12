"use client";

import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { FractureConsole } from "@/components/fracture-console";
import { EmptyState } from "@/components/primitives";
import { useWorkspace } from "@/components/workspace-provider";

/** A report link opened outside the session that owns the run explains itself; it never falls through to another run. */
export function ReportScreen({ runId }: { runId: string }) {
  const { workspace, loading } = useWorkspace();
  if (!loading && workspace && !workspace.runs.some(run => run.id === runId)) return <AppShell><EmptyState title="This report belongs to another session." action={<Link className="button primary" href="/projects">Open your own workspace</Link>}>Run reports are private to the isolated judge session that produced them, so this link opens the report only in that browser session. Nothing from that session is shown here. Ask whoever shared the link for the standalone HTML or JSON export of the report, or reproduce the run in your own session from the scenario and seed listed in that export.</EmptyState></AppShell>;
  return <FractureConsole screen="report" runId={runId} />;
}
