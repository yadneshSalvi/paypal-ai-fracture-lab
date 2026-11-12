import type { Metadata } from "next";
import { ScenarioStudioPage } from "@/components/scenario-studio";

export const metadata: Metadata = { title: "Scenario studio", description: "Run a payment fault against the faulty and hardened bookshop on the local provider model, or open the recorded live sandbox comparison." };
export default function Page() { return <ScenarioStudioPage />; }
