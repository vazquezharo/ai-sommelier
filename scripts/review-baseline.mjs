import {mkdir,writeFile} from "node:fs/promises";
await mkdir("review-evidence",{recursive:true});
const base="https://ai-sommelier-virid.vercel.app";
const evidence={baselineCommit:"95e78ebda1d55c583aa816341f922bece540f443",checks:[],observedAt:new Date().toISOString()};
for(const path of ["/","/api/host","/source.json"]){
 try{
  const r=await fetch(base+path,{signal:AbortSignal.timeout(15000)});const body=await r.text();
  const check={path,status:r.status,bytes:body.length};
  if(path==="/source.json" && r.ok){
   const source=JSON.parse(body);const lineup=JSON.parse(source["data/wines.json"]||"[]");
   check.answerKeyPublic=lineup.length===8;check.firstBottle=lineup[0]?{producer:lineup[0].producer,name:lineup[0].name,grape:lineup[0].grape}:null;
  }
  if(path==="/api/host"&&r.ok){const status=JSON.parse(body);check.demo=status.demo;check.unlocked=status.unlocked;}
  if(path==="/"){check.title=body.match(/<title>(.*?)<\/title>/)?.[1];}
  evidence.checks.push(check);
 }catch(e){evidence.checks.push({path,error:e instanceof Error?e.message:String(e)});}
}
await writeFile("review-evidence/live-baseline.json",JSON.stringify(evidence,null,2));
console.log(JSON.stringify(evidence));
