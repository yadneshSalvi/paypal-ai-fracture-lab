import type { Metadata } from "next";
import { SourceExecutions } from "@/components/source-executions";

export const metadata: Metadata = {
  title: "Source execution receipts",
  description: "Inspect separately approved private execution receipts for an exact imported checkout and unchanged Sample checks.",
};

export default function Page() { return <SourceExecutions />; }
