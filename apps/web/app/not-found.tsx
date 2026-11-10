import Link from "next/link";
export default function NotFound() { return <main className="route-error"><div className="eyebrow">404 · OUTSIDE THE OBSERVATION WINDOW</div><h1>This page isn’t in the map.</h1><p>Return to a saved investigation or choose a new scenario.</p><Link href="/" className="button primary">Open Fracture Lab</Link></main>; }
