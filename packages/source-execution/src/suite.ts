import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import ts from "typescript";
import { z } from "zod";
import type { FaultPlan } from "../../service/src/types";
import { objectHash, sha256 } from "./hash";
import { PUBLIC_SUITE_HASH, SCENARIO_IDS } from "./limits";
export interface SourcePublicCase { id: typeof SCENARIO_IDS[number]; name: string; faults: Partial<FaultPlan>; calls: number; expected: { captures: number; fulfillments: number; phone?: string }; concurrent?: boolean; revoked?: boolean; changedAmount?: boolean; requireIdentity?: boolean }
// Next's server webpack uses a relative-URL shim for new URL(import.meta.url),
// which is not a filesystem URL. Resolve the traced public file from the
// trusted application working directory without loading config or .env.
function publicSuiteFile(){
  let directory=process.cwd();
  for(let depth=0;depth<7;depth++){
    const candidate=join(directory,"packages/isolation/runner/suite.ts");
    if(existsSync(candidate))return candidate;
    const parent=dirname(directory);if(parent===directory)break;directory=parent;
  }
  throw new Error("SOURCE_EXECUTION_PUBLIC_SUITE_UNAVAILABLE");
}
const file = readFileSync(publicSuiteFile(), "utf8");
if (sha256(file) !== PUBLIC_SUITE_HASH) throw new Error("SOURCE_EXECUTION_PUBLIC_SUITE_CHANGED");
const ast = ts.createSourceFile("immutable-public-suite.ts", file, ts.ScriptTarget.ES2022, true);
/** Read literal declarations only. Importing the suite would evaluate its unrelated application/config modules. */
function literal(node: ts.Node): unknown {
  if (ts.isStringLiteral(node) || ts.isNumericLiteral(node)) return ts.isNumericLiteral(node) ? Number(node.text) : node.text;
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (ts.isArrayLiteralExpression(node)) return node.elements.map(literal);
  if (ts.isObjectLiteralExpression(node)) {
    const value: Record<string,unknown> = {};
    for (const property of node.properties) {
      if (!ts.isPropertyAssignment(property) || !(ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)) || Object.hasOwn(value, property.name.text) || ["__proto__","constructor","prototype"].includes(property.name.text)) throw new Error("SOURCE_EXECUTION_PUBLIC_SUITE_NONLITERAL");
      value[property.name.text] = literal(property.initializer);
    }
    return value;
  }
  throw new Error("SOURCE_EXECUTION_PUBLIC_SUITE_NONLITERAL");
}
const declarations = ast.statements.flatMap(statement => ts.isVariableStatement(statement) ? [...statement.declarationList.declarations] : []).filter(declaration => ts.isIdentifier(declaration.name) && declaration.name.text === "cases");
if (declarations.length !== 1 || !declarations[0]!.initializer) throw new Error("SOURCE_EXECUTION_PUBLIC_SUITE_MISSING");
const publicCaseSchema = z.strictObject({ id: z.enum(SCENARIO_IDS), name: z.string().min(1).max(120), faults: z.strictObject({ dropCaptureResponse: z.boolean().optional(), malformedSuccess: z.boolean().optional(), unavailableReread: z.boolean().optional(), capturePending: z.boolean().optional(), authFailure: z.boolean().optional() }), calls: z.number().int().min(1).max(8), expected: z.strictObject({ captures: z.number().int().nonnegative(), fulfillments: z.number().int().nonnegative(), phone: z.string().optional() }), concurrent: z.boolean().optional(), revoked: z.boolean().optional(), changedAmount: z.boolean().optional(), requireIdentity: z.boolean().optional() });
const values = z.array(publicCaseSchema).length(9).parse(literal(declarations[0]!.initializer));
export const PUBLIC_CASES: readonly SourcePublicCase[] = Object.freeze(values.map(item => Object.freeze(item))) as readonly SourcePublicCase[];
if (PUBLIC_CASES.map(item => item.id).join(",") !== SCENARIO_IDS.join(",")) throw new Error("SOURCE_EXECUTION_PUBLIC_SUITE_CHANGED");
export const SCENARIO_MANIFEST_HASH = objectHash({ suiteHash: PUBLIC_SUITE_HASH, cases: PUBLIC_CASES });
export const sourceScenario = (id: typeof SCENARIO_IDS[number]) => { const item = PUBLIC_CASES.find(item => item.id === id); if (!item) throw new Error("SOURCE_EXECUTION_SCENARIO_UNSUPPORTED"); return { definition: structuredClone(item), hash: objectHash(item) }; };
