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
  return <><SectionTitle eyebrow="ERRAND · THE AGENT TOOL FIXTURE" title="AI agents can lose the answer, too." description={errand.summary} actions={<SourceChip source={errand.source} />} /><div className="errand-intent"><span className="round-icon violet"><Bot size={26} /></span><div><Eyebrow>ONE SHOPPING INTENT</Eyebrow><h2>“Find the book and start my order.”</h2><p>A lost create-order response tests the harness around the agent’s tool call.</p></div><span className="orders-not-charges"><CircleAlert size={13} />Orders, not charges</span></div><div className="errand-comparison"><section className="errand-arm unprotected"><div className="errand-arm-title"><span className="status-dot rose" /><h2>Unprotected harness</h2><span className="tiny-tag">BEFORE</span></div><div className="errand-order-count"><strong>{errand.unprotectedOrderIds.length}</strong><span>order IDs<br />for one intent</span></div><div className="errand-orders">{errand.unprotectedOrderIds.map((id, index) => <div key={id}><span>0{index + 1}</span><code>{id}</code><SourceChip source={errand.source} small /></div>)}</div><p>A fresh identity on retry can create another business operation.</p><button className="button secondary" disabled={Boolean(busy) || !canRun} onClick={() => void start("faulty")}><Play size={13} />Run unprotected harness</button></section><section className="errand-arm hardened"><div className="errand-arm-title"><span className="status-dot mint" /><h2>Hardened harness</h2><span className="tiny-tag">AFTER</span></div><div className="errand-order-count"><strong>{errand.hardenedOrderIds.length}</strong><span>order ID{errand.hardenedOrderIds.length === 1 ? "" : "s"}<br />for one intent</span></div><div className="errand-orders">{errand.hardenedOrderIds.map((id, index) => <div key={id}><span>0{index + 1}</span><code>{id}</code><SourceChip source={errand.source} small /></div>)}</div><p>Stable business identity and explicit unknown-outcome recovery.</p><button className="button secondary" disabled={Boolean(busy) || !canRun} onClick={() => void start("hardened")}><ShieldCheck size={13} />Run protected harness</button></section></div><div className="list-toolbar"><div className="section-label">ACTION TRANSCRIPT<span>{errand.toolCalls.length}</span></div><span className="pending-label">Action summaries, not private reasoning</span></div><div className="tool-transcript">{errand.toolCalls.map((call, index) => <article key={call.id} className={`tool-call ${call.status.toLowerCase().includes("lost") ? "lost" : ""}`}><span className="tool-sequence mono">{String(index + 1).padStart(2, "0")}</span><span className="tool-call-icon"><SquareTerminal size={18} /></span><div className="tool-call-body"><div className="tool-call-title"><h3>{call.tool}</h3><span className="tool-transport">{call.transport}</span><SourceChip source={call.source} small /></div><p>{call.detail}</p><div className="tool-call-meta"><span className={`identity-badge ${call.identity}`}>Request ID: {call.identity}</span><span className="tool-response">{call.status}</span><button className="text-link" onClick={()=>openEvidence(call.id)}>Inspect tool receipt<ArrowUpRight size={12}/></button>{call.orderId ? <code>{call.orderId}</code> : null}</div></div></article>)}</div><div className="errand-charge-note"><CreditCardIcon /><strong>{errand.chargeCount} captures recorded</strong><span>Created orders do not imply payer approval or a captured payment.</span></div><div className="limitations"><ShieldCheck size={16} /><div><strong>Transport and capability scope</strong>{errand.limitations.map(limit => <p key={limit}>{/capability gate/i.test(limit) ? <>Errand runs against the local provider model only. A live-sandbox version is listed under <Link href="/limits" className="text-link">Roadmap and limits</Link>.</> : limit}</p>)}</div></div></>;
}
function CreditCardIcon() { return <FileCode2 size={16} />; }

