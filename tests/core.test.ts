import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {wines,anonymousHint} from "../lib/wines";
import {buildContext} from "../lib/context";
import {initialProgress,restoreProgress,reorder,reveal} from "../lib/progress";
test("eight rounds, seven main grapes, reviewed script lengths and unknown vintage/blend",()=>{
 assert.equal(wines.length,8);assert.equal(new Set(wines.map(w=>w.grape)).size,7);
 for(const w of wines){assert.equal(w.vintage,null);assert.equal(w.exactBlend,null);const n=w.overview.split(/\s+/).length;assert.ok(n>=120&&n<=140);}
 assert.equal(wines[2].grape,"Sangiovese-based");
});
test("reorder persists and revealed wines stay revealed when returning",()=>{
 let p=initialProgress();p=reorder(p,0,7);assert.equal(p.order[7],"pinot");
 p={...p,started:true};const first=p.order[0];p=reveal(p);
 p={...p,index:7};p=reveal(p);p={...p,index:0};
 const resumed=restoreProgress(JSON.stringify(p));
 assert.deepEqual(resumed.order,p.order);assert.equal(resumed.started,true);assert.ok(resumed.revealed.includes(first));assert.ok(resumed.revealed.includes("pinot"));
 assert.deepEqual(reorder(resumed,0,7),resumed);
});
test("all eight host-controlled reveals survive resume",()=>{
 let p={...initialProgress(),started:true};
 for(let index=0;index<8;index++)p=reveal({...p,index});
 assert.equal(restoreProgress(JSON.stringify(p)).revealed.length,8);
});
test("corrupt or unsupported local progress resets safely",()=>{
 for(const raw of ["oops",null,'{}',JSON.stringify({...initialProgress(),order:Array(8).fill("pinot")})]) assert.deepEqual(restoreProgress(raw),initialProgress());
});
test("blind context never varies with hidden bottle or contains identity or mapping",()=>{
 const context=buildContext("blind");
 for(const w of wines){
  assert.equal(buildContext("blind",w.id),context);
  assert.ok(!context.includes(w.producer));assert.ok(!context.includes(w.name));assert.ok(!context.includes(w.grape));
 }
 assert.ok(context.includes(anonymousHint));assert.ok(!/Wine [1-8]|Paso Robles|Sonoma|Tuscany/.test(context));
 assert.notEqual(buildContext("revealed","pinot"),context);
 assert.throws(()=>buildContext("revealed","bogus"));
});
test("browser code never reads long-lived key or sends a blind bottle id",()=>{
 const ui=readFileSync("app/page.tsx","utf8"),voice=readFileSync("lib/voice.ts","utf8");
 assert.ok(!ui.includes("OPENAI_API_KEY"));assert.ok(!voice.includes("OPENAI_API_KEY"));
 assert.ok(voice.includes('mode==="blind"?{mode}:{mode,id}'));
 assert.ok(voice.includes('t.enabled=false'));
 assert.ok(voice.includes('epoch!==this.epoch'));
 assert.ok(voice.includes('this.pc?.close()'));
});

test("malformed saved notes and transcripts are ignored",()=>{
 const restored=restoreProgress(JSON.stringify({...initialProgress(),notes:{pinot:5},transcripts:{pinot:[{role:{},text:"bad"},{role:"Guest",text:"Fresh"}]}}));
 assert.equal(restored.notes.pinot,undefined);assert.deepEqual(restored.transcripts.pinot,[{role:"Guest",text:"Fresh"}]);
});

test("host correction from Syrah to Grenache preserves round order and progress",()=>{
 const old={...initialProgress(),order:initialProgress().order.map(id=>id==="grenache"?"syrah":id),revealed:["syrah"],notes:{syrah:"Red fruit"},transcripts:{syrah:[{role:"Guest",text:"Soft texture"}]}};
 const p=restoreProgress(JSON.stringify(old));assert.equal(p.order[1],"grenache");assert.deepEqual(p.revealed,["grenache"]);assert.equal(p.notes.grenache,"Red fruit");assert.equal(p.transcripts.grenache[0].text,"Soft texture");
});
