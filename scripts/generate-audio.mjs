// Generate durable reusable audio once BEFORE deployment, never during a build.
// Node 20+. Run: OPENAI_API_KEY=... npm run audio:generate
import {readFile,mkdir,writeFile,access} from "node:fs/promises";
const wines=JSON.parse(await readFile(new URL("../data/wines.json",import.meta.url),"utf8"));
if(!process.env.OPENAI_API_KEY)throw Error("Set OPENAI_API_KEY in your environment, never commit it.");
await mkdir(new URL("../public/audio/",import.meta.url),{recursive:true});
const items=[{name:"hint-v1",input:wines[0].hint},...wines.map(w=>({name:w.id+"-overview-v1",input:w.overview}))];
for(const item of items){
 const file=new URL("../public/audio/"+item.name+".mp3",import.meta.url);
 try{await access(file);console.log("Already cached:",item.name);continue;}catch{}
 const r=await fetch("https://api.openai.com/v1/audio/speech",{method:"POST",headers:{Authorization:"Bearer "+process.env.OPENAI_API_KEY,"Content-Type":"application/json"},body:JSON.stringify({model:process.env.OPENAI_TTS_MODEL||"gpt-4o-mini-tts",voice:process.env.OPENAI_TTS_VOICE||"marin",input:item.input,instructions:"Warm approachable sommelier. Speak clearly, about 125 words per minute. Read the script exactly.",response_format:"mp3"})});
 if(!r.ok)throw Error("TTS failed: "+r.status);
 await writeFile(file,Buffer.from(await r.arrayBuffer()));console.log("Generated:",item.name);
}
