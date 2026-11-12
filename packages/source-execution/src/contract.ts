/** Virtual, type-only import; never a runtime entrypoint. */
export type { BrambleContext, WireOrder } from "../../../apps/fixtures/bramble/contract";
export type { RunDTO } from "../../contracts/src/index";
export type CheckoutTarget = (context: import("../../../apps/fixtures/bramble/contract").BrambleContext) => Promise<unknown>;
