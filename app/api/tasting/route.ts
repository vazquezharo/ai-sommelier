import {requireHost,problem} from "@/lib/access";
import {ensureTasting,publicTasting,applyTasting,saveTasting} from "@/lib/tasting";
export const runtime="nodejs";export const dynamic="force-dynamic";
const response=(value:unknown)=>Response.json(value,{headers:{"Cache-Control":"no-store"}});
export async function GET(req:Request){try{await requireHost(req,false);return response(publicTasting(await ensureTasting()));}catch(e){return problem(e);}}
export async function POST(req:Request){try{await requireHost(req);const body=await req.json();const allowed:Record<string,string[]>={start:["action","mode"],reorder:["action","order"],reveal:["action","handle"],finish:["action"],"reveal-lineup":["action"]};if(!allowed[body.action]||Object.keys(body).some(k=>!allowed[body.action].includes(k)))return responseError();const t=applyTasting(await ensureTasting(),body);await saveTasting(t);return response(publicTasting(t));}catch(e){return problem(e);}}
function responseError(){return Response.json({error:"Invalid tasting change."},{status:400});}
