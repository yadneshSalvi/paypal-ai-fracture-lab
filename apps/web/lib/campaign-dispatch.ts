import { getRun, start } from "workflow/api";
import { HookConflictError } from "workflow/errors";
import { executeCampaignWorkflow } from "../workflows/campaign";
import { getCampaignLab } from "./campaign-lab";

/** The SQL queue is authoritative. A lost start answer reuses this exact versioned hook. */
export async function dispatchCampaign(id: string) {
  const lab = await getCampaignLab();
  const { version, status } = await lab.store.dispatchIdentity(id);
  if (!["queued", "running", "waiting"].includes(status)) return null;
  let workflowId: string;
  try { workflowId = (await start(executeCampaignWorkflow, [id], { experimental_hook: { token: `campaign:${id}:${version}`, experimental_minRetention: "30 days" } })).runId; }
  catch (error) {
    if (!HookConflictError.is(error) || !error.conflictingRunId) throw error;
    workflowId = error.conflictingRunId;
    const owner = getRun(workflowId);
    const state = await owner.status;
    if (["completed", "failed", "cancelled"].includes(state)) {
      await lab.store.continuationStopped(id, version, workflowId, state);
      return null;
    }
    await owner.wakeUp();
  }
  await lab.store.recordWorkflow(id, version, workflowId);
  return workflowId;
}
