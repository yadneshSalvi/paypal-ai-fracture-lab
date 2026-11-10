import { FractureConsole } from "@/components/fracture-console";
export default async function Page({ params }: { params: Promise<{ runId: string }> }) { const { runId } = await params; return <FractureConsole screen="report" runId={runId} />; }
