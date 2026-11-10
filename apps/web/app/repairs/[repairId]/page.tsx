import { FractureConsole } from "@/components/fracture-console";
export default async function Page({ params }: { params: Promise<{ repairId: string }> }) { const { repairId } = await params; return <FractureConsole screen="repairs" repairId={repairId} />; }
