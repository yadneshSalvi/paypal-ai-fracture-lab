import {arms,canonical,digest,type Protocol} from './protocol';
export interface Assignment {candidateId:string;taskId:string;language:string;family:string;split:'development'|'held_out';modelId:string;arm:'A'|'B'|'C';repeat:number;seedLabel:string;position:number}
/** Stable pseudorandom ordering changes arm order within each matched task/model/repeat block. */
export function assignments(p:Protocol):Assignment[]{
  const protocolHash=digest(canonical(p)),rows:Assignment[]=[];
  for(const task of p.tasks)for(const model of p.models)for(let repeat=0;repeat<p.repeats;repeat++){
    const seedLabel=p.seedLabels[repeat]!;
    const block=canonical([protocolHash,task.id,model.id,seedLabel]);
    const order=[...arms].sort((a,b)=>digest(`${block}:${a}`).localeCompare(digest(`${block}:${b}`)));
    for(const arm of order)rows.push({candidateId:digest(canonical([block,arm])).slice(0,40),taskId:task.id,language:task.language,family:task.family,split:task.split,
      modelId:model.id,arm,repeat:repeat+1,seedLabel,position:rows.length});
  }
  return rows;
}
export function graderAssignment(row:Assignment){return {candidateId:row.candidateId,taskId:row.taskId};}
