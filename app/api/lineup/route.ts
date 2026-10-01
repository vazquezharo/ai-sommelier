import {requireHost,problem} from "@/lib/access";
import {hostLineup} from "@/lib/tasting";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function POST(req:Request){try{await requireHost(req);const body=await req.json();if(body.action!=="host-lineup"||Object.keys(body).length!==1)return Response.json({error:"Invalid host action."},{status:400});return Response.json({lineup:await hostLineup()},{headers:{"Cache-Control":"no-store"}});}catch(e){return problem(e);}}
