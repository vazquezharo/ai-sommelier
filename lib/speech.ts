import "server-only";
import {createHash} from "node:crypto";
import {readFile} from "node:fs/promises";
import {providerURL,providerHeaders} from "./provider";
import {matchesApprovedSpeech} from "./speech-policy";
const cache=new Map<string,Promise<ArrayBuffer>>();
export function speechHash(text:string){
 return createHash("sha256").update((process.env.OPENAI_TTS_MODEL||"gpt-4o-mini-tts")+"\0"+(process.env.OPENAI_TTS_VOICE||"marin")+"\0"+text).digest("hex");
}
async function verifyAudio(data:ArrayBuffer,text:string){
 if(data.byteLength===0||data.byteLength>10*1024*1024)throw Error("Audio provider returned invalid audio.");
 const form=new FormData();form.append("file",new File([data],"clip.mp3",{type:"audio/mpeg"}));
 form.append("model",process.env.OPENAI_TRANSCRIBE_MODEL||"gpt-4o-mini-transcribe");form.append("response_format","json");
 const r=await fetch(providerURL("/audio/transcriptions"),{method:"POST",headers:providerHeaders(),body:form,signal:AbortSignal.timeout(20000)});
 if(!r.ok)throw Error("Audio verification unavailable. Read the reviewed text instead.");
 const result=await r.json();
 if(!matchesApprovedSpeech(text,result.text))throw Error("Audio verification failed. Read the reviewed text instead.");
 return data;
}
export async function speech(text:string){
 const model=process.env.OPENAI_TTS_MODEL||"gpt-4o-mini-tts",voice=process.env.OPENAI_TTS_VOICE||"marin",hash=speechHash(text);
 const cacheKey="verified-v1:"+hash+":"+(process.env.OPENAI_TRANSCRIBE_MODEL||"gpt-4o-mini-transcribe");
 let work=cache.get(cacheKey);
 if(!work){
 work=(async()=>{
  let data:ArrayBuffer|undefined;
  try{const file=await readFile(process.cwd()+"/private-audio/"+hash+".mp3");data=file.buffer.slice(file.byteOffset,file.byteOffset+file.byteLength) as ArrayBuffer;}catch{}
  if(!data){
   const r=await fetch(providerURL("/audio/speech"),{method:"POST",headers:{...providerHeaders(),"Content-Type":"application/json"},body:JSON.stringify({model,voice,input:text,instructions:"Read the supplied script exactly. Warm, clear and conversational, around 125 words per minute. Add no words or examples.",response_format:"mp3"}),signal:AbortSignal.timeout(35000)});
   if(!r.ok)throw Error("Audio provider unavailable. The reviewed text is still available.");
   data=await r.arrayBuffer();
  }
  // Complete, transcribe, and validate the entire clip before returning ANY audio bytes.
  return verifyAudio(data,text);
 })();cache.set(cacheKey,work);work.catch(()=>cache.delete(cacheKey));
 while(cache.size>80)cache.delete(cache.keys().next().value!);
 }
 return {data:await work,hash};
}
