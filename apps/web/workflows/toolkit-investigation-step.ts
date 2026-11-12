import { getToolkitInvestigations } from "../lib/toolkit-investigations";

export async function advanceToolkitInvestigation(id: string) {
  "use step";
  return (await getToolkitInvestigations()).advance(id);
}

// A worker that dies after a provider create has an unknown outcome. The SQL
// journal, not an automatic step retry, decides whether anything may continue.
advanceToolkitInvestigation.maxRetries = 0;
