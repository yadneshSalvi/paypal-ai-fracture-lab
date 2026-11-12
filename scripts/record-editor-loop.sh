#!/usr/bin/env bash
# Records one real coding-agent session against the local Fracture Lab stdio MCP server.
# The agent gets a scratch developer kit (docs/editor-loop/kit plus public reference declarations)
# and a narrow tool allowlist. Execution approval and the Docker run stay with the owner (this script).
# Sample provider model only: no PayPal request is made anywhere in this loop.
#
#   scripts/record-editor-loop.sh setup  <workdir> <session-name> [full|minimal]
#   EDITOR_LOOP_MODEL=<alias> selects the agent model for start/resume/say (default: the CLI default)
#   scripts/record-editor-loop.sh start  <workdir>                 # first agent turn (task prompt)
#   scripts/record-editor-loop.sh owner  <workdir> <planId>        # owner: review hash, approve, run in Docker
#   scripts/record-editor-loop.sh resume <workdir> <planId> <jobId> # next agent turn (results are ready)
#   scripts/record-editor-loop.sh say    <workdir> "<message>"      # any other owner message, recorded verbatim
#
# Requires: Node 22, local PostgreSQL from .env, the qualified local source-execution image, the `claude` CLI.
set -euo pipefail
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
CLAUDE_BIN="${CLAUDE_BIN:-claude}"
RUNNER_JSON="${FRACTURE_SOURCE_EXECUTION_DOCKER_RUNNER_JSON:?Set the exact qualified local Docker runner identity JSON}"
command="${1:?command}"; workdir="${2:?workdir}"
kit="$workdir/bramble-checkout-kit"; control="$workdir/control"
cli() { (cd "$REPO" && node --import tsx apps/cli/src/index.ts "$@"); }
uuid() { node -e 'console.log(require("node:crypto").randomUUID())'; }
load_env() {
  export FRACTURE_WORKSPACE_ROOT="$REPO"
  export FRACTURE_DEVELOPER_CREDENTIAL_FILE="$(cat "$control/credential-path")"
  export FRACTURE_SOURCE_ROOTS="[{\"id\":\"bramble-kit\",\"directory\":\"$kit\"}]"
  export FRACTURE_SOURCE_EXECUTION_DOCKER_RUNNER_JSON="$RUNNER_JSON"
}
ALLOWED="Read,Write,Edit,Glob,Grep"
for tool in list_source_roots import_source_workspace list_source_workspaces get_source_workspace read_source_file check_source_changes prepare_source_execution get_source_execution_plan get_source_execution get_source_execution_results list_source_executions get_source_execution_command get_provider_facts list_experiments; do ALLOWED="$ALLOWED,mcp__fracture-lab__$tool"; done
agent() { # $1 = prompt text, remaining = extra claude flags
  local prompt="$1"; shift
  printf '%s\n' "$prompt" >> "$control/prompts.txt"; printf -- '-----\n' >> "$control/prompts.txt"
  (cd "$kit" && MAX_MCP_OUTPUT_TOKENS=60000 "$CLAUDE_BIN" -p "$prompt" --output-format stream-json --verbose \
    --mcp-config "$control/mcp.json" --strict-mcp-config --setting-sources project --settings "$control/settings.json" \
    --disable-slash-commands --tools "Read,Write,Edit,Glob,Grep" --allowedTools "$ALLOWED" ${EDITOR_LOOP_MODEL:+--model "$EDITOR_LOOP_MODEL"} "$@" < /dev/null) >> "$control/transcript.jsonl"
}
case "$command" in
  setup)
    name="${3:?session name}"; [[ "$name" =~ ^[a-z0-9-]{1,40}$ ]] || { echo "bad session name" >&2; exit 2; }
    [[ ! -e "$workdir" ]] || { echo "workdir exists" >&2; exit 2; }
    mkdir -p "$kit/checkout" "$kit/reference/fracture-paypal-core" "$kit/reference/paypal-sdk/operations" "$control"; chmod 700 "$control"
    variant="${4:-full}"
    cp "$REPO/docs/editor-loop/kit/reference/source-target.d.ts" "$kit/reference/source-target.d.ts"
    if [[ "$variant" == "minimal" ]]; then
      # Minimal kit: interface description only. No payment-core declarations, no APIMatic SDK map, no pointer to other tools.
      cp "$REPO/docs/editor-loop/kit-minimal/README.md" "$kit/README.md"; rmdir "$kit/reference/fracture-paypal-core" "$kit/reference/paypal-sdk/operations" "$kit/reference/paypal-sdk"
    else
      cp "$REPO/docs/editor-loop/kit/README.md" "$kit/README.md"
      cp "$REPO"/node_modules/@fracture/paypal-core/dist/*.d.ts "$kit/reference/fracture-paypal-core/"
      cp "$REPO/node_modules/paypal/sdk-map.md" "$kit/reference/paypal-sdk/sdk-map.md"
      cp "$REPO/node_modules/paypal/map/operations/orders.md" "$REPO/node_modules/paypal/map/operations/payments.md" "$kit/reference/paypal-sdk/operations/"
    fi
    echo "$variant" > "$control/kit-variant"
    mkdir -p "$REPO/.local/editor-loop"; chmod 700 "$REPO/.local/editor-loop"
    echo "$REPO/.local/editor-loop/$name-session.json" > "$control/credential-path"
    load_env
    # Private configuration lives in $control, outside the agent's working directory and outside Git.
    node -e 'const [file,repo,roots,runner,cred]=process.argv.slice(1);require("fs").writeFileSync(file,JSON.stringify({mcpServers:{"fracture-lab":{command:"/bin/sh",args:["-c","cd \"$FRACTURE_WORKSPACE_ROOT\" && exec node --import tsx apps/mcp/src/index.ts"],env:{FRACTURE_WORKSPACE_ROOT:repo,FRACTURE_SOURCE_ROOTS:roots,FRACTURE_SOURCE_EXECUTION_DOCKER_RUNNER_JSON:runner,FRACTURE_DEVELOPER_CREDENTIAL_FILE:cred}}}},null,2),{mode:0o600})' "$control/mcp.json" "$REPO" "$FRACTURE_SOURCE_ROOTS" "$RUNNER_JSON" "$FRACTURE_DEVELOPER_CREDENTIAL_FILE"
    printf '%s\n' '{"permissions":{"deny":["Read(//Users/**)","Edit(//Users/**)","Read(//private/tmp/**/control/**)","Edit(//private/tmp/**/control/**)","Bash","WebFetch","WebSearch","Agent"]}}' > "$control/settings.json"
    cli init | node -e 'let s="";process.stdin.on("data",c=>s+=c).on("end",()=>{const d=JSON.parse(s);console.log(JSON.stringify({developerSessionId:d.sessionId,expiresAt:d.expiresAt,created:d.created}))})' | tee "$control/developer-session.json"
    : > "$control/transcript.jsonl"; : > "$control/prompts.txt"; : > "$control/owner-actions.jsonl"
    echo "kit: $kit"
    ;;
  start)
    load_env
    agent "You are working in a developer kit for the Bramble Books checkout. Read README.md first. Implement the checkout module it describes in the checkout/ folder, then submit it for checking through the fracture-lab MCP tools as the README describes. When you have a prepared plan, report its plan ID and plan hash and stop. I am the project owner: I will review, approve and run the plan, then give you the job ID."
    ;;
  owner)
    planId="${3:?planId}"; load_env
    plan="$(cli call get_source_execution_plan "{\"planId\":\"$planId\"}")"
    planHash="$(printf '%s' "$plan" | node -e 'let s="";process.stdin.on("data",c=>s+=c).on("end",()=>{const d=JSON.parse(s);const p=d.plan??d;console.error(JSON.stringify({planId:p.id,importId:p.importId,revisionHash:p.revisionHash,entryPath:p.entryPath,files:p.closure.files.map(f=>f.path),scenarioIds:p.scenarioIds,seed:p.seed,runner:p.runner.engine,expiresAt:p.expiresAt}));console.log(p.planHash)})')"
    approval="$(cli call approve_source_execution "{\"planId\":\"$planId\",\"expectedPlanHash\":\"$planHash\",\"requestId\":\"$(uuid)\"}")"
    jobId="$(printf '%s' "$approval" | node -e 'let s="";process.stdin.on("data",c=>s+=c).on("end",()=>console.log(JSON.parse(s).job.id))')"
    echo "{\"at\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"actor\":\"owner\",\"action\":\"approve_source_execution\",\"via\":\"cli\",\"planId\":\"$planId\",\"planHash\":\"$planHash\",\"jobId\":\"$jobId\"}" >> "$control/owner-actions.jsonl"
    (cd "$REPO" && node --import tsx scripts/record-editor-loop-worker.ts "$jobId") | tee "$control/worker-$jobId.json"
    echo "{\"at\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"actor\":\"owner\",\"action\":\"run_docker_worker\",\"jobId\":\"$jobId\"}" >> "$control/owner-actions.jsonl"
    echo "jobId: $jobId"
    ;;
  resume)
    planId="${3:?planId}"; jobId="${4:?jobId}"; load_env
    session="$(node -e 'const l=require("fs").readFileSync(process.argv[1],"utf8").split("\n").filter(Boolean).map(x=>JSON.parse(x)).find(x=>x.type==="system"&&x.subtype==="init");console.log(l.session_id)' "$control/transcript.jsonl")"
    agent "I reviewed and approved plan $planId and ran it in the isolated runner. Job ID: $jobId. Read the results. If any check failed, work out why, correct your implementation, and prepare a new plan for me to approve (report its plan ID and plan hash, then stop). If every check passed, summarize what you built." --resume "$session"
    ;;
  say) # any other owner message; it is recorded verbatim with the transcript
    message="${3:?message}"; load_env
    session="$(node -e 'const l=require("fs").readFileSync(process.argv[1],"utf8").split("\n").filter(Boolean).map(x=>JSON.parse(x)).find(x=>x.type==="system"&&x.subtype==="init");console.log(l.session_id)' "$control/transcript.jsonl")"
    agent "$message" --resume "$session"
    ;;
  *) echo "unknown command" >&2; exit 2;;
esac
