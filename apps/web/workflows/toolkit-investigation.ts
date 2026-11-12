import { sleep } from "workflow";
import { advanceToolkitInvestigation } from "./toolkit-investigation-step";

export async function executeToolkitInvestigation(id: string) {
  "use workflow";
  for (;;) {
    const result = await advanceToolkitInvestigation(id);
    if (result.done) return result;
    await sleep(result.status === "running" ? "5s" : "1s");
  }
}
