import "server-only";
import {createHash} from "node:crypto";
import {readFile} from "node:fs/promises";
import {providerURL,providerHeaders} from "./provider";
const cache=new Map<string,Promise<ArrayBuffer>>();
export async function speech(text:string){
 const model=process.env.OPENAI_TTS_MODEL||"gpt-4o-mini-tts",voice=process.env.OPENAI_TTS_VOICE||"marin";
 const hash=createHash("sha256").update(model+"\0"+voice+"\0"+text).digest("hex");
 let work=cache.get(hash);
 if(!work){
 work=(async()=>{
  try{const data=await readFile(process.cwd()+"/private-audio/"+hash+".mp3");return data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength) as ArrayBuffer;}catch{}
  const r=await fetch(providerURL("/audio/speech"),{method:"POST",headers:{...providerHeaders(),"Content-Type":"application/json"},body:JSON.stringify({model,voice,input:text,instructions:"Read the supplied script exactly. Warm, clear and conversational, around 125 words per minute. Add no words or examples.",response_format:"mp3"}),signal:AbortSignal.timeout(50000)});
  if(!r.ok)throw Error("Audio provider unavailable. The reviewed text is still available.");
  const data=await r.arrayBuffer();if(data.byteLength===0||data.byteLength>10*1024*1024)throw Error("Audio provider returned invalid audio.");return data;
 })();cache.set(hash,work);work.catch(()=>cache.delete(hash));
 while(cache.size>80)cache.delete(cache.keys().next().value!);
 }
 return {data:await work,hash};
}
