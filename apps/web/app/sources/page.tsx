import type { Metadata } from "next";
import { SourceAtlas } from "@/components/source-workspaces";

export const metadata: Metadata = {
  title: "Source Atlas",
  description: "Follow a commerce integration through an authorized source snapshot, exact file citations and clearly bounded static findings.",
};

export default function Page() { return <SourceAtlas />; }
