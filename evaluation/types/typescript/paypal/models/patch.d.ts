import type { Schema } from "../core/validation/schema.js";
import { type PatchOp } from "./patch-op.js";
export type Patch = {
    op: PatchOp;
    path?: string;
    value?: Record<string, unknown>;
    from?: string;
};
export declare const patchSchema: Schema<Patch>;
