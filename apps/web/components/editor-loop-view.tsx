import { Bot, Check, CircleSlash, FileDiff, ShieldCheck, SquareTerminal, UserRound, Wrench, X } from "lucide-react";
import styles from "./editor-loop-view.module.css";

interface LoopCase { scenarioId: string; status: string; failedAssertions: string[]; compilerStatus?: string | null; compilerDiagnostics?: string | null; observed: { captureCount: number | null; capturedMinor: number | null; fulfillmentCount: number | null; phoneState: string | null; authoritativeReads: number | null } | null; failedInvariants: { id: string; name: string; reason: string }[] }
interface LoopSubmission { n: number; turn: number; importId: string; snapshotId: string; revisionHash: string; planId: string; planHash: string; jobId: string; approvedAt: string; status: string; passed: number; total: number; files: { path: string; bytes: number; hash: string; published: string }[]; cases: LoopCase[] }
interface LoopTurn { n: number; prompt: string; model: string; durationMs: number | null; agentSteps: number | null; tools: { name: string; count: number; errors: number }[]; reply: string }
interface LoopDiff { from: number; to: number; fromRevisionHash: string; toRevisionHash: string; published: string; files: { path: string; status: string; added: number; removed: number; unified: string }[] }
interface LoopOwnerAction { at: string; actor: string; action: string; planId?: string; planHash?: string; jobId?: string; file?: string; note?: string }
export interface EditorLoopSession { id: string; condition: string; recordedOn: string; kitVariant: string; agent: { harness: string; version: string; model: string; sessionId: string; mcpToolsOffered: number; mcpToolsAllowed: string[] }; environment: { provider: string; runner: string; developerSessionId: string }; outcome: { submissions: number }; turns: LoopTurn[]; ownerActions: LoopOwnerAction[]; lookups: { turn: number; tool: string; target: string | null; kind: string }[]; submissions: LoopSubmission[]; diffs: LoopDiff[]; files: { transcript: string; summary: string } }
export interface EditorLoopRecord { mcpTools: number; sessions: EditorLoopSession[]; control: { label: string; origin: string; jobId: string; planId: string; importId: string; revisionHash: string; status: string; passed: number; total: number; cases: LoopCase[] } }

const caseNames: Record<string, string> = { happy: "Happy path", lost: "Lost capture answer, customer retries", malformed: "Malformed success body", unavailable: "Reread unavailable", pending: "Capture pending", auth: "Authentication refused", concurrent: "Eight concurrent submits", revoked: "Approval revoked", payload: "Changed amount on retry" };
const short = (value: string, length = 8) => value.length > length ? value.slice(0, length) : value;
const seconds = (ms: number | null) => ms === null ? "" : ms >= 60000 ? `${Math.floor(ms / 60000)} min ${Math.round(ms % 60000 / 1000)} s` : `${Math.round(ms / 1000)} s`;
const day = (value: string) => new Date(`${value}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const clock = (value: string) => `${value.slice(11, 16)} UTC`;
const sessionLetter = (id: string) => id.replace("session-", "").toUpperCase();

function Id({ label, value }: { label: string; value: string }) { return <span className={styles.id}><span>{label}</span><code title={value}>{value}</code></span>; }

function CaseGrid({ cases }: { cases: LoopCase[] }) {
  return <ul className={styles.cases}>{cases.map(item => {
    const tone = item.status === "passed" ? styles.pass : item.status === "failed" ? styles.fail : styles.skip;
    const observed = item.observed && item.observed.captureCount !== null ? `${item.observed.captureCount} capture${item.observed.captureCount === 1 ? "" : "s"}, ${item.observed.fulfillmentCount} book${item.observed.fulfillmentCount === 1 ? "" : "s"}, phone ${item.observed.phoneState}` : null;
    return <li key={item.scenarioId} className={tone}>
      <span className={styles.caseIcon} aria-hidden="true">{item.status === "passed" ? <Check size={12} /> : item.status === "failed" ? <X size={12} /> : <CircleSlash size={12} />}</span>
      <div><strong>{caseNames[item.scenarioId] ?? item.scenarioId}</strong><span className={styles.caseStatus}>{item.status === "compiler_rejected" ? "Compiler rejected" : item.status === "cancelled" ? "Not run" : item.status === "passed" ? "Passed" : item.status === "failed" ? "Failed" : item.status}</span>
        {observed && <small>{observed}</small>}
        {item.failedAssertions.length > 0 && <small className={styles.failText}>Failed: {item.failedAssertions.join(", ")}</small>}
        {item.failedInvariants.length > 0 && <small className={styles.failText}>{item.failedInvariants.map(row => `${row.id} ${row.name}`).join("; ")}</small>}
      </div>
    </li>;
  })}</ul>;
}

function Diff({ diff }: { diff: LoopDiff }) {
  return <details className={styles.diff}><summary><FileDiff size={13} />Diff, revision {diff.from} to revision {diff.to}<span>{diff.files.filter(file => file.status !== "unchanged").map(file => `${file.path} +${file.added} -${file.removed}`).join(", ")}</span></summary>
    {diff.files.filter(file => file.unified).map(file => <pre key={file.path} tabIndex={0} aria-label={`Unified diff of ${file.path}`}>{file.unified.split("\n").map((line, index) => <span key={index} className={line.startsWith("+") && !line.startsWith("+++") ? styles.add : line.startsWith("-") && !line.startsWith("---") ? styles.remove : line.startsWith("@@") ? styles.hunk : undefined}>{line + "\n"}</span>)}</pre>)}
    <p className={styles.path}>{diff.published}</p>
  </details>;
}

function Submission({ submission }: { submission: LoopSubmission }) {
  const compiler = submission.cases.find(item => item.compilerStatus === "rejected");
  return <div className={styles.result}>
    <div className={styles.resultHead}><strong>{compiler ? "The runner's compiler rejected this revision. No check ran." : `${submission.passed} of ${submission.total} checks passed`}</strong><span>Revision {submission.n}, {submission.files.map(file => `${file.path} (${file.bytes.toLocaleString("en-US")} bytes)`).join(", ")}</span></div>
    {compiler?.compilerDiagnostics && <pre className={styles.diagnostics} tabIndex={0} aria-label="Compiler diagnostics">{compiler.compilerDiagnostics.trim()}</pre>}
    <CaseGrid cases={submission.cases} />
    <div className={styles.ids}><Id label="Import" value={submission.importId} /><Id label="Revision hash" value={submission.revisionHash} /><Id label="Plan" value={submission.planId} /><Id label="Plan hash" value={submission.planHash} /><Id label="Job" value={submission.jobId} /></div>
  </div>;
}

function SessionTimeline({ session }: { session: EditorLoopSession }) {
  const actionsAfter = (turn: number) => {
    const firstLaterSubmission = session.submissions.find(item => item.turn > turn);
    return session.ownerActions.filter(action => {
      if (action.action === "run_docker_worker") return false;
      const submission = session.submissions.find(item => item.jobId === action.jobId);
      if (submission) return submission.turn === turn;
      const next = session.ownerActions.slice(session.ownerActions.indexOf(action) + 1).find(item => item.action === "approve_source_execution");
      const nextSubmission = session.submissions.find(item => item.jobId === next?.jobId);
      return nextSubmission ? nextSubmission.turn - 1 === turn : !firstLaterSubmission && turn === session.turns.length;
    });
  };
  return <ol className={styles.timeline}>{session.turns.map(turn => {
    const lookups = session.lookups.filter(item => item.turn === turn.n), kinds = [...new Set(lookups.map(item => item.kind))];
    const diff = session.diffs.find(item => session.submissions.find(submission => submission.n === item.to)?.turn === turn.n);
    return <li key={turn.n}>
      <div className={`${styles.step} ${styles.owner}`}><span className={styles.actor}><UserRound size={13} />{turn.n === 1 ? "Task" : "Owner"}</span><p className={styles.prompt}>{turn.prompt}</p></div>
      <div className={`${styles.step} ${styles.agent}`}><span className={styles.actor}><Bot size={13} />Agent, turn {turn.n}<small>{turn.model}, {seconds(turn.durationMs)}, {turn.agentSteps} steps</small></span>
        <ul className={styles.tools} aria-label="Tool calls in this turn">{turn.tools.map(tool => <li key={tool.name}><code>{tool.name}</code> {tool.count}{tool.errors ? <em> ({tool.errors} refused)</em> : null}</li>)}</ul>
        {kinds.length > 0 && <p className={styles.lookup}><ShieldCheck size={13} />Read before writing code: {kinds.join(", ")}. {lookups.some(item => item.tool === "fracture-lab:get_provider_facts") ? "It called get_provider_facts once." : "It did not call get_provider_facts."}</p>}
        {diff && <Diff diff={diff} />}
        <details className={styles.reply}><summary>Agent reply, verbatim</summary><div>{turn.reply}</div></details>
      </div>
      {actionsAfter(turn.n).map(action => {
        const submission = session.submissions.find(item => item.jobId === action.jobId);
        return submission
          ? <div key={action.at + action.action} className={`${styles.step} ${styles.lab}`}><span className={styles.actor}><SquareTerminal size={13} />Owner approves, isolated runner executes<small>{clock(action.at)}, outside the agent session</small></span><Submission submission={submission} /></div>
          : <div key={action.at + action.action} className={`${styles.step} ${styles.maintainer}`}><span className={styles.actor}><Wrench size={13} />Lab maintainer<small>{clock(action.at)}</small></span><p>{action.note}</p>{action.file && <p className={styles.path}>{action.file}</p>}</div>;
      })}
    </li>;
  })}</ol>;
}

export function EditorLoopView({ record }: { record: EditorLoopRecord }) {
  const dates = [...new Set(record.sessions.map(item => item.recordedOn))];
  const moneyFailure = record.sessions.some(session => session.submissions.some(item => item.cases.some(entry => entry.status === "failed")));
  return <article className={styles.loop}>
    <header className={styles.intro}>
      <p className={styles.eyebrow}><span className={styles.dot} />RECORDED EDITOR LOOP</p>
      <h1>Two coding agents built the checkout through the lab&apos;s own tools.</h1>
      <p className={styles.label}>Recorded agent sessions, {dates.map(day).join(" and ")} (UTC), Sample provider model, isolated runner</p>
      <p className={styles.lede}>Each session is a separate headless coding agent given a developer kit and the Fracture Lab MCP server. It wrote a Bramble <code>checkout</code>, imported it, and sealed a plan. The owner approved and ran each plan outside the agent. The nine unchanged checks ran in an isolated container against the local Sample provider model. No request reached PayPal.</p>
      <div className={styles.verdict} role="note"><strong>What happened</strong><p>{moneyFailure ? "At least one agent revision failed a money check before it was corrected. The failing and passing revisions are both below." : "Neither agent produced a money-invariant failure. In both sessions the first submission was rejected by the runner's compiler, the agent read the diagnostics and corrected its code, and the corrected revision passed all nine checks. No failure was staged, so this page does not show an agent failing a money check and repairing it."}</p></div>
    </header>

    <section className={styles.summary} aria-label="Outcome of each recording">
      {record.sessions.map(session => { const last = session.submissions.at(-1); return <a key={session.id} href={`#${session.id}`} className={styles.tile}><span>Session {sessionLetter(session.id)}</span><strong>{last ? `${last.passed} of ${last.total} passed` : "No run"}</strong><small>{session.agent.model}. {session.submissions.length} submissions, {session.turns.length} agent turns.</small></a>; })}
      <a href="#control" className={`${styles.tile} ${styles.tileControl}`}><span>Control, not an agent</span><strong>{record.control.passed} of {record.control.total} passed</strong><small>The repository&apos;s deliberately faulty checkout, through the same tools and runner.</small></a>
    </section>

    {record.sessions.map(session => <section key={session.id} id={session.id} className={styles.session} aria-labelledby={`${session.id}-title`}>
      <div className={styles.sessionHead}><div><p className={styles.eyebrow}>SESSION {sessionLetter(session.id)}</p><h2 id={`${session.id}-title`}>{session.condition}</h2></div>
        <dl><div><dt>Agent</dt><dd>Claude Code {session.agent.version}, headless</dd></div><div><dt>Model</dt><dd><code>{session.agent.model}</code></dd></div><div><dt>Tools allowed</dt><dd>5 file tools, {session.agent.mcpToolsAllowed.length} of {session.agent.mcpToolsOffered} lab tools</dd></div><div><dt>Agent session</dt><dd><code>{short(session.agent.sessionId)}</code></dd></div></dl>
      </div>
      <SessionTimeline session={session} />
      <p className={styles.path}>Transcript: {session.files.transcript}</p>
    </section>)}

    <section id="control" className={styles.session} aria-labelledby="control-title">
      <div className={styles.sessionHead}><div><p className={styles.eyebrow}>CONTROL</p><h2 id="control-title">What the same checks report for a faulty checkout</h2></div></div>
      <p className={styles.note}>{record.control.label} {record.control.origin}. It shows that the nine checks tell a duplicate capture apart from a correct checkout. The lost-answer case records two captures for one USD 12 purchase.</p>
      <div className={styles.result}><div className={styles.resultHead}><strong>{record.control.passed} of {record.control.total} checks passed</strong><span>Hand-authored source</span></div><CaseGrid cases={record.control.cases} /><div className={styles.ids}><Id label="Import" value={record.control.importId} /><Id label="Revision hash" value={record.control.revisionHash} /><Id label="Plan" value={record.control.planId} /><Id label="Job" value={record.control.jobId} /></div></div>
    </section>

    <section className={styles.session} aria-labelledby="run-title">
      <div className={styles.sessionHead}><div><p className={styles.eyebrow}>RUN IT YOURSELF</p><h2 id="run-title">The same loop from a terminal or an MCP client</h2></div></div>
      <p className={styles.note}>The CLI and the stdio MCP server expose the same {record.mcpTools} tools. These commands need Node 22, the local PostgreSQL database from <code>.env</code> and, for execution, the qualified local source-execution image.</p>
      <pre className={styles.commands} tabIndex={0} aria-label="Quick-start commands">{`npm ci
npm run cli -- init
npm run cli -- call get_provider_facts '{}'
npm run cli -- call list_source_roots '{}'
npm run cli -- call import_source_workspace '{"rootId":"<alias>","path":"checkout","title":"My checkout","requestId":"<new UUID>"}'
npm run cli -- call prepare_source_execution '{"importId":"<import>","entryPath":"checkout.ts","expectedRevisionHash":"<hash>","scenarioIds":["happy","lost","malformed","unavailable","pending","auth","concurrent","revoked","payload"],"seed":"demo-1","requestId":"<new UUID>"}'
npm run cli -- call approve_source_execution '{"planId":"<plan>","expectedPlanHash":"<plan hash>","requestId":"<new UUID>"}'
npx tsx scripts/record-editor-loop-worker.ts <job>
npm run cli -- call get_source_execution_results '{"jobId":"<job>"}'`}</pre>
      <p className={styles.note}>To record a session the way these were recorded, use <code>scripts/record-editor-loop.sh</code>. The walkthrough, both transcripts, every submitted revision and the diffs are in <code>docs/editor-loop/</code>.</p>
    </section>
  </article>;
}
