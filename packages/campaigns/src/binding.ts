import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { canonicalJson, sha256 } from "@fracture/paypal-core";
import type { CampaignBinding } from "../../contracts/src/campaign-lab";
import { artifactPath } from "../../service/src/config";

const runtimePaths = [
  "packages/campaigns/src/analysis.ts", "packages/campaigns/src/binding.ts", "packages/campaigns/src/gate.ts", "packages/campaigns/src/recipes.ts", "packages/campaigns/src/runtime.ts", "packages/campaigns/src/store.ts", "packages/campaigns/src/schema.ts", "packages/campaigns/src/followups.ts",
  "packages/contracts/src/campaign-lab.ts", "packages/contracts/src/index.ts", "packages/service/src/index.ts", "packages/service/src/executor.ts", "packages/service/src/store.ts", "packages/service/src/types.ts", "packages/ai/src/diagnosis.ts", "packages/scenarios/src/index.ts", "packages/invariants/src/index.ts", "packages/runner/src/local-provider.ts",
  "apps/fixtures/bramble/contract.ts", "apps/fixtures/bramble/faulty.ts", "apps/fixtures/bramble/hardened.ts", "package-lock.json", "vendor/fracture-paypal-core-0.2.2.tgz", "node_modules/paypal/package.json",
];
const contextPaths = ["paypal-plan.md", "apps/fixtures/bramble/paypal-plan.md", ".agents/skills/typescript-integrate-paypal/SKILL.md", ".agents/skills/typescript-getting-started/SKILL.md", ".agents/skills/typescript-configuration-resilience/SKILL.md", "node_modules/paypal/sdk-map.md"];

export async function campaignBinding(): Promise<CampaignBinding> {
  const hash = async (path: string) => ({ path, sha256: createHash("sha256").update(await readFile(artifactPath(path))).digest("hex") });
  const [files, context] = await Promise.all([Promise.all(runtimePaths.map(hash)), Promise.all(contextPaths.map(hash))]);
  const sdk = { package: "paypal" as const, version: "2.29.0" as const, commit: "5d0df8a8817e5fdf2e2cd48e68f790ea4730aab2", coreVersion: "0.2.2" as const, coreArchiveHash: files.find(file => file.path === "vendor/fracture-paypal-core-0.2.2.tgz")!.sha256 };
  const revisions = (["faulty", "hardened"] as const).map(revision => ({ revision, ...files.find(file => file.path === `apps/fixtures/bramble/${revision}.ts`)! }));
  return { runtimeHash: sha256(canonicalJson({ files, context, sdk })), files, revisions, sdk, context };
}
