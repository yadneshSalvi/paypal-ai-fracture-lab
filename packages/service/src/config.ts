import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { config } from "dotenv";

export function workspaceRoot():string {
  if(process.env.FRACTURE_WORKSPACE_ROOT)return process.env.FRACTURE_WORKSPACE_ROOT;
  let directory=process.cwd();
  for(let depth=0;depth<6;depth++){
    if(existsSync(join(directory,"paypal-plan.md")))return directory;
    directory=dirname(directory);
  }
  return process.cwd();
}
config({path:join(workspaceRoot(),".env"),quiet:true});
export function requiredConfig(name:string){const value=process.env[name];if(!value)throw new Error(`Server configuration is missing ${name}.`);return value;}
export const sessionSecret=()=>requiredConfig("JUDGE_SESSION_SECRET");
export const artifactPath=(path:string)=>join(/* turbopackIgnore: true */ workspaceRoot(),path);
