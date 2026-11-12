import { getService } from "../../../../../packages/service/src/index";
import { handleRemoteMcp } from "../../../../../packages/developer-tools/src/remote-mcp";
import { dispatchRepair } from "@/lib/repair-dispatch";
import { dispatchCampaign } from "@/lib/campaign-dispatch";
import { dispatchSourceExecution } from "@/lib/source-execution-dispatch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 240;

async function handle(request: Request) {
  const durable = process.env.VERCEL === "1" || process.env.FRACTURE_DURABLE_WORKFLOW === "1";
  return handleRemoteMcp(request, {
    origin: process.env.FRACTURE_REMOTE_MCP_ORIGIN,
    allowLoopback: process.env.FRACTURE_REMOTE_MCP_ALLOW_LOOPBACK === "1" && process.env.VERCEL !== "1",
    getService,
    ...(durable ? { dispatchRepair, dispatchCampaign, dispatchSourceExecution } : {}),
  });
}

export { handle as POST, handle as GET, handle as DELETE, handle as PUT, handle as PATCH, handle as HEAD, handle as OPTIONS };
