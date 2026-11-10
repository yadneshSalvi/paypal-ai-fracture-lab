import { FractureConsole } from "@/components/fracture-console";
export default async function Page({ params }: { params: Promise<{ projectId: string }> }) { const { projectId } = await params; return <FractureConsole screen="run" projectId={projectId} />; }
