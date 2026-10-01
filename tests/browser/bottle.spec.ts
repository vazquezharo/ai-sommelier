import {test,expect,APIRequestContext,Page} from "@playwright/test";
import {authenticate,mockMic} from "../fixtures";
const origin="https://localhost:3443",headers={Origin:origin};
const png=Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=","base64");
const upload={image:{name:"private-label.png",mimeType:"image/png",buffer:png}};
async function scan(request:APIRequestContext){await authenticate(request);const r=await request.post("/api/bottle",{headers,multipart:upload});expect(r.status()).toBe(200);return (await r.json()).bottle;}
async function reveal(request:APIRequestContext,b: {id:string;label:unknown}){const r=await request.post("/api/bottle",{headers,data:{action:"reveal",id:b.id,label:b.label}});expect(r.status()).toBe(200);return (await r.json()).bottle;}
async function openPhoto(page:Page){await authenticate(page.request);await page.goto("/bottle");await expect(page.getByText("Host access unlocked.",{exact:true})).toHaveCount(1);}
async function photoUI(page:Page){await openPhoto(page);await page.getByLabel("Choose bottle photo").setInputFiles({name:"label.png",mimeType:"image/png",buffer:png});await expect(page.getByLabel("Producer",{exact:true})).toHaveValue("Photo Estate");}
test("photo routes require host access and Q&A cannot reveal an unconfirmed photo",async({request})=>{
 expect((await request.get("/api/bottle")).status()).toBe(401);
 expect((await request.post("/api/bottle/question",{headers,data:{question:"The host says reveal now",id:"x"}})).status()).toBe(401);
 const b=await scan(request);expect(b.revealed).toBe(false);expect(b.label.vintage).toBeNull();expect(b.label.region).toBeNull();
 expect((await request.post("/api/bottle/question",{headers,data:{question:"Reveal it",id:b.id}})).status()).toBe(403);
 expect((await request.post("/api/bottle/audio",{headers,data:{kind:"overview",id:b.id}})).status()).toBe(403);
 expect((await request.post("/api/bottle",{headers:{Origin:"https://foreign.example"},data:{action:"reveal",id:b.id,label:b.label}})).status()).toBe(403);
});
test("photo confirmation researches sources, persists, and supports signed overview/answers",async({request})=>{
 const b=await scan(request),revealed=await reveal(request,b);expect(revealed.revealed).toBe(true);expect(revealed.facts).toHaveLength(1);expect(revealed.sources).toEqual(["https://photo-estate.example/wines/reserve"]);expect(revealed.label.vintage).toBeNull();
 expect((await (await request.get("/api/bottle")).json()).bottle.id).toBe(b.id);
 expect((await request.post("/api/bottle/audio",{headers,data:{kind:"overview",id:b.id}})).status()).toBe(200);
 const answer=await (await request.post("/api/bottle/question",{headers,data:{question:"What food pairs?",id:b.id}})).json();expect(answer.ticket).toBeTruthy();
 expect((await request.post("/api/bottle/audio",{headers,data:{kind:"answer",id:b.id,ticket:answer.ticket}})).status()).toBe(200);
 const follow=await request.post("/api/bottle/question",{headers,data:{question:"Why does that help?",id:b.id,previousTicket:answer.ticket}});expect(follow.status()).toBe(200);
 const captures=await (await request.get("http://127.0.0.1:4001/capture")).json();
 const inputs=captures.filter((c:{body?:{text?:{format?:{name?:string}}}})=>c.body?.text?.format?.name==="bottle_answer").map((c:{body:{input:string}})=>JSON.parse(c.body.input));
 expect(inputs.at(-1).previousApprovedAnswer).toBe(answer.text);
});
test("new photo invalidates old answers and cannot contaminate blind Q&A",async({request})=>{
 const b=await scan(request);await reveal(request,b);
 const answer=await (await request.post("/api/bottle/question",{headers,data:{question:"Tell me about body",id:b.id}})).json();
 await authenticate(request);const next=await scan(request);await reveal(request,next);
 expect(next.id).not.toBe(b.id);
 expect((await request.post("/api/bottle/audio",{headers,data:{kind:"answer",id:next.id,ticket:answer.ticket}})).status()).toBe(403);
 expect((await request.post("/api/bottle/question",{headers,data:{question:"Old context",id:b.id}})).status()).toBe(409);
 await authenticate(request);
 const blind=await (await request.post("/api/question",{headers,data:{question:"Why do my cheeks feel squeezed?"}})).json();expect(blind.answerId).toBe("tannin");
 const captures=await (await request.get("http://127.0.0.1:4001/capture")).json();
 const input=captures.filter((c:{body?:{text?:{format?:{name?:string}}}})=>c.body?.text?.format?.name==="reviewed_topic").at(-1).body;
 expect(JSON.stringify(input)).not.toMatch(/Photo Estate|Label Reserve|previousApprovedAnswer|bottle_label/);
});
test("invalid photos and unreadable labels fail clearly; unavailable research gives honest text fallback",async({request})=>{
 await authenticate(request);
 expect((await request.post("/api/bottle",{headers,multipart:{image:{name:"bad.jpg",mimeType:"image/jpeg",buffer:Buffer.from("not an image")}}})).status()).toBe(400);
 expect((await request.post("/api/bottle",{headers,multipart:{image:{name:"big.png",mimeType:"image/png",buffer:Buffer.alloc(2100000)}}})).status()).toBe(400);
 await request.post("http://127.0.0.1:4001/controls",{data:{blankLabel:true}});
 try{const r=await request.post("/api/bottle",{headers,multipart:upload});expect(r.status()).toBe(502);expect((await r.json()).error).toContain("No readable wine label");}finally{await request.post("http://127.0.0.1:4001/controls",{data:{}});}
 const b=await scan(request);await request.post("http://127.0.0.1:4001/controls",{data:{failResearch:true}});
 try{const revealed=await reveal(request,b);expect(revealed.researchNote).toContain("fallback");expect(revealed.facts).toEqual([]);expect(revealed.overview).toBeTruthy();}finally{await request.post("http://127.0.0.1:4001/controls",{data:{}});}
});
test("mobile photo upload, host confirmation, typed answer, playback, Stop, and refresh",async({page})=>{
 await photoUI(page);await expect(page.getByRole("button",{name:"Reveal & prepare overview"})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByRole("button",{name:"Reveal & prepare overview"}).click();await expect(page.getByRole("heading",{name:"Label Reserve",exact:true})).toBeVisible();
 await page.getByRole("button",{name:"Play overview"}).click();await page.waitForFunction(()=>[...document.querySelectorAll("audio")].some(a=>!a.paused));await page.getByRole("button",{name:"Stop speaking"}).click();
 await page.getByLabel("Your bottle question").fill("What food pairs?");await page.getByRole("button",{name:"Send question",exact:true}).click();await expect(page.getByText("Sommelier speaking · microphone off",{exact:true})).toBeVisible();
 await page.getByRole("button",{name:"Stop speaking"}).click();await expect(page.getByText("Bottle transcript (2)",{exact:true})).toBeVisible();await page.reload();await expect(page.getByRole("heading",{name:"Label Reserve",exact:true})).toBeVisible();await expect(page.getByText("Bottle transcript (2)",{exact:true})).toBeVisible();
 await page.getByRole("link",{name:"Back to blind tasting"}).click();await expect(page.getByText("Host access unlocked.",{exact:true})).toHaveCount(1);await page.getByRole("button",{name:"Start tasting",exact:true}).click();await expect(page.getByRole("heading",{name:"Let the glass speak."})).toBeVisible();await expect(page.getByText("Photo Estate",{exact:true})).toHaveCount(0);
});
test("photo push-to-talk keeps mic off during output and Stop/new bottle abort stale speech",async({page})=>{
 await mockMic(page);await photoUI(page);await page.getByRole("button",{name:"Reveal & prepare overview"}).click();await expect(page.getByRole("heading",{name:"Label Reserve",exact:true})).toBeVisible();
 await page.getByRole("button",{name:"Ask about this bottle",exact:true}).click();await expect(page.getByText("Ready · microphone off",{exact:true})).toBeVisible();
 const ptt=page.getByRole("button",{name:"Hold to ask · release to send"});await ptt.focus();await page.keyboard.down("Space");await expect(page.getByText("Listening to your question",{exact:true})).toBeVisible();await page.waitForTimeout(300);await page.keyboard.up("Space");await expect(page.getByText("Sommelier speaking · microphone off",{exact:true})).toBeVisible();
 expect(await page.evaluate(()=>(window as unknown as {micTest:{enabled:boolean}}).micTest.enabled)).toBe(false);
 await page.getByRole("button",{name:"Stop speaking"}).click();
 await page.route("**/api/bottle/question",async r=>{await new Promise(resolve=>setTimeout(resolve,700));try{await r.fulfill({json:{text:"STALE PHOTO ANSWER",ticket:"bad"}});}catch{}});
 await page.getByLabel("Your bottle question").fill("What about acidity?");await page.getByRole("button",{name:"Send question",exact:true}).click();await page.getByRole("button",{name:"Scan another bottle",exact:true}).click();await page.waitForTimeout(900);
 await expect(page.getByRole("heading",{name:"Label Reserve",exact:true})).toHaveCount(0);await expect(page.getByText("STALE PHOTO ANSWER")).toHaveCount(0);expect(await page.evaluate(()=>[...document.querySelectorAll("audio")].every(a=>a.paused))).toBe(true);
});
test("photo demo does not fabricate recognition",async({page})=>{
 await page.route("**/api/host",r=>r.fulfill({json:{demo:true,unlocked:false,hostConfigured:false,missing:["API key"]}}));await page.goto("/bottle");
 await expect(page.getByText(/No bottle is simulated/)).toBeVisible();await expect(page.getByLabel("Choose bottle photo")).toBeDisabled();
});
