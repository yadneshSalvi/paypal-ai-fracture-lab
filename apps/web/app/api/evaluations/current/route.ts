import {readStudyPublication} from '../../../../../../packages/service/src/evaluation-publication';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(){
  try{return Response.json({data:await readStudyPublication()},{headers:{'Cache-Control':'no-store'}});}
  catch{return Response.json({error:{code:'STUDY_UNAVAILABLE',message:'The study artifacts could not be verified. No comparative result is shown.'}},{status:503,headers:{'Cache-Control':'no-store'}});}
}
