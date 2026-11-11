import type { EnumSchema } from "../core/validation/schema.js";
export declare const TaxIdType: {
    readonly BrCpf: "BR_CPF";
    readonly BrCnpj: "BR_CNPJ";
};
export type TaxIdType = (typeof TaxIdType)[keyof typeof TaxIdType] | (string & {});
export declare const taxIdTypeSchema: EnumSchema<TaxIdType>;
