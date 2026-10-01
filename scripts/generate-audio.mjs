// Generate private, reusable speech assets. Never place identifying audio in public/.
import {readFile,mkdir,writeFile,access} from "node:fs/promises";
import {createHash} from "node:crypto";
const key=process.env.OPENAI_API_KEY?.trim()||process.env.Open_AI_Key?.trim();
if(!key)throw Error("Set a server API key in your shell; never commit it.");
const wines=JSON.parse(await readFile(new URL("../data/wines.json",import.meta.url),"utf8"));
const text=wines[0].hint;const scripts=[text,...wines.map(w=>w.overview)];
const model=process.env.OPENAI_TTS_MODEL||"gpt-4o-mini-tts",voice=process.env.OPENAI_TTS_VOICE||"marin";
await mkdir(new URL("../private-audio/",import.meta.url),{recursive:true});
for(const input of scripts){
 const hash=createHash("sha256").update(model+"\0"+voice+"\0"+input).digest("hex");const file=new URL("../private-audio/"+hash+".mp3",import.meta.url);
 try{await access(file);continue;}catch{}
 const r=await fetch("https://api.openai.com/v1/audio/speech",{method:"POST",headers:{Authorization:"Bearer "+key,"Content-Type":"application/json"},body:JSON.stringify({model,voice,input,instructions:"Read the supplied script exactly. Warm, clear and conversational, around 125 words per minute. Add no words or examples.",response_format:"mp3"})});
 if(!r.ok)throw Error("Speech generation failed ("+r.status+").");await writeFile(file,Buffer.from(await r.arrayBuffer()));
}
console.log("Private reusable assets generated. Listen to them before deploying.");
