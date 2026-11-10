import { runSuite } from "./suite";
let input="";for await(const chunk of process.stdin){input+=String(chunk);if(input.length>120000)throw new Error("Candidate input exceeds the runner limit.");}
const parsed=JSON.parse(input) as {source:unknown};if(typeof parsed.source!=="string")throw new Error("Candidate source required.");
const result=await runSuite(parsed.source);process.stdout.write(JSON.stringify(result)+"\n");
