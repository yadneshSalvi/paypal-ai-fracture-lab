import { canonicalJson, sha256 } from "@fracture/paypal-core";
import type { FaultComponent, FaultRecipe } from "../../contracts/src/campaign-lab";
import type { FaultPlan } from "../../service/src/types";
import { noFaults } from "../../service/src/types";
import { LabError } from "../../service/src/errors";

export const componentLabels: Record<FaultComponent, string> = {
  lost_capture_answer: "Lose the committed capture answer",
  malformed_capture_answer: "Return a malformed capture answer",
  unavailable_reread: "Make the original reread unavailable",
  never_sent_auth: "Refuse authentication before dispatch",
  capture_pending: "Keep the capture pending",
  harness_denial: "Intervene at the lab boundary",
  customer_retry: "Let the customer retry the same purchase",
};
const recipes: Record<string, FaultComponent[]> = {
  S0: ["lost_capture_answer", "customer_retry"],
  S3: ["lost_capture_answer", "unavailable_reread", "customer_retry"],
  S4: ["never_sent_auth"],
  S5: ["malformed_capture_answer", "customer_retry"],
  S10: ["harness_denial"],
  A4: ["capture_pending"],
};
export const campaignScenarioIds = Object.keys(recipes);
export function recipeForScenario(scenarioId: string): FaultRecipe {
  const components = recipes[scenarioId];
  if (!components) throw new LabError("RECIPE_NOT_SUPPORTED", "This case has no qualified campaign recipe.", 409);
  return { version: "fracture.recipe/v1", components: [...components] };
}
export function recipeHash(recipe: FaultRecipe) { return sha256(canonicalJson(recipe)); }
export function recipeFaults(recipe: FaultRecipe): FaultPlan {
  if (recipe.version !== "fracture.recipe/v1" || recipe.components.length > 3 || new Set(recipe.components).size !== recipe.components.length || recipe.components.some(component => !Object.hasOwn(componentLabels, component))) {
    throw new LabError("RECIPE_INVALID", "The saved fault recipe is outside the bounded grammar.", 409);
  }
  const has = (component: FaultComponent) => recipe.components.includes(component);
  return { ...noFaults, dropCaptureResponse: has("lost_capture_answer"), malformedSuccess: has("malformed_capture_answer"), unavailableReread: has("unavailable_reread"), authFailure: has("never_sent_auth"), capturePending: has("capture_pending"), policyDenial: has("harness_denial") };
}
/** All subsets, including the original. A smaller trace must preserve the chosen property, not merely any failure. */
export function reductionRecipes(original: FaultRecipe): FaultRecipe[] {
  recipeFaults(original);
  const variants: FaultRecipe[] = [];
  for (let mask = 0; mask < 2 ** original.components.length; mask++) {
    variants.push({ version: "fracture.recipe/v1", components: original.components.filter((_, index) => (mask & (1 << index)) !== 0) });
  }
  return variants.sort((left, right) => left.components.length - right.components.length || recipeHash(left).localeCompare(recipeHash(right)));
}
