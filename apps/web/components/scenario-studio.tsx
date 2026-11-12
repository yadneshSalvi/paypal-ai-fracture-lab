"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowUpRight, Braces, Check, FlaskConical, History, Layers3, LoaderCircle, Play, Search, ShieldCheck, X } from "lucide-react";
import type { Revision, ScenarioDTO } from "@fracture/contracts";
import { AppShell, LoadingWorkspace } from "./app-shell";
import { EmptyState, Eyebrow, SectionTitle, SourceChip, shortId } from "./primitives";
import { useWorkspace } from "./workspace-provider";
import s from "./scenario-studio.module.css";

type Filter = "all" | "sample" | "recorded_live";
const OPEN_STAGES = ["created", "preflight", "provisioning", "executing", "observing", "evaluating", "awaiting_approval"];
const kind = (scenario: ScenarioDTO) => scenario.catalog ?? (scenario.available ? "sample" : "roadmap");

export function ScenarioStudioPage() {
  const { workspace, loading, refresh } = useWorkspace();
  return <AppShell>{loading ? <LoadingWorkspace /> : !workspace ? <EmptyState title="The workspace service is disconnected." action={<button className="button primary" onClick={() => void refresh()}>Reconnect to the workspace</button>}>No scenarios have loaded. Reconnect to load your saved session.</EmptyState> : <ScenarioStudio />}</AppShell>;
}

function ScenarioStudio() {
  const { workspace, activeProjectId, createRun, busy } = useWorkspace();
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [revision, setRevision] = useState<Revision>("faulty");
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  // The catalogue lists only what a visitor can run or inspect. Everything else lives on /limits.
  const listed = workspace?.scenarios.filter(scenario => scenario.fixtureIds.includes(activeProjectId) && kind(scenario) !== "roadmap") ?? [];
  const counts = { sample: listed.filter(item => kind(item) === "sample").length, recorded_live: listed.filter(item => kind(item) === "recorded_live").length };
  const shown = listed.filter(scenario => (filter === "all" || kind(scenario) === filter) && `${scenario.id} ${scenario.title} ${scenario.family}`.toLowerCase().includes(query.toLowerCase()));
  const selected = listed.find(scenario => scenario.id === selectedId) ?? listed[0];
  const recorded = selected && kind(selected) === "recorded_live" ? selected.recorded ?? null : null;
  // The service runs one journey per session at a time. Say so before the click, with the way forward.
  const open = workspace?.runs.find(run => OPEN_STAGES.includes(run.stage));
  async function start() {
    if (!selected || !selected.available) return;
    const run = await createRun(activeProjectId, selected.id, revision);
    if (run) router.push(`/runs/${run.id}`);
  }
  return <>
    <SectionTitle eyebrow="SCENARIO STUDIO" title="Choose where the story breaks." description="Every case here runs on click against the local provider model, or opens a recorded live sandbox comparison. Each names its trigger and the invariants that judge it." />
    <div className="studio-layout">
      <section>
        <div className="list-toolbar">
          <div className="segmented-control" role="group" aria-label="Scenario kind">
            <button className={filter === "all" ? "active" : ""} aria-pressed={filter === "all"} onClick={() => setFilter("all")}>All · {listed.length}</button>
            <button className={filter === "sample" ? "active" : ""} aria-pressed={filter === "sample"} onClick={() => setFilter("sample")}>Sample · {counts.sample}</button>
            {counts.recorded_live ? <button className={filter === "recorded_live" ? "active" : ""} aria-pressed={filter === "recorded_live"} onClick={() => setFilter("recorded_live")}>Recorded live · {counts.recorded_live}</button> : null}
          </div>
          <label className="search-field compact"><Search size={14} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Find a fault…" aria-label="Filter scenarios" /></label>
        </div>
        <div className="scenario-cards">
          {shown.map(scenario => <ScenarioCard key={scenario.id} scenario={scenario} selected={scenario.id === selected?.id} onSelect={() => setSelectedId(scenario.id)} />)}
          {!shown.length ? <EmptyState title="No matching scenarios">Try another filter or choose a different project.</EmptyState> : null}
        </div>
        <p className={s.roadmapNote}>Looking for a case that is not listed? <Link href="/limits">Roadmap and limits<ArrowUpRight size={12} /></Link> names each one and why it is not in this release.</p>
      </section>
      <aside className="scenario-inspector" aria-live="polite">{selected ? <>
        <Eyebrow>{recorded ? "RECORDED COMPARISON" : "EXPERIMENT MANIFEST"}</Eyebrow>
        <span className="scenario-id mono">{selected.id}</span>
        <h2>{selected.title}</h2>
        <p>{selected.description}</p>
        <dl className="manifest-fields">
          <div><dt>Trigger</dt><dd>{selected.trigger}</dd></div>
          <div><dt>Interception phase</dt><dd>{selected.phase}</dd></div>
          <div><dt>Fault source</dt><dd>{recorded ? "Local interruption after PayPal's real response" : "Local provider model"}</dd></div>
          <div><dt>Invariants</dt><dd>{selected.invariantIds.join(" · ")}</dd></div>
        </dl>
        {recorded ? <>
          <div className={s.recorded}><History size={16} /><div><strong>{recorded.label}</strong><p>{recorded.summary}</p></div></div>
          <div className={s.recordedLinks}>{recorded.links.map((link, index) => <Link key={link.href} className={`button ${index === 0 ? "primary" : "secondary"} full-width`} href={link.href}>{link.label}<ArrowRight size={14} /></Link>)}</div>
          <p className={s.recordedFoot}>A new live run needs a person to approve each order on PayPal, so this case opens its recording instead of running on click.</p>
        </> : <>
          <label className="field-label" htmlFor="scenario-revision">Application revision</label>
          <select className="select-control" id="scenario-revision" value={revision} onChange={event => setRevision(event.target.value as Revision)}><option value="faulty">Faulty tutorial baseline</option><option value="hardened">Hardened reference control</option></select>
          <div className="scope-card"><ShieldCheck size={16} /><div><strong>Sample execution</strong><p>Runs against the local provider model. No PayPal request, credential or buyer approval is involved.</p></div></div>
          {open ? <div className={s.openRun} role="status"><div><strong>One run is still open</strong><p>{open.scenarioTitle} is waiting for its next step. Finish it, then run this one.</p></div><Link className="button secondary" href={`/runs/${open.id}`}>Continue it<ArrowRight size={13} /></Link></div> : null}
          <button className="button primary full-width" disabled={!selected.available || Boolean(busy) || Boolean(open)} onClick={() => void start()}>{busy === "create-run" ? <LoaderCircle size={15} className="spin" /> : <Play size={14} fill="currentColor" />}Run sample scenario<ArrowRight size={14} /></button>
        </>}
        <div className="manifest-footer"><SourceChip source={selected.mode} small /><code>{shortId(selected.hash, 10)}</code></div>
        <details className="manifest-details"><summary>Inspect the exact manifest<Braces size={13} /></summary><pre>{JSON.stringify({ id: selected.id, kind: kind(selected), trigger: selected.trigger, phase: selected.phase, fixture: activeProjectId, ...(recorded ? { observedOn: recorded.observedOn } : { revision }), source: selected.mode, hash: selected.hash }, null, 2)}</pre></details>
      </> : <p className="muted">Select a project to see its scenarios.</p>}</aside>
    </div>
  </>;
}

function ScenarioCard({ scenario, selected, onSelect }: { scenario: ScenarioDTO; selected: boolean; onSelect: () => void }) {
  const live = kind(scenario) === "recorded_live";
  const special = scenario.title.toLowerCase().includes("answer");
  return <button className={`scenario-card${selected ? " selected" : ""}`} onClick={onSelect} aria-pressed={selected}>
    <div className="scenario-card-top"><span className={`round-icon ${special ? "rose" : ""}`}>{live ? <History size={18} /> : special ? <X size={18} /> : scenario.family.toLowerCase().includes("webhook") ? <Layers3 size={18} /> : <FlaskConical size={18} />}</span><span className="scenario-family">{scenario.id} · {scenario.family}</span><span className="scenario-radio">{selected ? <Check size={10} /> : null}</span></div>
    <h3>{scenario.shortTitle}</h3>
    <p>{scenario.description}</p>
    <div className="scenario-card-bottom"><SourceChip source={scenario.mode} small /><span>{live ? `Recorded ${scenario.recorded?.observedOn ?? "live"}` : `${scenario.estimatedSeconds}s est.`}</span></div>
  </button>;
}
