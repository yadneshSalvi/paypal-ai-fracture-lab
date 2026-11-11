"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowDownToLine, ArrowRight, ArrowUpRight, Bot, Check, ChevronRight, CircleAlert, Clock3, Code2, FileCode2, FlaskConical, GitBranch, Layers3, LoaderCircle, LockKeyhole, Play, ShieldCheck, Sparkles, SquareTerminal } from "lucide-react";
import type { Revision } from "@fracture/contracts";
import { dateLabel, EmptyState, Eyebrow, SectionTitle, shortId, SourceChip } from "./primitives";
import { useWorkspace } from "./workspace-provider";
import { useRouter } from "next/navigation";

export function ErrandView() {
  const { workspace, busy, createRun, openEvidence } = useWorkspace();
  const router = useRouter();
  const errand = workspace?.errand;
  if (!errand) return null;
  async function start(revision: Revision) {
    const scenario = workspace?.scenarios.find(item => item.fixtureIds.includes("errand") && item.available);
    if (!scenario) return;
    const run = await createRun("errand", scenario.id, revision);
    if (run) router.push("/errand");
  }
  const canRun = workspace?.scenarios.some(item => item.fixtureIds.includes("errand") && item.available);
  return <><SectionTitle eyebrow="ERRAND · THE AGENT TOOL FIXTURE" title="AI agents can lose the answer, too." description={errand.summary} actions={<SourceChip source={errand.source} />} /><div className="errand-intent"><span className="round-icon violet"><Bot size={26} /></span><div><Eyebrow>ONE SHOPPING INTENT</Eyebrow><h2>“Find the book and start my order.”</h2><p>A lost create-order response tests the harness around the agent’s tool call.</p></div><span className="orders-not-charges"><CircleAlert size={13} />Orders, not charges</span></div><div className="errand-comparison"><section className="errand-arm unprotected"><div className="errand-arm-title"><span className="status-dot rose" /><h2>Unprotected harness</h2><span className="tiny-tag">BEFORE</span></div><div className="errand-order-count"><strong>{errand.unprotectedOrderIds.length}</strong><span>order IDs<br />for one intent</span></div><div className="errand-orders">{errand.unprotectedOrderIds.map((id, index) => <div key={id}><span>0{index + 1}</span><code>{id}</code><SourceChip source={errand.source} small /></div>)}</div><p>A fresh identity on retry can create another business operation.</p><button className="button secondary" disabled={Boolean(busy) || !canRun} onClick={() => void start("faulty")}><Play size={13} />Run unprotected harness</button></section><section className="errand-arm hardened"><div className="errand-arm-title"><span className="status-dot mint" /><h2>Hardened harness</h2><span className="tiny-tag">AFTER</span></div><div className="errand-order-count"><strong>{errand.hardenedOrderIds.length}</strong><span>order ID{errand.hardenedOrderIds.length === 1 ? "" : "s"}<br />for one intent</span></div><div className="errand-orders">{errand.hardenedOrderIds.map((id, index) => <div key={id}><span>0{index + 1}</span><code>{id}</code><SourceChip source={errand.source} small /></div>)}</div><p>Stable business identity and explicit unknown-outcome recovery.</p><button className="button secondary" disabled={Boolean(busy) || !canRun} onClick={() => void start("hardened")}><ShieldCheck size={13} />Run protected harness</button></section></div><div className="list-toolbar"><div className="section-label">ACTION TRANSCRIPT<span>{errand.toolCalls.length}</span></div><span className="pending-label">Action summaries, not private reasoning</span></div><div className="tool-transcript">{errand.toolCalls.map((call, index) => <article key={call.id} className={`tool-call ${call.status.toLowerCase().includes("lost") ? "lost" : ""}`}><span className="tool-sequence mono">{String(index + 1).padStart(2, "0")}</span><span className="tool-call-icon"><SquareTerminal size={18} /></span><div className="tool-call-body"><div className="tool-call-title"><h3>{call.tool}</h3><span className="tool-transport">{call.transport}</span><SourceChip source={call.source} small /></div><p>{call.detail}</p><div className="tool-call-meta"><span className={`identity-badge ${call.identity}`}>Request ID: {call.identity}</span><span className="tool-response">{call.status}</span><button className="text-link" onClick={()=>openEvidence(call.id)}>Inspect tool receipt<ArrowUpRight size={12}/></button>{call.orderId ? <code>{call.orderId}</code> : null}</div></div></article>)}</div><div className="errand-charge-note"><CreditCardIcon /><strong>{errand.chargeCount} captures recorded</strong><span>Created orders do not imply payer approval or a captured payment.</span></div><div className="limitations"><ShieldCheck size={16} /><div><strong>Transport and capability scope</strong>{errand.limitations.map(limit => <p key={limit}>{limit}</p>)}</div></div></>;
}
function CreditCardIcon() { return <FileCode2 size={16} />; }

const tourSteps = [
  { title: "See the customer consequence", description: "One intended purchase, two observed sample captures. Start with Maya’s phone and the money band.", href: "/", icon: FlaskConical },
  { title: "Rewind what each participant knew", description: "The timeline scrubber hides future observations. Provider success and application failure are separate facts.", href: "/", icon: Clock3 },
  { title: "Follow the integration", description: "Select a transit stop to inspect its source. Risks stay distinct from observed failures.", href: "/integration-map", icon: GitBranch },
  { title: "Test the agent harness", description: "Errand shows a lost tool response, request identity, and two orders versus one. Orders are not charges.", href: "/errand", icon: Bot },
  { title: "Reject a deceptive patch", description: "The seeded policy-test candidate weakens an assertion. Its red policy check keeps it out.", href: "/repairs", icon: ShieldCheck },
  { title: "Bind the contract to proof", description: "Contract rows connect the APIMatic guidance to real source and executed local tests.", href: "/contract-sheet", icon: FileCode2 },
  { title: "Read the unknowns", description: "Provider facts keep documentation, observations, and untested capabilities visibly separate.", href: "/provider-facts", icon: CircleAlert },
  { title: "Keep the report", description: "The report preserves the scope, verdict, resource history, exact revision, and evidence records.", href: "/evidence", icon: ArrowDownToLine },
];

export function JudgeView() {
  const { workspace, activeRunId, createRun, busy } = useWorkspace();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const run = workspace?.runs.find(item => item.id === (activeRunId ?? workspace.selectedRunId)) ?? workspace?.runs[0];
  const current = tourSteps[step]!;
  const Icon = current.icon;
  async function fresh() {
    const scenario = workspace?.scenarios.find(item => item.fixtureIds.includes("bramble") && item.available && item.id === "S0");
    if (!scenario) return;
    const result = await createRun("bramble", scenario.id, "faulty");
    if (result) router.push(`/runs/${result.id}`);
  }
  return <><div className="judge-hero"><span className="judge-kicker"><Sparkles size={14} />WELCOME TO THE PAYMENT RELIABILITY LAB</span><h1>One purchase.<br /><span>One promise worth testing.</span></h1><p>Coding agents write payment integrations. Fracture Lab tests the failure paths—then makes the fix prove itself.</p><div className="judge-hero-actions"><Link href={run ? `/runs/${run.id}` : "/scenario-studio"} className="button primary"><Play size={14} fill="currentColor" />Open the fracture<ArrowRight size={15} /></Link><button className="button secondary" disabled={Boolean(busy)} onClick={() => void fresh()}>{busy ? <LoaderCircle size={14} className="spin" /> : <FlaskConical size={14} />}Start a fresh sample run</button></div><div className="judge-mode-note"><SourceChip source={workspace?.source ?? "sample"} /><span>Isolated local fixture session. No external payments or buyer credentials.</span></div><div className="judge-orbit" aria-hidden="true"><span /><span /><span /><div><FlaskConical size={38} /></div></div></div><div className="judge-tour-layout"><nav className="tour-step-list" aria-label="Guided tour">{tourSteps.map((item, index) => <button key={item.title} onClick={() => setStep(index)} className={step === index ? "active" : ""} aria-current={step === index ? "step" : undefined}><span>{index + 1}</span><strong>{item.title}</strong><ChevronRight size={14} /></button>)}</nav><section className="tour-detail"><span className="round-icon violet"><Icon size={26} /></span><Eyebrow>GUIDED TOUR · {step + 1} OF {tourSteps.length}</Eyebrow><h2>{current.title}</h2><p>{current.description}</p><Link className="button primary" href={step === 0 || step === 1 ? run ? `/runs/${run.id}` : "/" : current.href}>Open this step<ArrowRight size={14} /></Link><div className="tour-pagination"><button disabled={step === 0} onClick={() => setStep(value => value - 1)}>Previous</button><span>{step + 1} / {tourSteps.length}</span><button disabled={step === tourSteps.length - 1} onClick={() => setStep(value => value + 1)}>Next<ArrowRight size={12} /></button></div></section></div></>;
}
