import { getService } from "../packages/service/src/index";
import { CampaignLab } from "../packages/campaigns/src/runtime";

const once = process.argv.includes("--once");
const service = await getService(); const lab = new CampaignLab(service.store);
let stopping = false;
process.on("SIGINT", () => { stopping = true; });
process.on("SIGTERM", () => { stopping = true; });
try {
  do {
    for (const id of await lab.store.pending()) {
      if (stopping) break;
      const result = await lab.advance(id);
      process.stdout.write(`${JSON.stringify({ id, status: result.status, source: "sample" })}\n`);
      if (once) break;
    }
    if (!once && !stopping) await new Promise(resolve => setTimeout(resolve, 1500));
  } while (!once && !stopping);
} finally { await service.store.db.close(); }
