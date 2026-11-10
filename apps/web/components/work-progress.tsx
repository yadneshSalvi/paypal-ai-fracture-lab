"use client";
import { useEffect,useState } from "react";
import { Clock3,LoaderCircle } from "lucide-react";
import { useWorkspace } from "./workspace-provider";
export function WorkProgress({runId}:{runId:string}){
  const {workspace,act}=useWorkspace();const [now,setNow]=useState(Date.now());const work=workspace?.work?.find(item=>item.runId===runId&&item.status==="running"&&["diagnose","repair","verify"].includes(item.kind));
  useEffect(()=>{if(!work)return;const interval=window.setInterval(()=>setNow(Date.now()),1000);return()=>window.clearInterval(interval);},[work?.id]);
  if(!work)return null;const elapsed=Math.max(0,Math.floor((now-Date.parse(work.startedAt))/1000));
  return <div className="work-progress" role="status" aria-live="polite"><LoaderCircle className="spin" size={17}/><div><strong>{work.phase}</strong><span><Clock3 size={11}/>{elapsed}s elapsed · results are saved as they arrive</span></div><button className="button secondary" onClick={()=>void act(runId,"cancel_work")}>Cancel investigation</button></div>;
}
