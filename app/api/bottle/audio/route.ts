import {paid,problem} from "@/lib/access";
import {getBottle,ticketText} from "@/lib/bottle";
import {speech} from "@/lib/speech";
export const runtime="nodejs";
export async function POST(req:Request){
 try{
  const host=await paid(req,"audio"),bottle=await getBottle(),body=await req.json();
  let text:string|null=null;
  if(bottle?.revealed&&body.id===bottle.id){
   if(body.kind==="overview"&&Object.keys(body).length===2)text=bottle.overview;
   else if(body.kind==="answer"&&Object.keys(body).length===3)text=ticketText(body.ticket,host,bottle.id);
  }
  if(!text)return Response.json({error:"Audio requires this revealed bottle and an approved answer."},{status:403});
  const audio=await speech(text);return new Response(audio.data,{headers:{"Content-Type":"audio/mpeg","Cache-Control":"no-store"}});
 }catch(e){return problem(e);}
}
