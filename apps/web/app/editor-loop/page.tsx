import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { EditorLoopView, type EditorLoopRecord } from "@/components/editor-loop-view";
// Bundled at build time: the committed machine-readable summary of the recorded sessions.
import record from "../../../../docs/editor-loop/session.json";

export const dynamic = "force-static";
export const metadata: Metadata = { title: "Recorded editor loop", description: "Two recorded coding-agent sessions that built the Bramble checkout through the Fracture Lab MCP tools, with the real revision, plan and job identities. Sample provider model, isolated runner." };
export default function Page() { return <AppShell><EditorLoopView record={record as unknown as EditorLoopRecord} /></AppShell>; }
