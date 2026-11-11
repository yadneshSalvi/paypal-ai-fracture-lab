"use client";
import {ArrowUpRight,Check,FlaskConical} from 'lucide-react';
import {useWorkspace} from './workspace-provider';
const armNames={provider_same:'Same PayPal request ID',provider_different:'Different PayPal request IDs',generic_same:'Same generic key only',generic_different:'Different generic keys only'};
const ids=Object.keys(armNames) as (keyof typeof armNames)[];
export function CreateIdentityExperiment(){
 const {workspace,openEvidence}=useWorkspace();const proof=workspace?.evidence.find(e=>e.id==='artifact:paypal-create-identity-qualification.json');
 if(!proof||!Array.isArray(proof.body.pairs))return null;
 const pairs=proof.body.pairs as {trial:number;arm:string;result:string;elapsedBetweenRequestsMs:number|null}[];
 const windows=pairs.flatMap(p=>typeof p.elapsedBetweenRequestsMs==='number'?[p.elapsedBetweenRequestsMs/1000]:[]);
 return <section className="identity-experiment" aria-labelledby="identity-title">
  <div className="identity-heading"><span className="round-icon violet"><FlaskConical size={22}/></span><div><span className="eyebrow">A CONTROLLED SANDBOX EXPERIMENT</span><h2 id="identity-title">Two requests. How many orders?</h2><p>Four header treatments. The same body. Every returned order checked independently.</p></div><span className="identity-spend">$0<span>captured</span></span></div>
  <div className="identity-trials" role="region" aria-label="Five matched header trials" tabIndex={0}><table><caption>Five matched trials · each cell compares two create calls</caption><thead><tr><th scope="col">Request identity</th>{[1,2,3,4,5].map(n=><th key={n} scope="col">Trial {n}</th>)}</tr></thead><tbody>{ids.map(arm=><tr key={arm}><th scope="row">{armNames[arm]}<small>{arm.startsWith('generic')?'PayPal-Request-Id absent':'Generic key changes between calls'}</small></th>{[1,2,3,4,5].map(trial=>{const p=pairs.find(p=>p.trial===trial&&p.arm===arm),same=p?.result==='same_resource',distinct=p?.result==='distinct_resources';return <td key={trial}><span className={`identity-result ${same?'same':distinct?'distinct':'unknown'}`}>{same?<Check size={14}/>:null}{same?'1 order':distinct?'2 orders':'Unknown'}</span></td>;})}</tr>)}</tbody></table></div>
  <div className="identity-footer"><p>{Number(proof.body.verifiedCalls)||0} / 40 calls independently verified. {windows.length?`${Math.min(...windows).toFixed(1)}–${Math.max(...windows).toFixed(1)}s between paired requests. `:''}One merchant, one endpoint; this does not establish refund behavior or a retention guarantee.</p><button className="text-link" onClick={()=>openEvidence(proof.id)}>Inspect all trials<ArrowUpRight size={14}/></button></div>
 </section>;
}
