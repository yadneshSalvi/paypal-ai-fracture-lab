import {readTaskEvidence} from '../../../../../../../packages/service/src/evaluation-publication';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;if(!/^d[1-5]-(ts|py)-(development|heldout)$/.test(id))return Response.json({error:{message:'Unknown corpus task.'}},{status:404});
  try{return Response.json({data:await readTaskEvidence(id)},{headers:{'Cache-Control':'no-store'}});}
  catch{return Response.json({error:{message:'The frozen task source could not be verified.'}},{status:503});}
}
