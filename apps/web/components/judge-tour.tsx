"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, CheckCircle2, CircleHelp, LoaderCircle, RotateCcw, ScanSearch, ShieldCheck, X } from "lucide-react";
import type { RunDTO } from "@fracture/contracts";
import { BramblePhone } from "./bramble-phone";
import { dateLabel, money, SourceChip, VerdictChip } from "./primitives";
import { InvariantList } from "./run-workbench";
import { WorkProgress } from "./work-progress";
import { useWorkspace } from "./workspace-provider";
import type { JudgeRecorded } from "./judge-recorded";
import s from "./judge-tour.module.css";

const steps = [
  { id: "fracture", label: "The fracture", title: "One purchase. Two charges." },
  { id: "invariants", label: "Invariants", title: "Eight money invariants check the provider’s record." },
  { id: "diagnosis", label: "Diagnosis", title: "A model diagnoses the cause with one read-only experiment." },
  { id: "repair", label: "Repair", title: "A deceptive patch is rejected. A grounded repair is verified." },
  { id: "replay", label: "Replay", title: "The same fault, replayed on the repaired checkout." },
  { id: "refund", label: "Refund", title: "The duplicate is refunded. The history stays." },
  { id: "contract", label: "Contract sheet", title: "Each contract row points at source and a test." },
  { id: "agents", label: "Coding agents", title: "The same loop, from a terminal or an MCP client." },
  { id: "study", label: "Context study", title: "Does SDK context change what a model writes?" },
  { id: "recorded", label: "Sandbox record", title: "What PayPal’s sandbox actually recorded." },
] as const;
const storageKey = "fracture-tour";
const day = (iso: string) => new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeZone: "UTC" }).format(new Date(iso));
const clock = (iso: string) => new Intl.DateTimeFormat("en-GB", { timeStyle: "medium", timeZone: "UTC" }).format(new Date(iso)) + " UTC";
const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;
const sampleLabel = "Sample — local provider model, no PayPal call";

function projectionOf(run: RunDTO) { return { phoneState: run.phoneState, applicationStatus: run.applicationStatus, providerStatus: run.providerStatus, capturedMinor: run.capturedMinor, refundedMinor: run.refundedMinor, captureCount: run.captureCount, fulfillmentCount: run.fulfillmentCount, currency: run.currency }; }

export function JudgeTour({ recorded, initialStep }: { recorded: JudgeRecorded | null; initialStep?: number }) {
  const { workspace, busy, act, openEvidence, resetSession } = useWorkspace();
  const pathname = usePathname();
  const [step, setStepState] = useState(() => initialStep && initialStep >= 1 && initialStep <= steps.length ? initialStep - 1 : 0);
  const [visited, setVisited] = useState<number[]>([]);
  const [confirmReset, setConfirmReset] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);

  // Resume where this browser tab left off unless the link names a step.
  useEffect(() => {
    try {
      const saved = JSON.parse(window.sessionStorage.getItem(storageKey) ?? "null") as { step?: unknown; visited?: unknown } | null;
      if (!saved) return;
      if (Array.isArray(saved.visited)) setVisited(saved.visited.filter((item): item is number => Number.isInteger(item) && item >= 0 && item < steps.length));
      if (!initialStep && typeof saved.step === "number" && Number.isInteger(saved.step) && saved.step >= 0 && saved.step < steps.length) setStepState(saved.step);
    } catch { /* A blocked or malformed store only loses the resume point. */ }
  }, [initialStep]);
  useEffect(() => {
    setVisited(current => current.includes(step) ? current : [...current, step]);
    if (moved.current) { heading.current?.focus({ preventScroll: true }); heading.current?.scrollIntoView({ block: "start" }); }
  }, [step]);
  useEffect(() => { try { window.sessionStorage.setItem(storageKey, JSON.stringify({ step, visited })); } catch { /* resume is optional */ } }, [step, visited]);
  const go = useCallback((next: number) => {
    const bounded = Math.max(0, Math.min(steps.length - 1, next));
    moved.current = true; setStepState(bounded); setConfirmReset(false);
    window.history.replaceState(null, "", `${pathname}?step=${bounded + 1}`);
  }, [pathname]);

  const runs = workspace?.runs ?? [];
  const faulty = [...runs].filter(run => run.projectId === "bramble" && run.scenarioId === "S0" && run.revision === "faulty" && run.source === "sample").sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;
  const control = faulty ? runs.find(run => run.id === faulty.comparisonRunId && run.revision === "hardened") ?? runs.find(run => run.projectId === "bramble" && run.scenarioId === "S0" && run.revision === "hardened" && run.seed === faulty.seed) ?? null : null;
  const repairs = workspace?.repairs.filter(repair => repair.runId === faulty?.id) ?? [];
  const deceptive = repairs.find(repair => repair.provenance === "seeded_policy_test");
  const reference = repairs.find(repair => repair.provenance === "human_reference" && repair.candidate === "grounded");
  const generated = repairs.filter(repair => repair.provenance === "model_generated");
  const working = Boolean(busy) || Boolean(workspace?.work.some(item => item.runId === faulty?.id && item.status === "running"));
  const duplicated = (faulty?.captureCount ?? 0) > 1;
  const complete = [duplicated, duplicated, faulty?.diagnosis?.status === "tested", deceptive?.status === "rejected" && reference?.status === "verified", control?.verdict === "pass" && duplicated, faulty?.remediation === "completed"];
  const done = (index: number) => index < complete.length ? Boolean(complete[index]) : visited.includes(index) && index !== step;

  async function startOver() { const next = await resetSession(); if (next) { setVisited([]); setConfirmReset(false); go(0); } }
  const retry = () => { if (faulty) void act(faulty.id, "advance"); };
  const needsRetry = faulty && !duplicated ? <div className={s.callout}><CircleHelp size={16} /><p>Maya has not retried yet, so there is only one capture so far.</p><button className="button secondary" disabled={working} onClick={retry}>{busy?.startsWith("advance:") ? <LoaderCircle size={14} className="spin" /> : null}Retry as Maya</button></div> : null;
  const current = steps[step]!;

  let body: ReactNode;
  if (!faulty && step < 6) body = <div className={s.callout}><CircleHelp size={16} /><p>This session has no Bramble sample run. Start over to get a freshly seeded checkout.</p><button className="button primary" disabled={Boolean(busy)} onClick={() => void startOver()}>Start a fresh session</button></div>;
  else if (current.id === "fracture" && faulty) body = <div className={s.fracture}>
    <div className={s.phone}><BramblePhone run={faulty} projection={projectionOf(faulty)} onAdvance={retry} busy={working} /></div>
    <div className={s.column}>
      <p className={s.lead}>Bramble Books is a fictional bookshop. Its checkout captured Maya’s {money(faulty.amountMinor, faulty.currency)}, then lost the response and told her the payment failed. {duplicated ? "She tried again, and the checkout created a second order and captured it too." : "Press “Try again” on the phone to do what Maya did."}</p>
      <section className={`${s.card} ${duplicated ? s.bad : ""}`} aria-label="Captures in this session">
        <header><h3>Charged {money(faulty.amountMinor, faulty.currency)} × {faulty.captureCount}</h3><span className={s.provenance}><SourceChip source="sample" small />{sampleLabel}</span></header>
        <ul className={s.resources}>{faulty.captures.map(capture => <li key={capture.id}><button onClick={() => openEvidence(capture.evidenceId)}><span><strong>{money(capture.amountMinor, capture.currency)}</strong> capture · {capture.status.toLowerCase().replaceAll("_", " ")}</span><code>{capture.id}</code><ArrowUpRight size={13} /></button></li>)}</ul>
        <p className={s.note}>{duplicated ? `${money(faulty.capturedMinor, faulty.currency)} captured for one ${money(faulty.amountMinor, faulty.currency)} purchase. ` : ""}Run started {dateLabel(faulty.createdAt)} in this session. <Link className={s.inline} href={`/runs/${faulty.id}`}>Open the full trace</Link></p>
      </section>
      <ol className={s.events} aria-label="What happened, in order">{faulty.events.map(event => { const fracture = event.kind.toLowerCase().includes("drop"); return <li key={event.id} className={fracture ? s.fractureEvent : ""}><span>{event.lane === "provider" ? "PayPal model" : event.lane === "customer" ? "Maya" : event.lane === "lab" ? "Lab" : "Bramble"}</span>{event.title}</li>; })}</ol>
      <RecordedCard recorded={recorded} compact />
    </div>
  </div>;
  else if (current.id === "invariants" && faulty) { const failed = faulty.invariants.filter(item => item.verdict === "fail").length, passed = faulty.invariants.filter(item => item.verdict === "pass").length; body = <>
    <p className={s.lead}>The checkout’s own tests pass. The lab instead compares what the application believed with what the provider recorded, using {plural(faulty.invariants.length, "invariant")} that never change between revisions.</p>
    {needsRetry}
    <div className={s.tally}><span className={s.tallyFail}><X size={14} />{failed} failed</span><span className={s.tallyPass}><Check size={14} />{passed} passed</span><span>{faulty.invariants.length - failed - passed} not applicable to this purchase</span><span className={s.provenance}><SourceChip source="sample" small />Evaluated against the local provider model</span></div>
    <div className={s.framed}><InvariantList run={faulty} /></div>
  </>; }
  else if (current.id === "diagnosis" && faulty) { const diagnosis = faulty.diagnosis, example = workspace?.evidence.find(item => item.id === "artifact:model-diagnosis-qualification.json"); body = <>
    <p className={s.lead}>The diagnosis model proposes competing explanations, chooses one read of the original order through the SDK, and has to conclude from the receipt it gets back. It cannot write to the provider.</p>
    {needsRetry}
    <WorkProgress runId={faulty.id} />
    {busy?.startsWith("diagnose:") && !workspace?.work.some(item => item.runId === faulty.id && item.kind === "diagnose" && item.status === "running") ? <div className={s.callout} role="status"><LoaderCircle size={16} className="spin" /><p>The diagnosis has started. Its first progress update arrives in a few seconds.</p></div> : null}
    {diagnosis ? <>
      <div className="hypothesis-grid">{diagnosis.hypotheses.map(item => <div className={`hypothesis ${item.status}`} key={item.id}><span className="hypothesis-symbol">{item.status === "eliminated" ? <X size={15} /> : item.status === "supported" ? <Check size={15} /> : <CircleHelp size={15} />}</span><div><strong>{item.title}</strong><p>{item.reason}</p><span>{item.status}</span></div></div>)}</div>
      <section className={s.card}><header><h3>{diagnosis.experiment.title}</h3><span className={s.provenance}><SourceChip source={diagnosis.source} small />{diagnosis.model}</span></header>
        <dl className={s.facts}><div><dt>Read-only call</dt><dd><code>{diagnosis.experiment.tool}</code></dd></div><div><dt>Resource</dt><dd><code>{diagnosis.experiment.resourceId}</code></dd></div><div><dt>Returned status</dt><dd>{diagnosis.experiment.observedStatus ?? "No status returned"}</dd></div></dl>
        <p className={s.conclusion}>{diagnosis.conclusion}</p>
        {diagnosis.experiment.receiptId ? <button className="button secondary" onClick={() => openEvidence(diagnosis.experiment.receiptId!)}>Open the read receipt<ArrowUpRight size={13} /></button> : null}
      </section>
    </> : <section className={s.card}><header><h3>Run the diagnosis on this session’s run</h3></header><p className={s.note}>This makes a real model call and usually takes about a minute. Progress appears here while it runs, and you can keep moving through the tour.</p><div className={s.actions}><button className="button primary" disabled={working || !duplicated} onClick={() => void act(faulty.id, "diagnose")}>{busy?.startsWith("diagnose:") ? <LoaderCircle size={14} className="spin" /> : <ScanSearch size={14} />}Diagnose the mismatch</button>{example ? <button className="button secondary" onClick={() => openEvidence(example.id)}>Open a completed example (recorded {day(example.createdAt)})</button> : null}</div>{example ? <p className={s.note}>The completed example is a previously recorded qualification run, not a result from this session.</p> : null}</section>}
  </>; }
  else if (current.id === "repair" && faulty) body = <>
    <p className={s.lead}>A green test is not enough: a patch can pass by weakening the test. Every candidate goes through policy checks first, then the unchanged invariants under the same fault.</p>
    {needsRetry}
    <WorkProgress runId={faulty.id} />
    <div className={s.pair}>
      <section className={`${s.card} ${deceptive?.status === "rejected" ? s.bad : ""}`}><header><h3>The deceptive patch</h3>{deceptive ? <span className={s.statusBad}><X size={13} />{deceptive.status}</span> : null}</header>
        <p className={s.note}>A seeded candidate that edits the test assertion instead of the checkout. It is planted on purpose to show the policy gate.</p>
        {deceptive ? <><ul className={s.checks}>{deceptive.policyChecks.map(check => <li key={check.id} className={check.passed ? s.checkPass : s.checkFail}>{check.passed ? <Check size={13} /> : <X size={13} />}<span><strong>{check.name}</strong>{check.passed ? null : <small>{check.reason}</small>}</span></li>)}</ul><p className={s.note}>Edits <code>{deceptive.file}</code>. Rejected before any execution.</p></> : <button className="button secondary" disabled={working || !duplicated} onClick={() => void act(faulty.id, "repair", "deceptive")}>Submit the deceptive patch</button>}
      </section>
      <section className={`${s.card} ${reference?.status === "verified" ? s.good : ""}`}><header><h3>The grounded repair</h3>{reference ? <span className={reference.status === "verified" ? s.statusGood : s.statusNeutral}>{reference.status === "verified" ? <Check size={13} /> : null}{reference.status}</span> : null}</header>
        <p className={s.note}>The authored reference repair: keep one durable purchase identity and read the original order through the APIMatic PayPal SDK before retrying. It is written by a person, not generated.</p>
        {reference ? <><ul className={s.checks}>{reference.tests.map(test => <li key={test.id} className={test.status === "pass" ? s.checkPass : test.status === "fail" ? s.checkFail : ""}>{test.status === "pass" ? <Check size={13} /> : test.status === "fail" ? <X size={13} /> : <CircleHelp size={13} />}<span><strong>{test.name}</strong></span></li>)}</ul>
          {reference.citations.map(citation => <p className={s.note} key={citation.id}>Cites <code>{citation.path}</code> · {citation.section}</p>)}
          {reference.status !== "verified" ? <button className="button primary" disabled={working} onClick={() => void act(faulty.id, "verify", "grounded")}>{busy?.startsWith("verify:") ? <LoaderCircle size={14} className="spin" /> : null}Verify under the same fault</button> : null}</> : <button className="button secondary" disabled={working || !duplicated} onClick={() => void act(faulty.id, "repair", "grounded")}>Prepare the grounded repair</button>}
      </section>
    </div>
    <section className={s.card}><header><h3>Model-written candidates</h3><span className={s.provenance}><SourceChip source="sample" small />Isolated execution</span></header>
      <p className={s.note}>In the repair workspace the repair model writes a new candidate from the failing source and the pinned SDK contract, and the exact candidate is executed in an isolated runner. Generation and verification take a few minutes.{generated.length ? ` This session has ${plural(generated.length, "model-written candidate")}: ${generated.map(item => item.status).join(", ")}.` : ""}</p>
      <div className={s.actions}><Link className="button secondary" href={`/repairs?run=${faulty.id}`}>Open the repair workspace<ArrowRight size={14} /></Link></div>
    </section>
  </>;
  else if (current.id === "replay" && faulty) body = <>
    <p className={s.lead}>Same scenario, same seed, same dropped response. Only the checkout revision differs.</p>
    {needsRetry}
    {control ? <div className={s.pair}>
      <RunColumn run={faulty} title="Faulty baseline" />
      <RunColumn run={control} title="Hardened checkout" />
    </div> : <div className={s.callout}><CircleHelp size={16} /><p>No hardened comparison is attached to this run yet. Verify the grounded repair in step 4 to create one.</p><button className="button secondary" onClick={() => go(3)}>Go to the repair step</button></div>}
    {control ? <p className={s.note}>{control.seed === faulty.seed ? <>Both runs use seed <code>{faulty.seed}</code>. </> : null}The hardened checkout shows “Checking your payment…”, rereads the original order, and confirms the first capture instead of creating another.</p> : null}
  </>;
  else if (current.id === "refund" && faulty) { const duplicate = faulty.captures[1], refund = faulty.refunds.at(-1); body = <>
    <p className={s.lead}>Fixing the code does not give Maya her {money(faulty.amountMinor, faulty.currency)} back. Compensation is a separate, explicitly approved action against the exact duplicate capture.</p>
    {needsRetry}
    {duplicate ? <section className={`${s.card} ${faulty.remediation === "completed" ? s.good : ""}`}><header><h3>{faulty.remediation === "completed" ? `Refunded ${money(faulty.refundedMinor, faulty.currency)}` : "Approve the refund of the duplicate"}</h3><span className={s.provenance}><SourceChip source="sample" small />{sampleLabel}</span></header>
      <dl className={s.facts}><div><dt>Duplicate capture</dt><dd><code>{duplicate.id}</code> · {duplicate.status.toLowerCase().replaceAll("_", " ")}</dd></div><div><dt>Amount</dt><dd>{money(duplicate.amountMinor, duplicate.currency)}</dd></div>{refund ? <div><dt>Refund</dt><dd><code>{refund.id}</code></dd></div> : null}<div><dt>Gross captured</dt><dd>{money(faulty.capturedMinor, faulty.currency)} in {plural(faulty.captureCount, "capture")}</dd></div></dl>
      {faulty.remediation === "completed" ? <p className={s.note}>Both captures stay in the record and the run keeps its failed verdict: a refund compensates the customer, it does not undo the defect.{refund ? <> <button className={s.inlineButton} onClick={() => openEvidence(refund.evidenceId)}>Open the refund record</button></> : null}</p> : <div className={s.actions}><button className="button primary" disabled={working} onClick={() => void act(faulty.id, "remediate")}>{busy?.startsWith("remediate:") ? <LoaderCircle size={14} className="spin" /> : <RotateCcw size={14} />}Approve the {money(duplicate.amountMinor, duplicate.currency)} sample refund</button></div>}
    </section> : null}
    {recorded?.faulty.refunds[0] ? <p className={s.note}>In the recorded PayPal Sandbox run the same step produced refund <code>{recorded.faulty.refunds[0].id}</code> against capture <code>{recorded.faulty.refunds[0].captureId}</code> on {day(recorded.faulty.refunds[0].observedAt)}. <button className={s.inlineButton} onClick={() => go(9)}>See the sandbox record</button></p> : null}
  </>; }
  else if (current.id === "contract") { const rows = workspace?.contractRows ?? [], verified = rows.filter(row => row.status === "verified").length; body = <>
    <p className={s.lead}>Before any repair is trusted, the integration’s obligations are written down as rows: what must hold, which mechanism holds it, where that lives in source, and which test exercises it.</p>
    <div className={s.tally}><span>{plural(rows.length, "row")}</span>{verified ? <span className={s.tallyPass}><Check size={14} />{verified} verified by an executed test</span> : null}<span>{rows.filter(row => row.status === "bound").length} bound to source and a named test</span></div>
    <div className={s.tableWrap} tabIndex={0} role="region" aria-label="Contract rows"><table className={s.table}><thead><tr><th scope="col">Obligation</th><th scope="col">Mechanism</th><th scope="col">Source</th><th scope="col">Status</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><th scope="row"><small>{row.category}</small>{row.requirement}</th><td>{row.mechanism}</td><td><code>{row.source ? `${row.source.path}:${row.source.line}` : "—"}</code></td><td><span className={row.status === "verified" ? s.statusGood : s.statusNeutral}>{row.status === "verified" ? <Check size={13} /> : null}{row.status}</span></td></tr>)}</tbody></table></div>
    <div className={s.actions}><Link className="button secondary" href="/contract-sheet">Open the contract sheet<ArrowRight size={14} /></Link></div>
  </>; }
  else if (current.id === "agents") body = <>
    <p className={s.lead}>A coding agent can run the same crash test on the code it just wrote. The CLI and the MCP server call the service this page uses, so the runs, invariants and receipts are the same kind of record.</p>
    <div className={s.pair}>
      <section className={s.card}><header><h3>From a terminal</h3></header><pre className={s.code} tabIndex={0}>{`npm run cli -- init
npm run cli -- call run_curated_scenario \\
  '{"scenarioId":"S0","revision":"faulty",
    "seed":"demo-seed-01","requestId":"demo-faulty-01"}'`}</pre><p className={s.note}>Runs the Bramble scenario against the local provider model and returns the run with its invariant verdicts.</p></section>
      <section className={s.card}><header><h3>From an MCP client</h3></header><ul className={s.tools}>{["run_curated_scenario", "get_run", "get_provider_facts", "diagnose_run", "propose_repair", "verify_patch", "export_report"].map(tool => <li key={tool}><code>{tool}</code></li>)}</ul><p className={s.note}>The local stdio server is started with <code>node --import tsx apps/mcp/src/index.ts</code>.</p></section>
    </div>
    <section className={s.card}><header><h3>The recorded editor loop</h3></header><p className={s.note}>A recorded session of a coding agent using these tools on a checkout: crash-test it, read the failing witness, edit the code, run it again. The page shows what was recorded.</p><div className={s.actions}><Link className="button primary" href="/editor-loop">Open the editor loop<ArrowRight size={14} /></Link></div></section>
  </>;
  else if (current.id === "study") { const studies = workspace?.evaluations ?? []; body = <>
    <p className={s.lead}>The study gives models the same faulty payment code with different context, and grades each first submission with independent checks.</p>
    {studies.map(study => <section className={s.card} key={study.id}><header><h3>{study.title}</h3><span className={s.statusNeutral}>{study.completedAttempts} of {study.plannedAttempts} attempts recorded</span></header>
      <ul className={s.arms}>{study.arms.map(arm => <li key={arm.id}><strong>{arm.id} · {arm.name}</strong><span>{arm.description}</span></li>)}</ul>
      <p className={s.note}>Models: {study.models.join(", ")}.</p></section>)}
    <div className={s.actions}><Link className="button primary" href="/evaluations">See the measured result<ArrowRight size={14} /></Link></div>
  </>; }
  else body = <>
    <p className={s.lead}>Everything interactive in this tour runs on a local provider model. This step is the real-provider evidence: the same Bramble experiment, executed once against the PayPal Sandbox with buyer-approved orders, and kept unchanged.</p>
    <RecordedCard recorded={recorded} />
    <div className={s.actions}><Link className="button primary" href="/observations" prefetch={false}>Step through the recorded observations<ArrowRight size={14} /></Link><Link className="button secondary" href="/evidence">Evidence library</Link><Link className="button secondary" href="/limits">Roadmap and limits</Link></div>
  </>;

  return <div className={s.tour}>
    <header className={s.hero}>
      <div><p className={s.kicker}>FRACTURE LAB · GUIDED TOUR</p><h1>One purchase should mean one charge.</h1><p>Coding agents now write payment integrations. Fracture Lab breaks a checkout on purpose, finds why it double-charged, and makes the fix prove itself. Ten short steps; the interactive ones run in your own isolated session.</p></div>
      <div className={s.session}><span className={s.provenance}>{workspace ? `Your isolated session · started ${dateLabel(workspace.createdAt)}` : "Your isolated session"}</span>
        {confirmReset ? <div className={s.confirm} role="group" aria-label="Confirm start over"><span>Discard this session’s runs and begin again?</span><button className="button primary" disabled={busy === "reset-session"} onClick={() => void startOver()}>{busy === "reset-session" ? <LoaderCircle size={14} className="spin" /> : <RotateCcw size={14} />}Yes, start over</button><button className="button secondary" onClick={() => setConfirmReset(false)}>Keep going</button></div> : <button className="button secondary" disabled={Boolean(busy)} onClick={() => setConfirmReset(true)}><RotateCcw size={14} />Start over</button>}
      </div>
    </header>
    <nav className={s.stepper} aria-label="Tour steps"><ol>{steps.map((item, index) => <li key={item.id}><button className={`${index === step ? s.active : ""} ${done(index) ? s.done : ""}`} aria-current={index === step ? "step" : undefined} onClick={() => go(index)}><span className={s.number}>{done(index) ? <Check size={12} aria-label="done" /> : index + 1}</span><span className={s.stepLabel}>{item.label}</span></button></li>)}</ol>
      <div className={s.progress} role="progressbar" aria-label="Tour progress" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={step + 1}><span style={{ width: `${((step + 1) / steps.length) * 100}%` }} /></div></nav>
    <section className={s.panel} aria-labelledby="tour-step-title">
      <p className={s.kicker}>STEP {step + 1} OF {steps.length}</p>
      <h2 id="tour-step-title" ref={heading} tabIndex={-1}>{current.title}</h2>
      {body}
    </section>
    <footer className={s.pager}><button className="button secondary" disabled={step === 0} onClick={() => go(step - 1)}><ArrowLeft size={14} />Back</button><span>{step + 1} / {steps.length}</span>{step === steps.length - 1 ? <Link className="button primary" href={faulty ? `/runs/${faulty.id}` : "/projects"}>Explore the full console<ArrowRight size={14} /></Link> : <button className="button primary" onClick={() => go(step + 1)}>Next: {steps[step + 1]!.label}<ArrowRight size={14} /></button>}</footer>
  </div>;
}

function RunColumn({ run, title }: { run: RunDTO; title: string }) {
  return <section className={`${s.card} ${run.verdict === "pass" ? s.good : run.verdict === "fail" ? s.bad : ""}`}><header><h3>{title}</h3><VerdictChip verdict={run.verdict} /></header>
    <p className={s.big}>Charged {money(run.amountMinor, run.currency)} × {run.captureCount}</p>
    <ul className={s.invariantChips} aria-label={`${title} invariant verdicts`}>{run.invariants.map(item => <li key={item.id} className={item.verdict === "pass" ? s.checkPass : item.verdict === "fail" ? s.checkFail : ""} title={item.name}>{item.verdict === "pass" ? <Check size={12} /> : item.verdict === "fail" ? <X size={12} /> : null}<span>{item.id}</span><span className="sr-only"> {item.name}: {item.verdict.replaceAll("_", " ")}</span></li>)}</ul>
    <p className={s.note}><SourceChip source={run.source} small /> {run.summary}</p>
    <Link className="text-link" href={`/runs/${run.id}`}>Open this run<ArrowUpRight size={13} /></Link>
  </section>;
}

function RecordedCard({ recorded, compact = false }: { recorded: JudgeRecorded | null; compact?: boolean }) {
  if (!recorded) return <section className={s.card}><header><h3>Recorded PayPal Sandbox evidence</h3></header><p className={s.note}>The recorded archive could not be verified in this build, so no sandbox figures are shown here. <Link className={s.inline} href="/observations" prefetch={false}>Open recorded observations</Link></p></section>;
  const refund = recorded.faulty.refunds[0];
  return <section className={`${s.card} ${s.live}`} aria-label="Recorded PayPal Sandbox evidence"><header><h3>{compact ? "The same failure, recorded on the PayPal Sandbox" : `Recorded on ${day(recorded.observedAt)}`}</h3><span className={s.provenance}><SourceChip source="live_sandbox" small />{plural(recorded.pairs, "recorded pair")} · {day(recorded.observedAt)}</span></header>
    <div className={s.pair}>
      <div><h4>Faulty checkout</h4><ul className={s.resources}>{recorded.faulty.captures.map(capture => <li key={capture.id}><span><strong>{money(capture.amountMinor)}</strong> capture<small>order {capture.orderId} · read {clock(capture.observedAt)}</small></span><code>{capture.id}</code></li>)}{recorded.faulty.refunds.map(item => <li key={item.id}><span><strong>−{money(item.amountMinor)}</strong> refund<small>of capture {item.captureId} · {clock(item.observedAt)}</small></span><code>{item.id}</code></li>)}</ul><p className={s.note}>{plural(recorded.faulty.captures.length, "distinct capture")}, {plural(recorded.faulty.fulfillments, "entitlement")}{refund ? `, the ${money(refund.amountMinor)} duplicate refunded` : ""}.</p></div>
      <div><h4>Hardened checkout</h4><ul className={s.resources}>{recorded.hardened.captures.map(capture => <li key={capture.id}><span><strong>{money(capture.amountMinor)}</strong> capture<small>order {capture.orderId} · read {clock(capture.observedAt)}</small></span><code>{capture.id}</code></li>)}</ul><p className={s.note}>{plural(recorded.hardened.captures.length, "capture")}, {plural(recorded.hardened.fulfillments, "entitlement")}.</p></div>
    </div>
    <p className={s.note}>{recorded.pairs === 1 ? "This is one recorded pair of runs, not a reliability rate." : `These are ${recorded.pairs} recorded pairs of runs, not a reliability rate.`} The lost response was introduced by the lab after PayPal’s real capture response arrived. {compact ? <Link className={s.inline} href="/observations" prefetch={false}>Step through the record</Link> : null}</p>
    {compact ? null : <><ul className={s.limits}>{recorded.limitations.map(item => <li key={item}><ShieldCheck size={13} />{item}</li>)}</ul><p className={s.note}><CheckCircle2 size={13} /> {recorded.checksPassed} of {recorded.checks} record checks passed · archive SHA-256 <code className={s.hash}>{recorded.sha256}</code> · <a className={s.inline} href="/observations/archive">Download the original JSON</a></p></>}
  </section>;
}
