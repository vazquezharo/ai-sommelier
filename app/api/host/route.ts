import { configured, hostConfigured, missingConfiguration, hostId, sameOrigin, limit, validCode, createHostSession, problem } from "@/lib/access";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(){return Response.json({demo:!configured(),hostConfigured:hostConfigured(),unlocked:Boolean(await hostId()),missing:missingConfiguration()},{headers:{"Cache-Control":"no-store"}});}
export async function POST(req:Request){
 try {
  sameOrigin(req);const ip=req.headers.get("x-forwarded-for")?.split(",")[0]||"local";limit("login:"+ip,10,15*60*1000);
  if(!hostConfigured()) return Response.json({error:"Host access is not configured."},{status:503});
  const {code}=await req.json();if(typeof code!=="string"||!validCode(code)) return Response.json({error:"Access code not recognized."},{status:401});
  await createHostSession();return Response.json({ok:true});
 } catch(e){return problem(e);}
}
