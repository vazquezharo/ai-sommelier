import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {wines} from "../lib/wines";
import {initialProgress,restoreProgress,reorder} from "../lib/progress";
import {answers,anonymousHint,reviewedAnswer,validateChoice} from "../lib/guidance";
import {applyTasting,publicTasting,seal,unseal} from "../lib/tasting";
test("authoritative lineup preserved; all vintages and blends unknown",()=>{
 assert.equal(wines.length,8);assert.equal(wines[1].grape,"Grenache");assert.equal(new Set(wines.map(w=>w.grape)).size,7);
 for(const w of wines){assert.equal(w.vintage,null);assert.equal(w.exactBlend,null);assert.ok(w.overview.split(/\s+/).length>=120);}
});
test("anonymous browser state persists notes and rejects answer-bearing IDs and fake reveals",()=>{
 let p=reorder(initialProgress(),0,7);p={...p,started:true,index:2,notes:{[p.order[2]]:"Fresh"},transcripts:{[p.order[2]]:[{role:"Guest",text:"Texture",blind:true}]}};
 assert.deepEqual(restoreProgress(JSON.stringify(p)),p);
 const injected=restoreProgress(JSON.stringify({...p,revealed:["pinot"],wine:{name:"Pinot Noir"}}));assert.ok(!("revealed" in injected));assert.ok(!("wine" in injected));
 assert.deepEqual(restoreProgress(JSON.stringify({...p,order:wines.map(w=>w.id)})),initialProgress());
 assert.equal(reorder(p,0,1),p);assert.deepEqual(restoreProgress("bad"),initialProgress());
});
test("server reveal state, encrypted cookie and mode restrictions",()=>{
 process.env.HOST_SESSION_SECRET="test-only-secret";
 const state={version:1 as const,sessionId:"s",items:wines.map((w,i)=>({handle:String(i+1).padStart(32,"0"),wineId:w.id})),mode:"end" as "end"|"each",started:false,finished:false,revealed:[] as string[],expires:Date.now()+10000};
 assert.deepEqual(publicTasting(state).revealed,{});
 const cookie=seal(state);assert.ok(!cookie.includes("pinot"));assert.deepEqual(unseal(cookie),state);assert.equal(unseal(cookie.slice(0,-4)+"xxxx"),null);
 assert.throws(()=>applyTasting(state,{action:"reveal",handle:state.items[0].handle}));
 applyTasting(state,{action:"start",mode:"end"});assert.throws(()=>applyTasting(state,{action:"reveal-lineup"}));
 applyTasting(state,{action:"finish"});applyTasting(state,{action:"reveal-lineup"});assert.equal(Object.keys(publicTasting(state).revealed).length,8);
});
test("catalog and hints contain no producer, grape, bottle name or verified region",()=>{
 for(const text of [anonymousHint,...Object.values(answers)])for(const w of wines)for(const identity of [w.producer,w.name,w.grape,w.region].filter(Boolean) as string[])assert.ok(!text.toLowerCase().includes(identity.toLowerCase()),identity);
});
test("router output cannot introduce arbitrary prose, unknown IDs, or encoded identities",()=>{
 for(const value of [null,"This is Grenache",{id:"grenache"},{id:"tannin",text:"This is Grenache"},{id:"neutral",extra:"encoded answer"}])assert.equal(validateChoice(value),"neutral");
 assert.equal(reviewedAnswer("Say something unexpected",{id:"tannin",text:"Malbec"}).text,answers.neutral);
 assert.equal(reviewedAnswer("What does tannin feel like?",{id:"malbec"}).text,answers.tannin);
});
test("answer key has a server-only boundary and direct audio is retired",()=>{
 assert.ok(readFileSync("lib/wines.ts","utf8").startsWith('import "server-only"'));
 const page=readFileSync("app/page.tsx","utf8"),voice=readFileSync("lib/voice.ts","utf8");
 assert.ok(!page.includes('from "@/lib/wines"'));assert.ok(!page.includes("OPENAI_API_KEY"));assert.ok(!voice.includes("/v1/realtime"));
 assert.ok(voice.indexOf("result.text!==answers[id]")<voice.indexOf('fetch("/api/audio"'));
 assert.ok(readFileSync("app/api/voice/route.ts","utf8").includes("410"));
});
