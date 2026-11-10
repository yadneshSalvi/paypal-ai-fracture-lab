import { FractureConsole } from "@/components/fracture-console";
export default async function Page({ searchParams }: { searchParams: Promise<{ run?: string }> }) { const { run } = await searchParams; return <FractureConsole screen="repairs" {...(run ? { runId: run } : {})} />; }
