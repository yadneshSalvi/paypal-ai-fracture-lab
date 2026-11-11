import type { Schema } from "../core/validation/schema.js";
import { type TenureType } from "./tenure-type.js";
export type CycleExecution = {
    tenureType: TenureType;
    sequence: number;
    cyclesCompleted: number;
    cyclesRemaining?: number;
    currentPricingSchemeVersion?: number;
    totalCycles?: number;
};
export declare const cycleExecutionSchema: Schema<CycleExecution>;
