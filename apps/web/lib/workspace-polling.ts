import type { WorkspaceDTO } from "@fracture/contracts";

type ProgressState = {
  runs: Pick<WorkspaceDTO["runs"][number], "stage">[];
  campaigns: Pick<WorkspaceDTO["campaigns"][number], "status">[];
  work: Pick<WorkspaceDTO["work"][number], "status">[];
};
const executingStages = new Set(["created", "preflight", "provisioning", "executing", "observing", "evaluating"]);

/** Awaiting a deliberate customer action is idle; its action handler refreshes after submission. */
export function hasExecutingWorkspaceWork(workspace: ProgressState | null, busy: string | null) {
  return Boolean(busy) || Boolean(workspace && (
    workspace.runs.some(run => executingStages.has(run.stage)) ||
    workspace.campaigns.some(campaign => campaign.status === "running") ||
    workspace.work.some(work => work.status === "running")
  ));
}
