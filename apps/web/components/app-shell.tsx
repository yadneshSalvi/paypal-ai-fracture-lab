"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Activity, ArrowDownToLine, ArrowUpRight, BookOpen, ChevronDown, ChevronRight, Command, FileCode2, Files, FlaskConical, FolderKanban, GitBranch, HelpCircle, Layers3, PanelRightClose, Search, ShieldCheck, Sparkles, SquareTerminal, Wrench, X } from "lucide-react";
import { dateLabel, shortId, SourceChip } from "./primitives";
import { useWorkspace } from "./workspace-provider";

const navigation = [
  { href: "/projects", label: "Projects", Icon: FolderKanban },
  { href: "/campaigns", label: "Campaigns", Icon: Layers3 },
  { href: "/repairs", label: "Repairs", Icon: Wrench },
  { href: "/evaluations", label: "Evaluations", Icon: FlaskConical },
  { href: "/evidence", label: "Evidence", Icon: Files },
];
const tabs = [
  { href: "/", label: "Fracture console" },
  { href: "/integration-map", label: "Integration map" },
  { href: "/scenario-studio", label: "Scenario studio" },
  { href: "/contract-sheet", label: "Contract sheet" },
  { href: "/provider-facts", label: "Provider facts" },
  { href: "/errand", label: "Errand", badge: "AI" },
];

export function FractureMark({ size = 28 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M4 5h12l-4 8h12l-5 8h9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /><path d="m21 3-8 26" stroke="var(--rose, #fb7185)" strokeWidth="2" /></svg>;
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { workspace, error, notice, refresh, dismissNotice, activeProjectId, setActiveProjectId } = useWorkspace();
  const [search, setSearch] = useState("");
  const palette = useRef<HTMLDialogElement>(null);
  const project = workspace?.projects.find(item => item.id === activeProjectId) ?? workspace?.projects[0];
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); palette.current?.showModal(); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  const searchItems = [...tabs, ...navigation, ...(workspace?.runs.slice(0, 8).map(run => ({ href: `/runs/${run.id}`, label: `${run.projectName} · ${run.scenarioTitle}` })) ?? [])]
    .filter(item => item.label.toLowerCase().includes(search.toLowerCase()));

  return <div className="app-shell">
    <a className="skip-link" href="#main-content">Skip to workspace</a>
    <aside className="sidebar" aria-label="Main navigation">
      <Link href="/" className="brand" aria-label="Fracture Lab home"><span className="brand-mark"><FractureMark /></span><span>fracture<span className="brand-light">lab</span><span className="brand-caption">PAYMENT RELIABILITY</span></span></Link>
      <button className="workspace-switcher" type="button" onClick={() => router.push("/projects")}><span className="workspace-avatar">F</span><span>Personal workspace<small>Local development</small></span><ChevronDown size={14} /></button>
      <div className="nav-eyebrow">WORKSPACE</div>
      <nav className="main-navigation">{navigation.map(({ href, label, Icon }) => {
        const active = href === "/projects" ? pathname === "/" || pathname.startsWith("/projects") || pathname.startsWith("/runs") || tabs.some(tab => tab.href !== "/" && pathname.startsWith(tab.href)) : pathname.startsWith(href);
        const count = href === "/repairs" ? workspace?.repairs.filter(repair => repair.status !== "rejected").length : href === "/campaigns" ? workspace?.campaigns.length : undefined;
        return <Link key={href} href={href} className={`nav-item${active ? " active" : ""}`} aria-current={active ? "page" : undefined}><Icon size={18} strokeWidth={1.6} /><span>{label}</span>{count ? <span className="nav-count">{count}</span> : null}</Link>;
      })}</nav>
      <div className="sidebar-divider" />
      <div className="nav-eyebrow">YOUR PROJECTS</div>
      <nav className="project-navigation" aria-label="Projects">{workspace?.projects.map(item => <Link href={`/projects/${item.id}`} onClick={() => setActiveProjectId(item.id)} key={item.id} className={`project-nav-item${item.id === project?.id ? " selected" : ""}`}><span className={`project-dot ${item.kind}`} />{item.name}<ChevronRight size={13} /></Link>)}</nav>
      <div className="sidebar-bottom"><Link href="/judge" className="judge-link"><Sparkles size={15} /><span>Take the guided tour</span><ArrowUpRight size={13} /></Link><Link className="sidebar-help" href="/provider-facts"><BookOpen size={16} />How the lab works<ArrowUpRight size={12} /></Link><div className="local-status"><span className="status-dot mint" />Sample environment<span className="muted">↗</span></div><div className="profile-row"><span className="profile-avatar">Y</span><div>Your workspace<small>Sandbox guard enabled</small></div><ShieldCheck size={15} /></div></div>
    </aside>
    <div className="app-body">
      <header className="topbar"><div className="topbar-breadcrumb"><span>Workspace</span><ChevronRight size={13} /><span className="topbar-current">{navigation.find(item => pathname.startsWith(item.href))?.label ?? "Projects"}</span></div><div className="topbar-actions"><button className="search-trigger" aria-label="Search workspace and saved runs" onClick={() => palette.current?.showModal()}><Search size={14} /><span>Jump to anything…</span><kbd>⌘ K</kbd></button><span className="topbar-divider" /><Link href="/judge" className="icon-button" aria-label="Open guided tour"><HelpCircle size={18} /></Link><span className="top-avatar">Y</span></div></header>
      <nav className="mobile-main-navigation" aria-label="Workspace navigation">{navigation.map(({href,label,Icon}) => <Link key={href} href={href} aria-current={pathname.startsWith(href) ? "page" : undefined}><Icon size={14} />{label}</Link>)}</nav>
      <div className="project-header"><div className="project-identity"><span className={`project-monogram ${project?.kind ?? "bookshop"}`}>{project?.name.charAt(0) ?? "B"}</span><div><div className="project-name">{project?.name ?? "Bramble Books"}<ChevronDown size={14} /><label className="sr-only" htmlFor="project-select">Choose project</label><select id="project-select" className="project-select-overlay" value={project?.id ?? "bramble"} onChange={event => { setActiveProjectId(event.target.value); router.push(`/projects/${event.target.value}`); }}>{workspace?.projects.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div><span className="project-language">{project?.language ?? "TypeScript"}<span>·</span><GitBranch size={11} />{shortId(project?.sourceHash ?? "local fixture", 7)}</span></div></div><div className="session-policy"><span><ShieldCheck size={12} />Sandbox only</span><span className="policy-separator" /><SourceChip source={workspace?.source ?? "sample"} /><span className="policy-desktop">No external payment calls</span></div></div>
      <nav className="project-tabs" aria-label="Project workspace">{tabs.map(tab => {
        const active = tab.href === "/" ? pathname === "/" || pathname.startsWith("/runs/") || /^\/projects\/[^/]+$/.test(pathname) : pathname.startsWith(tab.href);
        return <Link href={tab.href} key={tab.href} aria-current={active ? "page" : undefined} className={active ? "active" : ""}>{tab.label}{tab.badge ? <span className="tiny-tag">{tab.badge}</span> : null}</Link>;
      })}</nav>
      <main id="main-content" className="main-content">{error ? <div className="error-banner" role="alert"><span>{error}</span><button onClick={() => void refresh(true)}>Reconnect</button></div> : null}{children}</main>
      <footer className="app-footer"><span><span className="status-dot mint" />Evidence stays attached.</span><span><SquareTerminal size={12} />Local fixture runtime<span className="footer-dot">·</span>Sample ≠ provider execution</span></footer>
    </div>
    {notice ? <div className="toast" role="status"><ShieldCheck size={17} /><span>{notice}</span><button onClick={dismissNotice} aria-label="Dismiss notification"><X size={15} /></button></div> : null}
    <EvidenceDrawer />
    <dialog className="command-dialog" ref={palette} onClick={event => { if (event.target === event.currentTarget) palette.current?.close(); }}><div className="command-search"><Search size={19} /><label className="sr-only" htmlFor="command-search">Search pages and runs</label><input autoFocus id="command-search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Find a page, scenario, or run…" /><button className="icon-button" onClick={() => palette.current?.close()} aria-label="Close search"><X size={18} /></button></div><div className="command-results">{searchItems.length ? searchItems.map((item, index) => <Link key={`${item.href}-${index}`} href={item.href} onClick={() => palette.current?.close()}><Command size={15} /><span>{item.label}</span><ChevronRight size={14} /></Link>) : <p className="muted padded">No matching pages or runs.</p>}</div><div className="command-footer">Navigate your workspace <kbd>esc</kbd> to close</div></dialog>
  </div>;
}

function EvidenceDrawer() {
  const { evidence, closeEvidence } = useWorkspace();
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (evidence && !dialog.current?.open) dialog.current?.showModal();
    if (!evidence && dialog.current?.open) dialog.current?.close();
  }, [evidence]);
  return <dialog ref={dialog} className="evidence-drawer" onClose={closeEvidence} onClick={event => { if (event.target === event.currentTarget) closeEvidence(); }} aria-labelledby="evidence-title"><div className="drawer-inner"><header className="drawer-header"><div><span className="eyebrow">ATTACHED PROOF</span><h2 id="evidence-title">Evidence record</h2></div><button className="icon-button" onClick={closeEvidence} aria-label="Close evidence drawer"><PanelRightClose size={20} /></button></header>{evidence ? <><div className="drawer-provenance"><SourceChip source={evidence.source} /><span className="tiny-tag">{evidence.kind}</span></div><h3 className="drawer-title">{evidence.title}</h3><p className="drawer-summary">{evidence.summary}</p><dl className="evidence-meta"><div><dt>Observed</dt><dd>{dateLabel(evidence.createdAt)}</dd></div><div><dt>Record</dt><dd className="mono">{evidence.id}</dd></div><div><dt>SHA-256</dt><dd className="mono break-all">{evidence.sha256}</dd></div>{evidence.sourceRef ? <div><dt>Source</dt><dd className="mono">{evidence.sourceRef.path}:{evidence.sourceRef.line}</dd></div> : null}</dl><div className="code-heading"><FileCode2 size={14} />Redacted record</div><pre className="evidence-json">{JSON.stringify(evidence.body, null, 2)}</pre><div className="redaction-note"><ShieldCheck size={15} /><div>Safe to inspect<small>{evidence.redactions.length ? `Redacted fields: ${evidence.redactions.join(", ")}` : "This record contains allowlisted local fixture data."}</small></div></div>{evidence.runId ? <Link className="button secondary full-width" href={`/reports/${evidence.runId}`} onClick={closeEvidence}><ArrowDownToLine size={15} />Open complete report</Link> : null}</> : null}</div></dialog>;
}

export function LoadingWorkspace() {
  return <div className="workspace-loading" aria-busy="true" aria-live="polite"><div className="loading-kicker"><Activity size={16} />Opening your observatory</div><div className="skeleton skeleton-title" /><div className="skeleton skeleton-subtitle" /><div className="skeleton skeleton-money" /><div className="skeleton-workbench"><div className="skeleton skeleton-phone" /><div className="skeleton skeleton-lanes" /></div><p>Loading the saved sample session and its evidence…</p></div>;
}
