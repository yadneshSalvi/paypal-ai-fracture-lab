import { getService } from "@fracture/service";
import { ToolkitInvestigations } from "../../../packages/ai/src/investigations";

export async function getToolkitInvestigations() {
  return new ToolkitInvestigations((await getService()).store);
}
