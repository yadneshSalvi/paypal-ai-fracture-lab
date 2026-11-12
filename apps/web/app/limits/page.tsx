import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { roadmapScenarios, scenarios } from "../../../../packages/scenarios/src/index";
import s from "./limits.module.css";

export const dynamic = "force-static";
export const metadata: Metadata = { title: "Roadmap and limits", description: "What Fracture Lab models locally, what it recorded live in PayPal sandbox, and each scenario that is not in this release, with the reason." };

const groups = [
  { id: "live", title: "Live sandbox cases", note: "Each of these needs a person, a provider event, or fresh consent that a click cannot supply.", match: (id: string) => id.startsWith("L") },
  { id: "negative", title: "Provider-native refusals", note: "A refusal is only worth modeling once the provider's own answer has been recorded.", match: (id: string) => id.startsWith("N") },
  { id: "local", title: "Local cases", note: "These would run against the local provider model, which does not yet cover what they need.", match: (id: string) => !id.startsWith("L") && !id.startsWith("N") },
];

export default function Page() {
  const sample = scenarios.filter(item => item.catalog === "sample");
  const recorded = scenarios.filter(item => item.catalog === "recorded_live");
  return <AppShell>
    <article className={s.page}>
      <header className={s.intro}>
        <p className={s.eyebrow}>ROADMAP AND LIMITS</p>
        <h1>What this release does, and where it stops.</h1>
        <p className={s.lede}>{sample.length} scenarios run on click against a local provider model. {recorded.length === 1 ? "One comparison was" : `${recorded.length} comparisons were`} recorded live in PayPal sandbox. The {roadmapScenarios.length} cases below are defined but not part of this release, each with its reason.</p>
      </header>

      <section aria-labelledby="limits-kinds">
        <h2 id="limits-kinds" className={s.sectionTitle}>Modeled, recorded, live</h2>
        <div className={s.kinds}>
          <div className={s.kind} data-tone="sample">
            <span className={s.kindLabel}>Sample</span>
            <h3>A local model of the provider</h3>
            <p>Orders, captures and refunds are kept in the lab&rsquo;s own database. No request reaches PayPal and no money moves. A scripted buyer approves each order.</p>
            <p>The hardened shop still serializes every call through the pinned APIMatic SDK. The faulty shop sends raw HTTP. The lab adds no identity to either.</p>
            <Link href="/scenario-studio">Run a Sample scenario</Link>
          </div>
          <div className={s.kind} data-tone="recorded">
            <span className={s.kindLabel}>Recorded live</span>
            <h3>One sandbox comparison, kept as it happened</h3>
            <p>On 11 November 2026 a person approved three real PayPal sandbox orders: two for the faulty shop, one for the hardened shop. The captures, the refund of the duplicate and the provider&rsquo;s later reads are retained.</p>
            <p>The lost answer was withheld locally, after PayPal&rsquo;s real response arrived. It is one comparison, not a rate.</p>
            <Link href="/observations">Step through the recording</Link>
          </div>
          <div className={s.kind} data-tone="limit">
            <span className={s.kindLabel}>Not on click</span>
            <h3>New live runs</h3>
            <p>A live run needs someone to approve each order on PayPal, so a visitor cannot start one from the catalogue.</p>
            <p>Nothing here uses real money. Sandbox results say nothing about production eligibility.</p>
            <Link href="/live-bramble">Open the live sandbox page</Link>
          </div>
        </div>
      </section>

      <section aria-labelledby="limits-model">
        <h2 id="limits-model" className={s.sectionTitle}>What the local model covers</h2>
        <div className={s.model}>
          <div>
            <h3>Modeled</h3>
            <ul>
              <li>Create order, scripted buyer approval, one capture per approved order</li>
              <li>Completed and pending captures</li>
              <li>Refunds, refused once they exceed the captured amount</li>
              <li>Replays joined on <code>PayPal-Request-Id</code>; a changed body under the same id is refused</li>
              <li>Lost, malformed and unavailable responses, and refused authentication</li>
            </ul>
          </div>
          <div>
            <h3>Not modeled</h3>
            <ul>
              <li>Authorizations, their capture and their expiry</li>
              <li>Pending or failed refunds</li>
              <li>Webhook delivery, signing and redelivery by the provider</li>
              <li>Saved wallets, disputes and payouts</li>
              <li>Provider latency, rate limits and declines by instrument</li>
            </ul>
          </div>
        </div>
        <p className={s.modelNote}>The model ignores a generic <code>Idempotency-Key</code>, matching five recorded create-order trials in sandbox. Capture and refund were not probed. <Link href="/provider-facts">Provider facts</Link> holds the evidence.</p>
      </section>

      <section aria-labelledby="limits-roadmap">
        <h2 id="limits-roadmap" className={s.sectionTitle}>Not in this release</h2>
        {groups.map(group => {
          const rows = roadmapScenarios.filter(item => group.match(item.id));
          return rows.length ? <div key={group.id} className={s.group}>
            <div className={s.groupHead}><h3>{group.title}</h3><p>{group.note}</p></div>
            <ul className={s.rows}>{rows.map(item => <li key={item.id}><code>{item.id}</code><div><strong>{item.title}</strong><p>{item.roadmapReason}</p></div></li>)}</ul>
          </div> : null;
        })}
      </section>
    </article>
  </AppShell>;
}
