import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";
import { withWorkflow } from "workflow/next";

// Keep local workflow state outside build output, including Next.js worker processes.
if (process.env.VERCEL !== "1" && !process.env.VERCEL_DEPLOYMENT_ID) {
  process.env.WORKFLOW_TARGET_WORLD = "local";
  process.env.WORKFLOW_LOCAL_DATA_DIR ??= fileURLToPath(new URL("../../.artifacts/workflow-data", import.meta.url));
}

const repairContextFiles = ["../../paypal-plan.md", "../../apps/fixtures/bramble/*.ts", "../../apps/fixtures/errand/*", "../../apps/fixtures/tandem/*.py", "../../node_modules/@paypal/agent-toolkit/openai/**", "../../packages/ai/src/toolkit-read-worker.mjs", "../../apps/fixtures/bramble/paypal-plan.md", "../../packages/contracts/src/index.ts", "../../packages/service/src/types.ts", "../../packages/service/src/store.ts", "../../packages/isolation/src/capabilities.ts", "../../packages/isolation/runner/suite.ts", "../../node_modules/paypal/sdk-map.md", "../../node_modules/paypal/map/operations/{orders,payments}.md", "../../node_modules/@fracture/paypal-core/dist/*.d.ts", "../../.agents/skills/typescript-*/SKILL.md", "../../docs/evidence/*.json", "../../evaluation/studies/fracture-context-2026-11-v1/*.json"];

const config: NextConfig = {
  distDir: process.env.FRACTURE_EVALUATION_QA === 'build' ? '.next-evaluation-build' : process.env.FRACTURE_EVALUATION_QA === '1' ? '.next-evaluation-qa' : '.next',
  outputFileTracingRoot: fileURLToPath(new URL("../..", import.meta.url)),
  outputFileTracingIncludes: {"/api/**":[...repairContextFiles,"../../tests/application.test.ts","../../packages/{service,runner,invariants,campaigns}/src/*.ts","../../packages/ai/src/diagnosis.ts","../../packages/contracts/src/campaign-lab.ts","../../packages/scenarios/src/index.ts","../../package-lock.json","../../node_modules/paypal/package.json","../../vendor/fracture-paypal-core-0.2.2.tgz"],"/api/evaluations/**":["../../evaluation/studies/fracture-context-2026-11-v1/*.json","../../evaluation/corpus/tasks/**/*","../../evaluation/controls/*.json.gz","./public/evaluations/fracture-context-2026-11-v1/candidates/*.json.gz"],"/.well-known/workflow/**":[...repairContextFiles,"../../packages/{service,runner,invariants,campaigns}/src/*.ts","../../packages/ai/src/diagnosis.ts","../../packages/contracts/src/campaign-lab.ts","../../packages/scenarios/src/index.ts","../../package-lock.json","../../node_modules/paypal/package.json","../../vendor/fracture-paypal-core-0.2.2.tgz"]},
  outputFileTracingExcludes: {"/**":["../../.env*","../../plans/**","../../.artifacts/**","../../.local/**","../../.setup-evidence/**","../../.git/**"]},
  turbopack: {root:fileURLToPath(new URL("../..", import.meta.url))},
  serverExternalPackages: ["pg", "better-sqlite3", "paypal", "@paypal/agent-toolkit", "tsx"],
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
