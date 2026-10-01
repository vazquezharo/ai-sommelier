import {test} from "node:test";
import assert from "node:assert/strict";
import {cleanLabel,safeSource,cleanOverview,researchSources,cleanFacts} from "../lib/bottle-policy";
import {answerTicket,ticketText,sealBottle,unsealBottle} from "../lib/bottle";
test("photo labels preserve unknown vintage, grape and region rather than guessing",()=>{
 assert.deepEqual(cleanLabel({producer:" Producer ",name:"Bottle",grape:null,region:null,vintage:null}),{producer:"Producer",name:"Bottle",grape:null,region:null,vintage:null});
 assert.equal(cleanLabel({producer:null,name:"Bottle",grape:null,region:null,vintage:"2020"}).vintage,"2020");
 assert.throws(()=>cleanLabel({producer:null,name:"Bottle",grape:null,region:null,vintage:"unknown"}));
 assert.throws(()=>cleanLabel({producer:"x".repeat(101),name:null,grape:null,region:null,vintage:null}));
});
test("researched facts require actual returned source URLs",()=>{
 const overview=Array(125).fill("notice").join(" ");
 const sources=researchSources({output:[{type:"web_search_call",action:{sources:[{url:"https://producer.example/wine"}]}}]});
 assert.deepEqual(cleanOverview({overview,facts:[{claim:"Supported",url:sources[0]},{claim:"Fabricated",url:"https://invented.example"}]},sources).facts,[{claim:"Supported",url:sources[0]}]);
 for(const url of ["javascript:alert(1)","http://producer.example","https://localhost/a","https://user:pass@example.com"])assert.equal(safeSource(url),null);
});
test("photo audio tickets are signed, short-lived, host- and bottle-scoped",()=>{
 process.env.HOST_SESSION_SECRET="test-only-bottle-secret-32-characters";
 const t=answerTicket("Approved bottle answer.","host-a","bottle-a");
 assert.equal(ticketText(t,"host-a","bottle-a"),"Approved bottle answer.");assert.equal(ticketText(t,"host-b","bottle-a"),null);assert.equal(ticketText(t,"host-a","bottle-b"),null);
 assert.equal(ticketText(t.slice(0,-4)+"ffff","host-a","bottle-a"),null);
 const real=Date.now;try{Date.now=()=>real()+31*60000;assert.equal(ticketText(t,"host-a","bottle-a"),null);}finally{Date.now=real;}
});
test("private photo cookie is encrypted and rejects tampering",()=>{
 const b={id:"a".repeat(32),label:{producer:"Photo Estate",name:"Reserve",grape:null,region:null,vintage:null},confidence:"low" as const,note:"Check label",revealed:false,overview:null,facts:[],sources:[],researchNote:"",expires:Date.now()+10000};
 const cookie=sealBottle(b);assert.ok(!cookie.includes("Photo Estate"));assert.deepEqual(unsealBottle(cookie),b);assert.equal(unsealBottle(cookie.slice(0,-5)+"xxxxx"),null);
});

test("expanded transient research retains later consulted pages without accepting fabricated URLs or empty notes",()=>{
 const urls=Array.from({length:6},(_,i)=>"https://producer.example/page"+i);
 const sources=researchSources({output:[{type:"web_search_call",action:{sources:urls.map(url=>({url}))}}]},8);
 assert.deepEqual(sources,urls);
 const facts=cleanFacts([...urls.map((url,i)=>({claim:"Supported note "+i,url})),{claim:"Not consulted",url:"https://fake.example/"},{claim:"  ",url:urls[0]}],sources,6);
 assert.equal(facts.length,6);assert.equal(facts[5].url,urls[5]);assert.equal(cleanFacts(facts,sources).length,2);
 assert.deepEqual(cleanFacts([{claim:" ",url:urls[0]}],sources,6),[]);
});
