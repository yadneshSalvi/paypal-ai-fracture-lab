import type { EnumSchema } from "../core/validation/schema.js";
export declare const PatchOp: {
    readonly Add: "add";
    readonly Remove: "remove";
    readonly Replace: "replace";
    readonly Move: "move";
    readonly Copy: "copy";
    readonly Test: "test";
};
export type PatchOp = (typeof PatchOp)[keyof typeof PatchOp] | (string & {});
export declare const patchOpSchema: EnumSchema<PatchOp>;
