import { z } from "zod";
import { SCENARIO_IDS, SOURCE_EXECUTION_PROTOCOL, SOURCE_ADAPTER_VERSION, SOURCE_LIMITS } from "./limits";
export const hashSchema = z.string().regex(/^[a-f0-9]{64}$/);
export const portableSourcePath = z.string().min(1).max(SOURCE_LIMITS.maxPathLength).regex(/^[a-zA-Z0-9_./-]+$/).refine(value => !value.startsWith("/") && value.split("/").every(part => part !== "" && part !== "." && part !== "..") && !value.includes("node_modules/"), "Use an exact portable snapshot-relative path without traversal.");
export const sourceExecutionOwnerSchema = z.strictObject({ sessionId: z.uuid(), grantId: z.uuid() });
export const sourcePrepareSchema = z.strictObject({ importId: z.uuid(), entryPath: portableSourcePath, expectedRevisionHash: hashSchema, scenarioIds: z.array(z.enum(SCENARIO_IDS)).min(1).max(9).refine(ids => new Set(ids).size === ids.length, "Select each public case once."), seed: z.string().min(1).max(100).regex(/^[a-zA-Z0-9:_-]+$/), requestId: z.uuid() });
export const sourceApproveSchema = z.strictObject({ planId: z.uuid(), expectedPlanHash: hashSchema, requestId: z.uuid() });
export const sourceCancelSchema = z.strictObject({ jobId: z.uuid(), requestId: z.uuid() });
export const sourcePlanIdSchema = z.strictObject({ planId: z.uuid() });
export const sourceJobIdSchema = z.strictObject({ jobId: z.uuid() });
export const sourceListSchema = z.strictObject({ limit: z.number().int().min(1).max(50).default(20) });
export const sourceFileSchema = z.strictObject({ path: portableSourcePath, hash: hashSchema, bytes: z.number().int().min(0).max(SOURCE_LIMITS.maxFileBytes), content: z.string().max(SOURCE_LIMITS.maxFileBytes) });
const runnerCommon = { protocol: z.literal(SOURCE_EXECUTION_PROTOCOL), snapshotHash: hashSchema, runnerHash: hashSchema, suiteHash: hashSchema, adapterHash: hashSchema, dependencyHash: hashSchema };
export const dockerRunnerIdentitySchema = z.strictObject({ ...runnerCommon, engine: z.literal("docker"), imageId: z.string().regex(/^sha256:[a-f0-9]{64}$/) });
export const cloudRunnerIdentitySchema = z.strictObject({ ...runnerCommon, engine: z.literal("vercel-sandbox"), snapshotId: z.string().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/) });
export const runnerIdentitySchema = z.discriminatedUnion("engine", [dockerRunnerIdentitySchema, cloudRunnerIdentitySchema]);
export const authorityBindingSchema = z.strictObject({ sessionId: z.uuid(), grantIdHash: hashSchema, grantSecretFingerprint: hashSchema, importId: z.uuid(), sessionExpiresAt: z.iso.datetime(), grantExpiresAt: z.iso.datetime(), importExpiresAt: z.iso.datetime(), expiresAt: z.iso.datetime() });
export const closureSchema = z.strictObject({ entryPath: portableSourcePath, files: z.array(sourceFileSchema).min(1).max(SOURCE_LIMITS.maxFiles), edges: z.array(z.strictObject({ from: portableSourcePath, specifier: z.string().min(1).max(240), to: portableSourcePath.nullable(), typeOnly: z.boolean() })).max(4096), totalBytes: z.number().int().nonnegative().max(SOURCE_LIMITS.maxBytes), closureHash: hashSchema });
export const sourcePlanSchema = z.strictObject({ protocol: z.literal(SOURCE_EXECUTION_PROTOCOL), id: z.uuid(), importId: z.uuid(), snapshotId: z.string().regex(/^sws_[a-f0-9]{64}$/), revisionHash: hashSchema, sourceManifestHash: hashSchema, createdAt: z.iso.datetime(), expiresAt: z.iso.datetime(), authority: authorityBindingSchema, entryPath: portableSourcePath, exportName: z.literal("checkout"), adapterVersion: z.literal(SOURCE_ADAPTER_VERSION), adapterHash: hashSchema, suiteHash: hashSchema, scenarioManifestHash: hashSchema, scenarioIds: z.array(z.enum(SCENARIO_IDS)).min(1).max(9), seed: z.string().min(1).max(100), runner: runnerIdentitySchema, closure: closureSchema, limitations: z.array(z.string()), planHash: hashSchema });
export const caseBindingSchema = z.strictObject({ protocol: z.literal(SOURCE_EXECUTION_PROTOCOL), jobId: z.uuid(), caseId: z.uuid(), executionId: z.string().regex(/^fracture-source-[a-f0-9-]{36}$/), importId: z.uuid(), snapshotId: z.string(), revisionHash: hashSchema, sourceManifestHash: hashSchema, closureHash: hashSchema, planId: z.uuid(), planHash: hashSchema, adapterHash: hashSchema, suiteHash: hashSchema, scenarioManifestHash: hashSchema, scenarioId: z.enum(SCENARIO_IDS), scenarioHash: hashSchema, seed: z.string(), runner: runnerIdentitySchema });
export const executionBundleSchema = z.strictObject({ binding: caseBindingSchema, entryPath: portableSourcePath, files: z.array(sourceFileSchema).min(1).max(SOURCE_LIMITS.maxFiles), edges: closureSchema.shape.edges, deadlineAt: z.iso.datetime(), limits: z.literal(SOURCE_EXECUTION_PROTOCOL), bundleHash: hashSchema });
export const assertionSchema = z.strictObject({ id: z.string().min(1).max(80), passed: z.boolean() });
export const compilerResultSchema = z.strictObject({ status: z.enum(["passed", "rejected", "timeout", "not_started"]), version: z.literal("typescript@5.9.3"), diagnostics: z.string().max(16000), diagnosticsHash: hashSchema });
export const disposalSchema = z.strictObject({ state: z.enum(["confirmed", "unknown", "not_created"]), runtimeId: z.string().max(200).nullable(), removed: z.boolean(), verifiedAbsent: z.boolean() });
const isolationCommon = { configurationVerified: z.boolean(), referenceFilesystem: z.literal("read_only"), hostMounts: z.literal(0), candidateUid: z.literal(1000), supervisorUid: z.literal(0), candidateCapabilities: z.literal("none"), noNewPrivileges: z.literal(true), supervisorCapabilities: z.tuple([z.literal("SETUID"), z.literal("SETGID")]), credentialsForwarded: z.literal(false), deadlineMs: z.literal(SOURCE_LIMITS.caseDeadlineMs), outputLimitBytes: z.literal(SOURCE_LIMITS.outputBytes) };
export const dockerIsolationSchema = z.strictObject({ ...isolationCommon, engine: z.literal("docker"), imageId: z.string().regex(/^sha256:[a-f0-9]{64}$/), network: z.literal("none"), rootFilesystem: z.literal("read_only"), memoryBytes: z.literal(SOURCE_LIMITS.memoryBytes), pidsLimit: z.literal(SOURCE_LIMITS.pids) });
/** Cloud is a future, separately qualified adapter contract. This package does not implement cloud execution. */
export const cloudIsolationSchema = z.strictObject({ ...isolationCommon, engine: z.literal("vercel-sandbox"), snapshotId: z.string().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/), network: z.literal("deny_all"), rootFilesystem: z.literal("writable"), referenceOwner: z.literal("root"), candidateUser: z.literal("candidate"), vmTimeoutMs: z.number().int().min(SOURCE_LIMITS.caseDeadlineMs).max(120000), vcpus: z.number().int().min(1).max(4) });
export const isolationBoundarySchema = z.discriminatedUnion("engine", [dockerIsolationSchema, cloudIsolationSchema]);
export const sourceReceiptSchema = z.strictObject({ protocol: z.literal(SOURCE_EXECUTION_PROTOCOL), binding: caseBindingSchema, bundleHash: hashSchema, status: z.enum(["passed", "failed", "compiler_rejected", "timeout", "output_limited", "protocol_rejected", "inconclusive", "cancelled"]), compiler: compilerResultSchema, assertions: z.array(assertionSchema).max(20), observation: z.record(z.string(), z.unknown()).nullable(), observationHash: hashSchema, targetOutputHash: hashSchema, targetOutputBytes: z.number().int().nonnegative(), isolation: isolationBoundarySchema, disposal: disposalSchema, startedAt: z.iso.datetime(), finishedAt: z.iso.datetime(), receiptHash: hashSchema });
export type SourceExecutionOwner = z.infer<typeof sourceExecutionOwnerSchema>;
export type SourcePrepareInput = z.infer<typeof sourcePrepareSchema>;
export type SourceApproveInput = z.infer<typeof sourceApproveSchema>;
export type SourceCancelInput = z.infer<typeof sourceCancelSchema>;
export type SourcePlan = z.infer<typeof sourcePlanSchema>;
export type SourceClosure = z.infer<typeof closureSchema>;
export type SourceRunnerIdentity = z.infer<typeof runnerIdentitySchema>;
export type SourceAuthorityBinding = z.infer<typeof authorityBindingSchema>;
export type SourceCaseBinding = z.infer<typeof caseBindingSchema>;
export type SourceExecutionBundle = z.infer<typeof executionBundleSchema>;
export type SourceExecutionReceipt = z.infer<typeof sourceReceiptSchema>;
export interface SourceExecutor { execute(bundle: SourceExecutionBundle, signal: AbortSignal): Promise<SourceExecutionReceipt> }
export type SourceCaseState = "pending" | "dispatched" | "passed" | "failed" | "compiler_rejected" | "timeout" | "output_limited" | "protocol_rejected" | "inconclusive" | "cancelled";
export type SourceJobState = "queued" | "claimed" | "running" | "passed" | "failed" | "inconclusive" | "cancel_requested" | "cancelled_confirmed" | "cancelled_uncertain";
export interface SourceCaseDTO { id: string; scenarioId: typeof SCENARIO_IDS[number]; status: SourceCaseState; executionId: string; dispatchedAt: string | null; finishedAt: string | null; receiptHash: string | null; errorCode: string | null }
export interface SourceJobDTO { id: string; planId: string; planHash: string; importId: string; status: SourceJobState; createdAt: string; expiresAt: string; cancelledAt: string | null; finishedAt: string | null; errorCode: string | null; cases: SourceCaseDTO[] }
export interface SourceExecutionEvent { id: string; sequence: number; jobId: string; at: string; kind: string; caseId: string | null; detail: string; digest: string }
export interface SourceExecutionClaim { jobId: string; workerId: string; token: string; leaseUntil: string }
export interface SourceCommandReceipt { requestId: string; action: "prepare" | "approve" | "cancel"; inputHash: string; acceptedAt: string; status: "accepted" | "rejected"; resourceId: string | null; errorCode: string | null; message: string | null }
