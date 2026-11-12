import {LiveBramblePage} from '@/components/live-bramble';
import {judgeRecorded} from '@/components/judge-recorded';
import {loadPublishedObservation} from '@/lib/published-observation';
export default async function Page({searchParams}:{searchParams:Promise<{runId?:string}>}){const [{runId},observation]=await Promise.all([searchParams,loadPublishedObservation()]);return <LiveBramblePage recorded={judgeRecorded(observation)} {...(runId?{runId}:{})}/>;}
