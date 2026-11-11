import {readCandidateEvidence} from '../../../../../../../packages/service/src/evaluation-publication';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;if(!/^[a-f0-9]{40}$/.test(id))return Response.json({error:{message:'Invalid candidate identifier.'}},{status:400});
  try{return Response.json({data:await readCandidateEvidence(id)},{headers:{'Cache-Control':'public, max-age=60'}});}
  catch{return Response.json({error:{message:'This candidate’s sealed evidence is not available. Try again after the study is published.'}},{status:404,headers:{'Cache-Control':'no-store'}});}
}
