import type { ReactNode } from "react";
import type { Provenance, Verdict } from "@fracture/contracts";
import { ArrowUpRight, Check, CircleHelp, Clock3, FlaskConical, LockKeyhole, X } from "lucide-react";

export function money(minor: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(minor / 100);
}
export function shortId(value: string, length = 10) { return value.length > length + 3 ? `${value.slice(0, length)}…` : value; }
export function duration(ms: number) { return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(ms < 10000 ? 2 : 1)} s`; }
export function dateLabel(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }).format(new Date(value)) + " UTC";
}
export function SourceChip({ source, small = false }: { source: Provenance; small?: boolean }) {
  const labels: Record<Provenance, string> = { sample: "Sample", live_sandbox: "Live · Sandbox", replay: "Replay", modelled: "Modelled" };
  const descriptions: Record<Provenance, string> = {
    sample: "Deterministic local fixture. No provider execution is implied.",
    live_sandbox: "Observed against real PayPal sandbox resources.",
    replay: "Previously recorded evidence; not a new provider event.",
    modelled: "A modelled outcome, not an observed transaction.",
  };
  return <span className={`source-chip source-${source}${small ? " small" : ""}`} title={descriptions[source]}><FlaskConical size={small ? 10 : 12} aria-hidden="true" />{labels[source]}</span>;
}
export function VerdictChip({ verdict }: { verdict: Verdict }) {
  const Icon = verdict === "pass" ? Check : verdict === "fail" ? X : verdict === "blocked" ? LockKeyhole : CircleHelp;
  const label = { pass: "Passed", fail: "Failed", inconclusive: "Inconclusive", not_applicable: "Not applicable", blocked: "Blocked" }[verdict];
  return <span className={`verdict verdict-${verdict}`}><Icon size={13} aria-hidden="true" />{label}</span>;
}
export function Eyebrow({ children }: { children: ReactNode }) { return <div className="eyebrow">{children}</div>; }
export function EmptyState({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return <div className="empty-state"><div className="empty-symbol"><FlaskConical size={25} /></div><h2>{title}</h2><p>{children}</p>{action}</div>;
}
export function SectionTitle({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return <header className="section-heading"><div>{eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}<h1>{title}</h1>{description ? <p>{description}</p> : null}</div>{actions ? <div className="heading-actions">{actions}</div> : null}</header>;
}
export function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return <a href={href} target="_blank" rel="noreferrer" className="text-link">{children}<ArrowUpRight size={13} /></a>;
}
export function PendingLabel({ children }: { children: ReactNode }) { return <span className="pending-label"><Clock3 size={12} />{children}</span>; }
