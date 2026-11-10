"use client";
import Link from "next/link";
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="route-error"><div className="eyebrow">THE WORKSPACE HIT A FRACTURE</div><h1>Your saved evidence is still there.</h1><p>Try loading this view again. A browser error does not change a recorded payment observation.</p><div><button className="button primary" onClick={reset}>Try this view again</button><Link href="/projects" className="button secondary">Open projects</Link></div></main>;
}
