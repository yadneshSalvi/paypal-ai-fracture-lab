import type { Metadata } from "next";
import { CampaignLab } from "@/components/campaign-lab";

export const metadata: Metadata = {
  title: "Campaign Observatory",
  description: "Compare exact paired payment fault cases, inspect retained evidence, and execute a bounded recipe minimization.",
};

export default function Page() { return <CampaignLab />; }
