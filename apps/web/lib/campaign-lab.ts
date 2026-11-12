import { getService } from "@fracture/service";
import { CampaignLab } from "../../../packages/campaigns/src/runtime";

export async function getCampaignLab() { return new CampaignLab((await getService()).store); }
