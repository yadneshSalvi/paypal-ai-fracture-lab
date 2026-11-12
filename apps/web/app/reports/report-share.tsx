"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Link2 } from "lucide-react";
import { qrMatrix, qrSvgPath } from "./qr";
import styles from "./report-share.module.css";

/** Stable deep link for one run report, with a QR code drawn locally as inline SVG (no network call). */
export function ReportShare({ runId }: { runId: string }) {
  const [origin, setOrigin] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => { setOrigin(window.location.origin); }, []);
  const link = origin ? `${origin}/reports/${runId}` : null;
  const qr = useMemo(() => { const matrix = link ? qrMatrix(link) : null; return matrix ? qrSvgPath(matrix) : null; }, [link]);
  async function copy() { if (!link) return; try { await navigator.clipboard.writeText(link); setCopied(true); window.setTimeout(() => setCopied(false), 2000); } catch { setCopied(false); } }
  return <section className={`report-section ${styles.share}`} aria-label="Report link">
    <h2>Report link</h2>
    <div className={styles.body}>
      <div className={styles.text}>
        <p className={styles.link}><Link2 size={13} aria-hidden="true" /><a href={`/reports/${runId}`}>{link ?? `/reports/${runId}`}</a></p>
        <button type="button" className={`button secondary ${styles.copy}`} onClick={() => void copy()} disabled={!link}>{copied ? <Check size={13} /> : <Copy size={13} />}{copied ? "Link copied" : "Copy link"}</button>
        <span className="sr-only" role="status">{copied ? "Report link copied." : ""}</span>
        <p>This address is stable for this run. Reports stay private to the judge session that produced them, so the link opens the report in this browser session only. Anywhere else it shows a short explanation and none of this data.</p>
        <p>To hand the report to someone else, send the standalone HTML or the JSON manifest from the toolbar: both are complete, portable copies.</p>
      </div>
      {qr ? <figure className={styles.qr}><svg viewBox={`0 0 ${qr.size} ${qr.size}`} role="img" aria-label={`QR code for ${link}`} shapeRendering="crispEdges"><rect width={qr.size} height={qr.size} fill="#ffffff" /><path d={qr.path} fill="#16242a" /></svg><figcaption>Same link, as a QR code</figcaption></figure> : null}
    </div>
  </section>;
}
