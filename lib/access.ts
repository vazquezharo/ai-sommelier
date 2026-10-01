import "server-only";
import {resolveConfiguration} from "./config";
import { cookies } from "next/headers";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
const buckets = new Map<string,{count:number;until:number}>();
export function missingConfiguration(){return resolveConfiguration(process.env).missing;}
export function openAIKey(){return resolveConfiguration(process.env).apiKey;}
export function configured(){return missingConfiguration().length===0;}
export function sameOrigin(req:Request) { const origin=req.headers.get("origin"); const url=new URL(req.url); const protocol=req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || url.protocol.slice(0,-1); const host=req.headers.get("host") || url.host; if (!origin || origin!==protocol+"://"+host) throw new Error("Origin rejected"); }
export function limit(key:string,max:number,windowMs:number){
 const now=Date.now();
 for(const [k,v] of buckets) if(v.until<now) buckets.delete(k);
 if(buckets.size>2000 && !buckets.has(key)) throw new Error("Service busy");
 const b=buckets.get(key) || {count:0,until:now+windowMs};
 if(++b.count>max) throw new Error("Request limit reached. Try again later.");
 buckets.set(key,b);
}
const sign=(s:string)=>createHmac("sha256",process.env.HOST_SESSION_SECRET || "").update(s).digest("hex");
export function validCode(code:string){
 const expected=resolveConfiguration(process.env).hostAccessCode;
 const a=Buffer.from(code),b=Buffer.from(expected);
 return Boolean(expected && a.length===b.length && timingSafeEqual(a,b));
}
export async function createHostSession(){
 const value=randomBytes(16).toString("hex")+"."+String(Date.now()+6*60*60*1000);
 (await cookies()).set("sommelier-host",value+"."+sign(value),{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"strict",path:"/",maxAge:6*60*60});
}
export async function hostId(){
 const c=(await cookies()).get("sommelier-host")?.value;
 if(!c || !process.env.HOST_SESSION_SECRET) return null;
 const parts=c.split(".");if(parts.length!==3)return null;
 const [id,expiry,sig]=parts;
 if(!/^[a-f0-9]{32}$/.test(id)||!/^\d{13}$/.test(expiry)||Number(expiry)<Date.now()||!/^[a-f0-9]{64}$/.test(sig))return null;
 const expected=sign(id+"."+expiry);
 if(!timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))return null;
 return id;
}
export async function paid(req:Request,kind:"voice"|"audio"){
 sameOrigin(req);
 if(!configured()) throw new Error("Demo mode: live AI is not configured.");
 const id=await hostId();if(!id) throw new Error("Unlock host access first.");
 limit(kind+":"+id,kind==="voice"?24:40,6*60*60*1000);
 limit("burst:"+id,8,60*1000);
 return id;
}
export function problem(error:unknown){
 const message=error instanceof Error ? error.message : "Service unavailable";
 const status=/Origin/.test(message)?403:/Unlock/.test(message)?401:/limit|busy/.test(message)?429:/Demo/.test(message)?503:502;
 return Response.json({error:message},{status,headers:{"Cache-Control":"no-store"}});
}
