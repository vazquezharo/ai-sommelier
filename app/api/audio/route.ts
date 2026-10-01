import {paid,problem} from "@/lib/access";
import {answers,answerIds,anonymousHint,AnswerId} from "@/lib/guidance";
import {overviewFor} from "@/lib/tasting";
import {speech} from "@/lib/speech";
export const runtime="nodejs";
export async function POST(req:Request){
 try{
 await paid(req,"audio");const body=await req.json();let text:string|null=null;
 if(body.kind==="hint"&&Object.keys(body).length===1)text=anonymousHint;
 else if(body.kind==="answer"&&Object.keys(body).length===2&&answerIds.includes(body.answerId))text=answers[body.answerId as AnswerId];
 else if(body.kind==="overview"&&Object.keys(body).length===2)text=await overviewFor(body.handle);
 if(!text)return Response.json({error:"Audio is not permitted for this request."},{status:403});
 const audio=await speech(text);return new Response(audio.data,{headers:{"Content-Type":"audio/mpeg","Cache-Control":"no-store"}});
 }catch(e){return problem(e);}
}
