import {LiveBramblePage} from '@/components/live-bramble';
export default async function Page({searchParams}:{searchParams:Promise<{runId?:string}>}){const {runId}=await searchParams;return <LiveBramblePage {...(runId?{runId}:{})}/>;}
