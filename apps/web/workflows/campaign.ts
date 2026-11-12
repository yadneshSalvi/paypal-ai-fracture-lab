import { sleep } from "workflow";
import { advanceCampaign } from "./campaign-step";

export async function executeCampaignWorkflow(id: string) {
  "use workflow";
  for (;;) {
    const result = await advanceCampaign(id);
    if (result.done) return result;
    await sleep(result.status === "waiting" ? "10s" : "1s");
  }
}
