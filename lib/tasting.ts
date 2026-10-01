import "server-only";
import {cookies} from "next/headers";
import {createCipheriv,createDecipheriv,createHash,randomBytes} from "node:crypto";
import {resolveConfiguration} from "./config";
import {wines} from "./wines";
import type {PublicTasting} from "./types";
type Tasting={version:1;sessionId:string;items:{handle:string;wineId:string}[];mode:"end"|"each";started:boolean;finished:boolean;revealed:string[];expires:number};
const key=()=>createHash("sha256").update(resolveConfiguration(process.env).sessionSecret).digest();
export function seal(value:unknown){const iv=randomBytes(12),cipher=createCipheriv("aes-256-gcm",key(),iv);const body=Buffer.concat([cipher.update(JSON.stringify(value),"utf8"),cipher.final()]);return Buffer.concat([iv,cipher.getAuthTag(),body]).toString("base64url");}
export function unseal(value:string):unknown{try{const b=Buffer.from(value,"base64url");if(b.length<29||b.length>6000)return null;const cipher=createDecipheriv("aes-256-gcm",key(),b.subarray(0,12));cipher.setAuthTag(b.subarray(12,28));return JSON.parse(Buffer.concat([cipher.update(b.subarray(28)),cipher.final()]).toString("utf8"));}catch{return null;}}
export async function getTasting():Promise<Tasting|null>{
 const c=(await cookies()).get("sommelier-tasting")?.value;if(!c)return null;
 const t=unseal(c) as Tasting|null;
 if(!t||t.version!==1||t.expires<Date.now()||!Array.isArray(t.items)||t.items.length!==8||new Set(t.items.map(i=>i.handle)).size!==8||t.items.some(i=>!/^[a-f0-9]{32}$/.test(i.handle)||!wines.some(w=>w.id===i.wineId))||!Array.isArray(t.revealed))return null;
 return t;
}
export async function saveTasting(t:Tasting){(await cookies()).set("sommelier-tasting",seal(t),{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"strict",path:"/",maxAge:30*24*3600});}
export async function ensureTasting(){const existing=await getTasting();if(existing)return existing;const t:Tasting={version:1,sessionId:randomBytes(16).toString("hex"),items:wines.map(w=>({handle:randomBytes(16).toString("hex"),wineId:w.id})),mode:"end",started:false,finished:false,revealed:[],expires:Date.now()+30*24*3600*1000};await saveTasting(t);return t;}
export function publicTasting(t:Tasting):PublicTasting{
 const revealed:PublicTasting["revealed"]={};
 for(const i of t.items)if(t.revealed.includes(i.handle)){const w=wines.find(w=>w.id===i.wineId)!;const {id,hint,...facts}=w;void id;void hint;revealed[i.handle]=facts;}
 return {sessionId:t.sessionId,order:t.items.map(i=>i.handle),mode:t.mode,started:t.started,finished:t.finished,revealed};
}
export function applyTasting(t:Tasting,body:Record<string,unknown>){
 if(body.action==="start"){if(!t.started)t.mode=body.mode==="each"?"each":"end";t.started=true;}
 else if(body.action==="reorder"){
  if(t.started||!Array.isArray(body.order)||body.order.length!==8||new Set(body.order).size!==8||body.order.some(h=>!t.items.some(i=>i.handle===h)))throw Error("Invalid tasting change.");
  t.items=body.order.map(h=>t.items.find(i=>i.handle===h)!);
 }else if(body.action==="reveal"){
  if(!t.started||t.mode!=="each"||typeof body.handle!=="string"||!t.items.some(i=>i.handle===body.handle))throw Error("Invalid tasting change.");
  t.revealed=[...new Set([...t.revealed,body.handle])];
 }else if(body.action==="finish"){if(!t.started)throw Error("Invalid tasting change.");t.finished=true;}
 else if(body.action==="reveal-lineup"){if(!t.finished)throw Error("Finish the tasting before the lineup reveal.");t.revealed=t.items.map(i=>i.handle);}
 else throw Error("Invalid tasting change.");
 return t;
}
export async function overviewFor(handle:unknown){const t=await getTasting();if(typeof handle!=="string"||!t||!t.revealed.includes(handle))return null;const i=t.items.find(i=>i.handle===handle);return i?wines.find(w=>w.id===i.wineId)?.overview||null:null;}
export async function hostLineup(){const t=await ensureTasting();return t.items.map(i=>{const w=wines.find(w=>w.id===i.wineId)!;return {handle:i.handle,producer:w.producer,name:w.name,grape:w.grape};});}
