"use client";
import{ArrowUpRight,Check,FlaskConical}from'lucide-react';
import{inspectNegativeCampaign}from'../../../packages/provider-probes/src/negative';
import{useWorkspace}from'./workspace-provider';
const labels:Record<string,string>={INSTRUMENT_DECLINED:'A payment method is declined',DUPLICATE_INVOICE_ID:'An invoice is already used',PAYER_CANNOT_PAY:'The payer cannot pay'};
export function NegativePairsExperiment(){
 const{workspace,openEvidence}=useWorkspace();const proof=workspace?.evidence.find(e=>e.id==='artifact:paypal-negative-pairs-qualification.json');const r=proof?inspectNegativeCampaign(proof.body):null;if(!proof||!r)return null;
 return <section className="identity-experiment negative-experiment" aria-labelledby="negative-title">
  <div className="identity-heading"><span className="round-icon violet"><FlaskConical size={22}/></span><div><span className="eyebrow">PROVIDER-GENERATED TEST ERRORS</span><h2 id="negative-title">Practice the refusal.</h2><p>Three error codes, each compared with the same order’s normal response.</p></div><span className="identity-spend">{r.qualifiedPairs}/3<span>qualified pairs</span></span></div>
  <div className="negative-control"><span className="tiny-tag">THE CONTROL</span><p>Without a mock header, all five unapproved orders returned <code>ORDER_NOT_APPROVED</code>. The requested errors came from PayPal’s sandbox negative-testing facility.</p></div>
  <div className="negative-pair-grid">{r.pairs.map(p=><article key={p.code}><span className="eyebrow">POST · ORDER CAPTURE</span><h3>{labels[p.code]}</h3><code>{p.code}</code><div className="negative-trials" aria-label={`${p.qualified} of 5 matched trials qualified`}>{p.trials.map((t,i)=><span key={t.id} className={t.control&&t.injected?'qualified':'unqualified'} title={`${t.id}: ${t.control&&t.injected?'control and injected response verified':'not qualified'}`}>{t.control&&t.injected?<Check size={13}/>:i+1}</span>)}<strong>{p.qualified}/5</strong></div></article>)}</div>
  <div className="identity-footer"><p>Five original orders. Forty independent before/after reads. No approvals or captured funds. These are injected errors on unapproved orders; application recovery and real payer declines need their own evidence.</p><button className="text-link" onClick={()=>openEvidence(proof.id)}>Compare the exact responses<ArrowUpRight size={14}/></button></div>
 </section>;
}
