import { paid, problem } from "@/lib/access";
import { anonymousHint, wines } from "@/lib/wines";
import { createHash } from "node:crypto";
const audioCache=new Map<string,Promise<ArrayBuffer>>();
export const runtime="nodejs";
export async function POST(req:Request){
 try {
  await paid(req,"audio");const {kind,id}=await req.json();
  if(kind!=="hint"&&kind!=="overview") return Response.json({error:"Invalid audio type"},{status:400});
  const text=kind==="hint"?anonymousHint:wines.find(w=>w.id===id)?.overview;
  if(!text)return Response.json({error:"Unknown wine"},{status:400});
  const model=process.env.OPENAI_TTS_MODEL||"gpt-4o-mini-tts",voice=process.env.OPENAI_TTS_VOICE||"marin";
  const hash=createHash("sha256").update(model+voice+text).digest("hex");
  let work=audioCache.get(hash);
  if(!work){
   work=(async()=>{
    const r=await fetch("https://api.openai.com/v1/audio/speech",{method:"POST",headers:{"Authorization":"Bearer "+process.env.OPENAI_API_KEY,"Content-Type":"application/json"},body:JSON.stringify({model,voice,input:text,instructions:"Warm approachable sommelier. Speak clearly at an unhurried pace, about 125 words per minute. Read the provided script exactly.",response_format:"mp3"}),signal:AbortSignal.timeout(50000)});
    if(!r.ok)throw new Error("Spoken audio is unavailable ("+r.status+"). Please read the script below.");
    return r.arrayBuffer();
   })();
   audioCache.set(hash,work);
   work.catch(()=>audioCache.delete(hash));
  }
  const data=await work;return new Response(data,{headers:{"Content-Type":"audio/mpeg","Cache-Control":"private, max-age=31536000, immutable","X-Script-Hash":hash}});
 }catch(e){return problem(e);}
}
