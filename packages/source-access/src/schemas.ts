import { z } from "zod";
import { assertSecretFree } from "../../source-workspaces/src/policy";

function safeMetadata(value: string) {
  try { assertSecretFree(value, []); return true; } catch { return false; }
}
export const sourceRootIdSchema = z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/).refine(safeMetadata);
export const sourceMetadataSchema = z.strictObject({
  rootId: sourceRootIdSchema,
  path: z.string().min(1).max(240).refine(value => value === "." || (!value.startsWith("/") && !/[\\:\u0000-\u001f\u007f]/.test(value) && value.split("/").every(part => part !== "" && part !== "." && part !== ".."))).refine(safeMetadata),
  title: z.string().trim().min(1).max(80).regex(/^[\p{L}\p{N} .,'()_-]+$/u).refine(safeMetadata),
});
export const sourceImportSchema = sourceMetadataSchema.extend({
  requestId: z.uuid(),
});
export const sourceApprovalSchema = z.strictObject({ connectionId: z.uuid(), importId: z.uuid(), requestId: z.uuid() });
export const sourceIdSchema = z.strictObject({ importId: z.uuid() });
export const sourceFileSchema = z.strictObject({ importId: z.uuid(), path: z.string().min(1).max(500), expectedHash: z.string().regex(/^[a-f0-9]{64}$/) });
export const sourceChangeSchema = z.strictObject({ importId: z.uuid(), requestId: z.uuid() });
