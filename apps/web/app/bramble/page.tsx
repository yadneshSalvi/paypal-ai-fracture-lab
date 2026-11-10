import { BramblePageClient } from "@/components/fracture-console";
export default async function Page({ searchParams }: { searchParams: Promise<{ runId?: string; sequence?: string }> }) { const { runId, sequence } = await searchParams; return <BramblePageClient {...(runId ? { runId } : {})} {...(sequence && Number.isFinite(Number(sequence)) ? { sequence: Number(sequence) } : {})} />; }
