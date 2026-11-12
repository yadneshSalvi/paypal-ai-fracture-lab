import { sourceReceiptSchema } from "./schemas";
import type { SourceExecutionBundle, SourceExecutionReceipt } from "./schemas";
import { canonical, objectHash, sha256 } from "./hash";
import { integrityFailed } from "./errors";
export const PUBLIC_ASSERTION_IDS = ["capture_count", "fulfillment_count", "phone_state", "amount_bound", "unknown_not_failed", "stable_identity", "allowed_refusals", "authoritative_reread"] as const;
export function verifySourceReceipt(value: unknown, bundle: SourceExecutionBundle): SourceExecutionReceipt {
  const receipt = sourceReceiptSchema.parse(value), { receiptHash, ...body } = receipt;
  if (objectHash(body) !== receiptHash || canonical(receipt.binding) !== canonical(bundle.binding) || receipt.bundleHash !== bundle.bundleHash || receipt.observationHash !== objectHash(receipt.observation) || receipt.compiler.diagnosticsHash !== sha256(receipt.compiler.diagnostics) || Date.parse(receipt.finishedAt) < Date.parse(receipt.startedAt) || receipt.targetOutputBytes > 2_000_000) throw integrityFailed();
  const runner = bundle.binding.runner;
  if (receipt.isolation.engine !== runner.engine || receipt.isolation.engine === "docker" && (runner.engine !== "docker" || receipt.isolation.imageId !== runner.imageId) || receipt.isolation.engine === "vercel-sandbox" && (runner.engine !== "vercel-sandbox" || receipt.isolation.snapshotId !== runner.snapshotId)) throw integrityFailed();
  if (["passed", "failed"].includes(receipt.status)) {
    if (!receipt.isolation.configurationVerified || receipt.compiler.status !== "passed" || !receipt.observation || receipt.assertions.map(item => item.id).join(",") !== PUBLIC_ASSERTION_IDS.join(",") || (receipt.status === "passed") !== receipt.assertions.every(item => item.passed)) throw integrityFailed();
  }
  if (receipt.status === "compiler_rejected" && receipt.compiler.status !== "rejected") throw integrityFailed();
  if (receipt.isolation.engine === "docker") {
    if ("engine" in receipt.disposal || receipt.disposal.state === "confirmed" && (!receipt.disposal.removed || !receipt.disposal.verifiedAbsent)) throw integrityFailed();
  } else {
    if (!("engine" in receipt.disposal) || receipt.disposal.engine !== "vercel-sandbox" || receipt.disposal.state === "confirmed" && (!receipt.disposal.stopped || !receipt.disposal.nonResumingReadVerified || !["stopped", "aborted", "failed"].includes(receipt.disposal.status ?? ""))) throw integrityFailed();
  }
  return receipt;
}
