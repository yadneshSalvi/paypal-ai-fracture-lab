import type { Metadata } from 'next';
import { AppShell } from '@/components/app-shell';
import { RecordedObservations } from '@/components/recorded-observations';
import { loadPublishedObservation } from '@/lib/published-observation';
export const dynamic = 'force-static';
export const metadata: Metadata = { title: 'Recorded observations', description: 'Step through the original 11 November PayPal Sandbox comparison, with dated captures, a separate refund and the limits of what each participant knew.' };
export default async function Page() { return <AppShell><RecordedObservations result={await loadPublishedObservation()} /></AppShell>; }
