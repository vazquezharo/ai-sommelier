import {randomBytes} from "node:crypto";
import {requireHost,paid,problem} from "@/lib/access";
import {getBottle,setBottle,clearBottle} from "@/lib/bottle";
import {identifyBottle,prepareBottle} from "@/lib/bottle-ai";
import {cleanLabel} from "@/lib/bottle-policy";
export const runtime="nodejs";
const headers={"Cache-Control":"no-store"};
const bad=(message:string)=>Response.json({error:message},{status:400,headers});
export async function GET(req:Request){try{await requireHost(req,false);return Response.json({bottle:await getBottle()}, {headers});}catch(e){return problem(e);}}
export async function POST(req:Request){
 try{
  await requireHost(req);
  if(Number(req.headers.get("content-length")||0)>2300000)return bad("Photo too large. Choose a smaller image.");
  if(req.headers.get("content-type")?.startsWith("multipart/form-data")){
   await paid(req,"photo");const form=await req.formData();if([...form.keys()].some(k=>k!=="image")||form.getAll("image").length!==1)return bad("Choose one bottle photo.");
   const file=form.get("image");if(!(file instanceof File)||file.size===0||file.size>2*1024*1024||!["image/jpeg","image/png","image/webp"].includes(file.type))return bad("Use a JPEG, PNG or WebP photo under 2 MB.");
   const bytes=new Uint8Array(await file.arrayBuffer());const valid=file.type==="image/jpeg"?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:file.type==="image/png"?[137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v):Buffer.from(bytes.subarray(0,4)).toString()==="RIFF"&&Buffer.from(bytes.subarray(8,12)).toString()==="WEBP";
   if(!valid)return bad("That file is not a supported image. Choose a bottle photo.");
   const draft=await identifyBottle(file);const bottle={id:randomBytes(16).toString("hex"),...draft,revealed:false,overview:null,facts:[],sources:[],researchNote:"",expires:Date.now()+7*86400000};await setBottle(bottle);return Response.json({bottle},{headers});
  }
  const body=await req.json();
  if(body.action==="clear"&&Object.keys(body).length===1){await clearBottle();return Response.json({bottle:null},{headers});}
  if(body.action!=="reveal"||Object.keys(body).length!==3)return bad("Confirm the label using Reveal & prepare overview.");
  const bottle=await getBottle();if(!bottle||body.id!==bottle.id)return Response.json({error:"This photo session changed. Scan the bottle again."},{status:409,headers});
  if(bottle.revealed)return Response.json({error:"This bottle is already revealed. Scan another photo to change it."},{status:409,headers});
  let label;try{label=cleanLabel(body.label);}catch{return bad("Check the label fields. Use a four-digit vintage, NV, or leave it unknown.");}
  if(!label.producer&&!label.name)return bad("Enter a producer or wine name before revealing.");
  await paid(req,"photo");const overview=await prepareBottle(label);const revealed={...bottle,label,...overview,revealed:true};await setBottle(revealed);return Response.json({bottle:revealed},{headers});
 }catch(e){return problem(e);}
}
