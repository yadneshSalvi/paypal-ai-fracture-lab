import { dockerRunnerIdentitySchema, type SourceRunnerIdentity } from "../../source-execution/src/schemas";
import { PUBLIC_SUITE_HASH } from "../../source-execution/src/limits";
import { SourceExecutionError } from "../../source-execution/src/errors";
import { sourceCloudConfiguration } from "../../source-execution/src/cloud";

/** Explicit local owner configuration only. A hosted deployment never selects the Docker lane. */
export function localDockerRunnerIdentity(env: NodeJS.ProcessEnv = process.env) {
  const raw = env.FRACTURE_SOURCE_EXECUTION_DOCKER_RUNNER_JSON;
  if (!raw || env.VERCEL === "1" || env.VERCEL_DEPLOYMENT_ID) return null;
  try { const identity = dockerRunnerIdentitySchema.parse(JSON.parse(raw)); if (identity.suiteHash !== PUBLIC_SUITE_HASH) throw new Error(); return identity; }
  catch { throw new SourceExecutionError("SOURCE_EXECUTION_RUNNER_UNAVAILABLE", "The local Docker source-execution runner identity is invalid. Configure the exact qualified image identity before preparing a plan.", 503); }
}
/** New plans bind the qualified local Docker image when the owner configured one; otherwise the hosted snapshot. */
export function sourceRunnerIdentity(env: NodeJS.ProcessEnv = process.env): SourceRunnerIdentity { return localDockerRunnerIdentity(env) ?? sourceCloudConfiguration(env).identity; }
