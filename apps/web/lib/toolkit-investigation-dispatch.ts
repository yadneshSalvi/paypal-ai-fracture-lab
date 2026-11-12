import { getRun, start } from "workflow/api";
import { HookConflictError } from "workflow/errors";
import { executeToolkitInvestigation } from "../workflows/toolkit-investigation";
import { getToolkitInvestigations } from "./toolkit-investigations";

/** A lost start acknowledgement always resolves the same versioned workflow. */
export async function dispatchToolkitInvestigation(id: string) {
  const investigations = await getToolkitInvestigations();
  const { version, status } = await investigations.dispatchIdentity(id);
  if (!["queued", "running"].includes(status)) return null;
  let workflowId: string;
  try {
    workflowId = (await start(executeToolkitInvestigation, [id], {
      experimental_hook: { token: `toolkit-investigation:${id}:${version}`, experimental_minRetention: "30 days" },
    })).runId;
  } catch (error) {
    if (!HookConflictError.is(error) || !error.conflictingRunId) throw error;
    workflowId = error.conflictingRunId;
    // Persist the known owner before reconciling a lost acknowledgement.
    await investigations.recordWorkflow(id, version, workflowId);
    const owner = getRun(workflowId);
    const state = await owner.status;
    if (["completed", "failed", "cancelled"].includes(state)) {
      await investigations.workflowStopped(id, version, workflowId);
      return null;
    }
    await owner.wakeUp();
  }
  await investigations.recordWorkflow(id, version, workflowId);
  return workflowId;
}
