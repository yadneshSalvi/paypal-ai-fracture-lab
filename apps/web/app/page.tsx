import { FractureConsole } from "@/components/fracture-console";
import { judgeRecorded } from "@/components/judge-recorded";
import { loadPublishedObservation } from "@/lib/published-observation";
export default async function Page({ searchParams }: { searchParams: Promise<{ step?: string }> }) {
  const [{ step }, observation] = await Promise.all([searchParams, loadPublishedObservation()]);
  const tourStep = Number(step);
  return <FractureConsole screen="judge" recorded={judgeRecorded(observation)} {...(Number.isInteger(tourStep) && tourStep > 0 ? { tourStep } : {})} />;
}
