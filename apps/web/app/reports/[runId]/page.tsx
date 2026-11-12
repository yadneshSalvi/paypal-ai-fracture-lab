import { ReportScreen } from "./report-screen";
export default async function Page({ params }: { params: Promise<{ runId: string }> }) { const { runId } = await params; return <ReportScreen runId={runId} />; }
