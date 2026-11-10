import type { QueryResult,SqlConnection,SqlDatabase } from "@fracture/paypal-core";
import type { RunDTO } from "@fracture/contracts";
import type { BrambleContext } from "../../../apps/fixtures/bramble/contract";
import type { EventInput,TargetState } from "../../service/src/types";
import { LabStore } from "../../service/src/store";
import { LocalPayPalTransport } from "../../runner/src/local-provider";
const mutableTables=new Set(["lab_target_state","lab_fulfillments","paycore_operations","paycore_resource_locks","paycore_attempts"]);
const readableTables=new Set([...mutableTables,"lab_faults"]);
export function assertTargetSql(sql:string){
  if(sql.length>12000||/[;]|--|\/\*|\b(?:DROP|ALTER|CREATE|ATTACH|DETACH|PRAGMA|VACUUM|load_extension|readfile|writefile)\b/i.test(sql))throw new Error("CANDIDATE_SQL_DENIED");
  const operation=sql.trim().split(/\s+/)[0]?.toUpperCase();if(!operation||!["SELECT","INSERT","UPDATE","DELETE"].includes(operation))throw new Error("CANDIDATE_SQL_DENIED");
  const tables=[...sql.matchAll(/\b(?:FROM|INTO|JOIN)\s+([a-z_][a-z0-9_]*)/gi)].map(match=>match[1]!.toLowerCase());if(operation==="UPDATE")tables.push(sql.trim().match(/^UPDATE\s+([a-z_][a-z0-9_]*)/i)?.[1]?.toLowerCase()??"");if(!tables.length||tables.some(table=>!(operation==="SELECT"?readableTables:mutableTables).has(table)))throw new Error("CANDIDATE_SQL_DENIED");
}
export function targetCapabilities(original:LabStore,run:RunDTO,sessionId:string,provider:LocalPayPalTransport):BrambleContext {
  const checkRun=(id:string)=>{if(id!==run.id)throw new Error("CANDIDATE_SCOPE_DENIED");};const checkIntent=(id:string)=>{if(id!==run.businessIntentId)throw new Error("CANDIDATE_INTENT_DENIED");};
  const connection=(inner:SqlConnection):SqlConnection=>Object.freeze({dialect:inner.dialect,query:async<T extends Record<string,unknown>>(sql:string,params:unknown[]=[]):Promise<QueryResult<T>>=>{assertTargetSql(sql);return inner.query<T>(sql,params);}});
  const db:SqlDatabase=Object.freeze({...connection(original.db),transaction:async<T>(work:(tx:SqlConnection)=>Promise<T>)=>original.db.transaction(tx=>work(connection(tx))),close:async()=>{throw new Error("CANDIDATE_DATABASE_CLOSE_DENIED");}});
  const store=Object.freeze({db,
    targetState:async(id:string,intent:string)=>{checkRun(id);checkIntent(intent);return structuredClone(await original.targetState(id,intent));},
    setTargetState:async(id:string,state:TargetState)=>{checkRun(id);checkIntent(state.intentId);await original.setTargetState(id,structuredClone(state));},
    resources:async(id:string)=>{checkRun(id);return structuredClone(await original.resources(id));},
    record:async(id:string,tenant?:string)=>{checkRun(id);if(tenant&&tenant!==sessionId)throw new Error("CANDIDATE_SCOPE_DENIED");return structuredClone(await original.record(id,sessionId));},
    run:async(id:string)=>{checkRun(id);return structuredClone(await original.run(id,sessionId));},
    emit:async(id:string,event:EventInput)=>{checkRun(id);if(event.lane!=="application"&&event.lane!=="customer")throw new Error("CANDIDATE_OBSERVATION_FORGERY_DENIED");const {projection:_projection,...safe}=event;return original.emit(id,safe);}
  });
  const transport=Object.freeze({fetch:provider.fetch,approve:provider.approve.bind(provider)});
  return Object.freeze({run:Object.freeze(structuredClone(run)),sessionId,store:store as unknown as LabStore,transport:transport as unknown as LocalPayPalTransport});
}
