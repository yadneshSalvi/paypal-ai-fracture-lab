import { z } from "zod";
import { SOURCE_EXECUTION_PROTOCOL } from "./limits";
import { caseBindingSchema, hashSchema, compilerResultSchema, assertionSchema, sourceReceiptSchema } from "./schemas";
export const supervisorResultSchema = z.strictObject({ protocol: z.literal(SOURCE_EXECUTION_PROTOCOL), binding: caseBindingSchema, bundleHash: hashSchema, status: sourceReceiptSchema.shape.status, compiler: compilerResultSchema, assertions: z.array(assertionSchema).max(20), observation: z.record(z.string(), z.unknown()).nullable(), observationHash: hashSchema, targetOutputHash: hashSchema, targetOutputBytes: z.number().int().nonnegative(), startedAt: z.iso.datetime(), finishedAt: z.iso.datetime(), supervisorProof: z.strictObject({ uid: z.literal(0), effectiveCapabilities: z.literal("00000000000000c0"), noNewPrivileges: z.literal(true), immutableReferenceVerified: z.literal(true), sourceBeforeAfterVerified: z.literal(true), candidate: z.strictObject({ uid: z.union([z.literal(1000), z.literal(1001)]), gid: z.union([z.literal(1000), z.literal(1001)]), effectiveCapabilities: z.literal("0000000000000000"), permittedCapabilities: z.literal("0000000000000000"), noNewPrivileges: z.literal(true) }).nullable() }) }).superRefine((value, context) => {
  const expected = value.binding.runner.engine === "vercel-sandbox" ? 1001 : 1000;
  const candidate = value.supervisorProof.candidate;
  if (candidate && (candidate.uid !== expected || candidate.gid !== expected)) context.addIssue({ code: "custom", message: "Candidate UID must match the approved runner engine." });
});
export type SourceSupervisorResult = z.infer<typeof supervisorResultSchema>;
