import { pathToFileURL } from "node:url";
import { getService } from "../../../packages/service/src/index";
import { DeveloperAccess, initializeCredential, readCredential } from "../../../packages/developer-tools/src/access";
import { DeveloperRuntime, safeDeveloperError, toolDefinitions } from "../../../packages/developer-tools/src/runtime";

export async function main(argv: string[]) {
  if (!argv.length || argv[0] === "help") return { usage: "npm run cli -- init | status | revoke | call <tool> '<JSON arguments>'", tools: Object.keys(toolDefinitions), scope: "Private 24-hour owner session. Curated Sample experiments and separately approved adapted source closures in the qualified isolated runner. No live payments, dependency installation or arbitrary application launch. Browser views have separate read-only approval." };
  const service = await getService();
  try {
    const access = new DeveloperAccess(service);
    await access.initialize();
    if (argv[0] === "init" && argv.length === 1) {
      const result = await initializeCredential(access);
      return { created: result.created, sessionId: result.session.id, expiresAt: result.session.expiresAt, source: "sample", credential: "Stored privately; never printed." };
    }
    const credential = await readCredential();
    if (argv[0] === "status" && argv.length === 1) {
      const session = await access.authorize(credential);
      return { sessionId: session.id, expiresAt: session.expiresAt, source: "sample", livePayments: false };
    }
    if (argv[0] === "revoke" && argv.length === 1) { await access.revoke(credential); return { revoked: true, retainedEvidence: true }; }
    if (argv[0] !== "call" || argv.length !== 3 || argv[2]!.length > 4096) throw new Error("invalid command");
    return await new DeveloperRuntime(service, credential).call(argv[1]!, JSON.parse(argv[2]!));
  } finally { await service.store.db.close(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { process.stdout.write(JSON.stringify(await main(process.argv.slice(2)), null, 2) + "\n"); }
  catch (error) { process.stderr.write(JSON.stringify(safeDeveloperError(error)) + "\n"); process.exitCode = 1; }
}
