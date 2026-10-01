import { paid, problem } from "@/lib/access";
import { buildContext } from "@/lib/context";
export const runtime="nodejs";
export async function POST(req:Request){
 try {
  await paid(req,"voice");
  const body=await req.json();
  if(body.mode!=="blind" && body.mode!=="revealed") return Response.json({error:"Invalid mode"},{status:400});
  if(body.mode==="blind" && Object.keys(body).some(k=>k!=="mode")) return Response.json({error:"Blind requests must contain only mode."},{status:400});
  const instructions=buildContext(body.mode,body.mode==="revealed"?body.id:undefined);
  const model=process.env.OPENAI_REALTIME_MODEL||"gpt-realtime-2.1";
  const response=await fetch("https://api.openai.com/v1/realtime/client_secrets",{
   method:"POST",headers:{"Authorization":"Bearer "+process.env.OPENAI_API_KEY,"Content-Type":"application/json"},
   body:JSON.stringify({expires_after:{anchor:"created_at",seconds:60},session:{type:"realtime",model,instructions,output_modalities:["audio"],max_output_tokens:900,audio:{input:{turn_detection:null,transcription:{model:"gpt-4o-mini-transcribe"}},output:{voice:process.env.OPENAI_TTS_VOICE||"marin"}}}}),
   signal:AbortSignal.timeout(20000)
  });
  if(!response.ok) throw new Error("OpenAI voice is unavailable ("+response.status+"). Written notes remain available.");
  const data=await response.json();if(!data.value) throw new Error("Voice credential missing.");
  return Response.json({value:data.value,model},{headers:{"Cache-Control":"no-store"}});
 } catch(e){return problem(e);}
}
