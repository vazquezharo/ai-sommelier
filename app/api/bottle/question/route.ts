import {paid,problem} from "@/lib/access";
import {getBottle,answerTicket,ticketText} from "@/lib/bottle";
import {bottleAnswer} from "@/lib/bottle-ai";
import {readQuestion} from "@/lib/question-input";
export const runtime="nodejs";
export async function POST(req:Request){
 try{
  const host=await paid(req,"voice"),bottle=await getBottle();
  if(!bottle?.revealed)return Response.json({error:"Reveal this bottle using the host control before bottle-specific Q&A."},{status:403});
  let input;try{input=await readQuestion(req);}catch(e){if(e instanceof Error&&e.message==="Invalid question")return Response.json({error:"Send one short question or a supported recording."},{status:400});throw e;}
  if(input.id!==bottle.id)return Response.json({error:"This bottle session changed. Reload the photo screen."},{status:409});
  const previous=input.previousTicket?ticketText(input.previousTicket,host,bottle.id):null;
  if(input.previousTicket&&!previous)return Response.json({error:"Previous answer belongs to another session. Reconnect."},{status:409});
  const {text,sources,notice}=await bottleAnswer(bottle,input.question,previous);
  return Response.json({id:bottle.id,question:input.question,text,sources,notice,ticket:answerTicket(text,host,bottle.id),audioAvailable:true},{headers:{"Cache-Control":"no-store"}});
 }catch(e){return problem(e);}
}
