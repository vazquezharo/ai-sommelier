// Generate private assets through the same pre-playback transcript gate as the app.
import {mkdir,writeFile,access} from "node:fs/promises";
import {speech,speechHash} from "../lib/speech.ts";
import {wines} from "../lib/wines.ts";
import {answers,anonymousHint} from "../lib/guidance.ts";
if(!process.env.OPENAI_API_KEY?.trim()&&!process.env.Open_AI_Key?.trim())throw Error("Set a server API key privately; never commit it.");
await mkdir(new URL("../private-audio/",import.meta.url),{recursive:true});
for(const text of [anonymousHint,...Object.values(answers),...wines.map(w=>w.overview)]){
 const file=new URL("../private-audio/"+speechHash(text)+".mp3",import.meta.url);
 try{await access(file);continue;}catch{}
 const clip=await speech(text);await writeFile(file,Buffer.from(clip.data));
}
console.log("Private verified reusable assets generated. Listen before any future deployment.");
