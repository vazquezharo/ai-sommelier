import "server-only";
import {cookies} from "next/headers";
import {createHash,createCipheriv,createDecipheriv,createHmac,randomBytes,timingSafeEqual} from "node:crypto";
import {resolveConfiguration} from "./config";
import type {BottleState} from "./bottle-types";
const cookieName="sommelier-bottle";
const secret=()=>resolveConfiguration(process.env).sessionSecret;
const key=()=>createHash("sha256").update("bottle-v1:"+secret()).digest();
export function sealBottle(value:BottleState){const iv=randomBytes(12),cipher=createCipheriv("aes-256-gcm",key(),iv),data=Buffer.concat([cipher.update(JSON.stringify(value)),cipher.final()]);return Buffer.concat([iv,cipher.getAuthTag(),data]).toString("base64url");}
export function unsealBottle(value:string):BottleState|null{
 try{const b=Buffer.from(value,"base64url"),cipher=createDecipheriv("aes-256-gcm",key(),b.subarray(0,12));cipher.setAuthTag(b.subarray(12,28));const v=JSON.parse(Buffer.concat([cipher.update(b.subarray(28)),cipher.final()]).toString());return /^[a-f0-9]{32}$/.test(v.id)&&v.expires>Date.now()&&v.label&&typeof v.revealed==="boolean"?v:null;}catch{return null;}
}
export async function getBottle(){const value=(await cookies()).get(cookieName)?.value;return value?unsealBottle(value):null;}
export async function setBottle(value:BottleState){const token=sealBottle(value);if(token.length>3800)throw Error("Bottle notes are too long. Try preparing the overview again.");(await cookies()).set(cookieName,token,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"strict",path:"/api/bottle",maxAge:7*24*60*60});}
export async function clearBottle(){(await cookies()).set(cookieName,"",{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"strict",path:"/api/bottle",maxAge:0});}
export function answerTicket(text:string,host:string,bottle:string){const value=Buffer.from(JSON.stringify({text,host,bottle,expires:Date.now()+30*60*1000})).toString("base64url");return value+"."+createHmac("sha256",secret()).update("bottle-answer:"+value).digest("hex");}
export function ticketText(ticket:unknown,host:string,bottle:string):string|null{
 if(typeof ticket!=="string"||ticket.length>3000)return null;
 const [value,sig,...extra]=ticket.split(".");if(extra.length||!/^[a-f0-9]{64}$/.test(sig||""))return null;
 const expected=createHmac("sha256",secret()).update("bottle-answer:"+value).digest("hex");if(!timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))return null;
 try{const v=JSON.parse(Buffer.from(value,"base64url").toString());return v.host===host&&v.bottle===bottle&&v.expires>Date.now()&&typeof v.text==="string"&&v.text.length<=1000?v.text:null;}catch{return null;}
}
