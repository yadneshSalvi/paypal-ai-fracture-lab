import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";
import { withWorkflow } from "workflow/next";

// Keep local workflow state outside build output, including Next.js worker processes.
if (process.env.VERCEL !== "1" && !process.env.VERCEL_DEPLOYMENT_ID) {
  process.env.WORKFLOW_TARGET_WORLD = "local";
  process.env.WORKFLOW_LOCAL_DATA_DIR ??= fileURLToPath(new URL("../../.artifacts/workflow-data", import.meta.url));
}

const repairContextFiles = ["../../paypal-plan.md", "../../apps/fixtures/bramble/*.ts", "../../apps/fixtures/bramble/paypal-plan.md", "../../packages/contracts/src/index.ts", "../../packages/service/src/types.ts", "../../packages/service/src/store.ts", "../../packages/isolation/src/capabilities.ts", "../../packages/isolation/runner/suite.ts", "../../node_modules/paypal/sdk-map.md", "../../node_modules/paypal/map/operations/{orders,payments}.md", "../../node_modules/@fracture/paypal-core/dist/*.d.ts", "../../.agents/skills/typescript-*/SKILL.md", "../../docs/evidence/*.json"];

const config: NextConfig = {
  outputFileTracingRoot: fileURLToPath(new URL("../..", import.meta.url)),
  outputFileTracingIncludes: {"/api/**":repairContextFiles,"/.well-known/workflow/**":repairContextFiles},
  outputFileTracingExcludes: {"/**":["../../.env*","../../plans/**","../../.artifacts/**","../../.setup-evidence/**","../../.git/**"]},
  turbopack: {root:fileURLToPath(new URL("../..", import.meta.url))},
  serverExternalPackages: ["pg", "better-sqlite3", "paypal", "@paypal/agent-toolkit"],
  poweredByHeader: false,
  async headers() {
    return [{source:"/(.*)", headers:[
      {key:"X-Content-Type-Options",value:"nosniff"},
      {key:"Referrer-Policy",value:"strict-origin-when-cross-origin"},
      {key:"Permissions-Policy",value:"camera=(), microphone=(), geolocation=()"}
    ]}];
  }
};
export default withWorkflow(config);
