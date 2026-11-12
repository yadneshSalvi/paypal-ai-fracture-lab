import { getCampaignLab } from "../lib/campaign-lab";

export async function advanceCampaign(id: string) {
  "use step";
  return (await getCampaignLab()).advance(id);
}
