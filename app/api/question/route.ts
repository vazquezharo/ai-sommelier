import {paid,problem} from "@/lib/access";
import {answerIds,knownTopic,reviewedAnswer,validateChoice} from "@/lib/guidance";
import {routerInstructions} from "@/lib/context";
import {providerURL,providerHeaders} from "@/lib/provider";
export const runtime="nodejs";
export async function POST(req:Request){
 try{
 await paid(req,"voice");let question="";
 if(req.headers.get("content-type")?.startsWith("application/json")){
  const body=await req.json();if(Object.keys(body).length!==1||typeof body.question!=="string")return bad();
  question=body.question;
 }else{
  const form=await req.formData();if([...form.keys()].some(k=>k!=="audio")||form.getAll("audio").length!==1)return bad();
  const file=form.get("audio");if(!(file instanceof File)||file.size===0||file.size>2*1024*1024||!["audio/webm","audio/mp4","audio/wav","audio/ogg"].some(t=>file.type.startsWith(t)))return bad();
  const upload=new FormData();const ext=file.type.startsWith("audio/mp4")?"mp4":file.type.startsWith("audio/wav")?"wav":file.type.startsWith("audio/ogg")?"ogg":"webm";
  upload.append("file",new File([file],"question."+ext,{type:file.type}));upload.append("model",process.env.OPENAI_TRANSCRIBE_MODEL||"gpt-4o-mini-transcribe");upload.append("response_format","json");
  const r=await fetch(providerURL("/audio/transcriptions"),{method:"POST",headers:providerHeaders(),body:upload,signal:AbortSignal.timeout(25000)});
  if(!r.ok)throw Error("Could not transcribe the question. Try again or type it.");
  const data=await r.json();question=typeof data.text==="string"?data.text:"";
 }
 question=question.trim();if(!question||question.length>1200)return bad();
 let id=knownTopic(question);
 if(!id){
  try{
   const r=await fetch(providerURL("/responses"),{method:"POST",headers:{...providerHeaders(),"Content-Type":"application/json"},body:JSON.stringify({model:process.env.OPENAI_ROUTER_MODEL||"gpt-4.1-mini",store:false,max_output_tokens:100,instructions:routerInstructions,input:question,text:{format:{type:"json_schema",name:"reviewed_topic",strict:true,schema:{type:"object",properties:{id:{type:"string",enum:answerIds}},required:["id"],additionalProperties:false}}}}),signal:AbortSignal.timeout(20000)});
   if(!r.ok)throw Error("Router unavailable");
   const data=await r.json();const raw=(data.output||[]).flatMap((o:{content?:{type:string;text?:string}[]})=>o.content||[]).filter((c:{type:string})=>c.type==="output_text").map((c:{text?:string})=>c.text||"").join("");
   id=validateChoice(JSON.parse(raw));
  }catch{return Response.json({question,answerId:"neutral",text:reviewedAnswer(question,{id:"neutral"}).text,audioAvailable:false,notice:"AI routing is unavailable. This reviewed fallback is not a live generated answer."},{headers:{"Cache-Control":"no-store"}});}
 }
 const answer=reviewedAnswer(question,{id});return Response.json({question,answerId:answer.id,text:answer.text,audioAvailable:true},{headers:{"Cache-Control":"no-store"}});
 }catch(e){return problem(e);}
}
function bad(){return Response.json({error:"Send one short question or a supported audio recording."},{status:400});}
