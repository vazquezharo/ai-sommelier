import {test,expect} from "@playwright/test";import {start,mockMic,typed} from "../fixtures";
test("record -> reviewed text -> speech; mic off, Stop, fresh round and reconnect",async({page})=>{
 await mockMic(page);await start(page);
 await page.getByRole("button",{name:"Ask sommelier",exact:true}).click();await expect(page.getByText("Ready · microphone off",{exact:true})).toBeVisible();
 expect(await page.evaluate(()=>(window as unknown as {micTest:{enabled:boolean}}).micTest.enabled)).toBe(false);
 const ptt=page.getByRole("button",{name:"Hold to ask · release to send"});await ptt.scrollIntoViewIfNeeded();const box=(await ptt.boundingBox())!;
 await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await expect(page.getByText("Listening to your question",{exact:true})).toBeVisible();
 expect(await page.evaluate(()=>(window as unknown as {micTest:{enabled:boolean}}).micTest.enabled)).toBe(true);
 await page.waitForTimeout(300);await page.mouse.up();await expect(page.getByText("Sommelier speaking · microphone off",{exact:true})).toBeVisible();
 expect(await page.evaluate(()=>(window as unknown as {micTest:{enabled:boolean}}).micTest.enabled)).toBe(false);
 await page.getByRole("button",{name:"Stop speaking"}).click();await expect(page.getByText("Microphone off",{exact:true})).toBeVisible();
 expect(await page.evaluate(()=>Array.from(document.querySelectorAll("audio")).every(a=>a.paused))).toBe(true);
 await page.getByRole("button",{name:"Ask sommelier",exact:true}).click();await expect(page.getByText("Ready · microphone off",{exact:true})).toBeVisible();
 await page.getByRole("button",{name:"Next wine",exact:true}).click();expect(await page.evaluate(()=>(window as unknown as {micTest:{enabled:boolean}}).micTest.enabled)).toBe(false);
 await page.getByRole("button",{name:"Ask sommelier",exact:true}).click();await expect(page.getByText("Ready · microphone off",{exact:true})).toBeVisible();
 await page.getByRole("button",{name:"End voice session",exact:true}).click();await expect(page.getByText("Microphone off",{exact:true})).toBeVisible();
});
test("microphone denial still permits typed reviewed answers",async({page})=>{
 await page.addInitScript(()=>Object.defineProperty(navigator.mediaDevices,"getUserMedia",{value:()=>Promise.reject(new DOMException("Denied","NotAllowedError"))}));
 await start(page);await page.getByRole("button",{name:"Ask sommelier",exact:true}).click();await expect(page.getByText(/Microphone access was denied/)).toBeVisible();
 await typed(page,"What does vanilla mean?");await expect(page.getByText("Sommelier speaking · microphone off",{exact:true})).toBeVisible();await page.getByRole("button",{name:"Stop speaking"}).click();
 await page.getByText("Transcript (2)",{exact:true}).click();await expect(page.getByText(/Vanilla-like aromas often come from oak/)).toBeVisible();
});
test("blur cancels recording; release cannot send a canceled recording",async({page})=>{
 await mockMic(page);await start(page);await page.getByRole("button",{name:"Ask sommelier",exact:true}).click();await expect(page.getByText("Ready · microphone off",{exact:true})).toBeVisible();
 let sent=0;page.on("request",r=>{if(r.url().endsWith("/api/question"))sent++;});
 const ptt=page.getByRole("button",{name:"Hold to ask · release to send"});await ptt.focus();await page.keyboard.down("Space");await expect(page.getByText("Listening to your question",{exact:true})).toBeVisible();await page.evaluate(()=>window.dispatchEvent(new Event("blur")));await page.keyboard.up("Space");
 await expect(page.getByText("Ready · microphone off",{exact:true})).toBeVisible();expect(sent).toBe(0);
});
test("round switching aborts delayed questions and prevents stale audio or transcript",async({page})=>{
 await start(page);await page.route("**/api/question",async route=>{await new Promise(r=>setTimeout(r,700));try{await route.fulfill({json:{question:"Old question",answerId:"tannin",text:"UNAPPROVED SPOILER",audioAvailable:true}});}catch{}});
 await typed(page,"What is tannin?");await page.getByRole("button",{name:"Next wine",exact:true}).click();await page.waitForTimeout(900);
 await expect(page.getByText("WINE 2 OF 8",{exact:true})).toBeVisible();await expect(page.getByText("Transcript (0)",{exact:true})).toBeVisible();await expect(page.getByText("UNAPPROVED SPOILER")).toHaveCount(0);
 expect(await page.evaluate(()=>Array.from(document.querySelectorAll("audio")).every(a=>a.paused))).toBe(true);
});
test("browser rejects unreviewed text before requesting speech",async({page})=>{
 await start(page);let audioRequests=0;page.on("request",r=>{if(r.url().endsWith("/api/audio"))audioRequests++;});
 await page.route("**/api/question",r=>r.fulfill({json:{question:"x",answerId:"tannin",text:"This is Grenache",audioAvailable:true}}));
 await typed(page,"Explain texture");await expect(page.getByText(/Unapproved answer blocked/)).toBeVisible();expect(audioRequests).toBe(0);await expect(page.getByText("This is Grenache",{exact:true})).toHaveCount(0);
});
test("revealed-to-blind voice uses no identity, metadata or history",async({page})=>{
 await start(page,"each");await page.getByRole("button",{name:"Reveal wine",exact:true}).click();await expect(page.getByRole("heading",{name:"Pinot Noir",exact:true})).toBeVisible();
 const payloads:unknown[]=[];page.on("request",r=>{if(r.url().endsWith("/api/question"))payloads.push(r.postDataJSON());});
 await typed(page,"What does tannin feel like?");await expect(page.getByText("Sommelier speaking · microphone off",{exact:true})).toBeVisible();await page.getByRole("button",{name:"Next wine",exact:true}).click();
 await typed(page,"Is this Grenache?");await expect(page.getByText("Sommelier speaking · microphone off",{exact:true})).toBeVisible();
 expect(payloads).toEqual([{question:"What does tannin feel like?"},{question:"Is this Grenache?"}]);
 await page.getByRole("button",{name:"Stop speaking"}).click();await expect(page.getByRole("heading",{name:"Let the glass speak."})).toBeVisible();
});

test("expired host session releases microphone and reopens login",async({page})=>{
 await mockMic(page);await start(page);await page.getByRole("button",{name:"Ask sommelier",exact:true}).click();await expect(page.getByText("Ready · microphone off",{exact:true})).toBeVisible();
 await page.route("**/api/question",r=>r.fulfill({status:401,json:{error:"Unlock host access first."}}));
 await typed(page,"What is tannin?");await expect(page.getByText("Host access expired. Enter the host code again.",{exact:true})).toBeVisible();await expect(page.getByLabel("Host access code",{exact:true})).toBeFocused();
 expect(await page.evaluate(()=>(window as unknown as {micTest:{enabled:boolean}}).micTest.enabled)).toBe(false);
});
test("microphone disconnect and reconnect remain silent between holds",async({page})=>{
 await mockMic(page);await start(page);await page.getByRole("button",{name:"Ask sommelier",exact:true}).click();await expect(page.getByText("Ready · microphone off",{exact:true})).toBeVisible();
 await page.evaluate(()=>(window as unknown as {micTest:{ended:null|(()=>void)}}).micTest.ended?.());await expect(page.getByText("Microphone disconnected. Reconnect or type a question.",{exact:true})).toBeVisible();
 await page.getByRole("button",{name:"Reconnect sommelier",exact:true}).click();await expect(page.getByText("Ready · microphone off",{exact:true})).toBeVisible();expect(await page.evaluate(()=>(window as unknown as {micTest:{enabled:boolean}}).micTest.enabled)).toBe(false);
});
test("Stop during pending audio fetch prevents late playback",async({page})=>{
 await start(page);await page.route("**/api/audio",async r=>{await new Promise(resolve=>setTimeout(resolve,600));try{await r.fulfill({contentType:"audio/mpeg",body:"late-invalid-audio"});}catch{}});
 await typed(page,"What is body?");await expect(page.getByText("Transcript (2)",{exact:true})).toBeVisible();await page.getByRole("button",{name:"Stop speaking"}).click();await page.waitForTimeout(800);
 expect(await page.evaluate(()=>Array.from(document.querySelectorAll("audio")).every(a=>a.paused&&!a.src))).toBe(true);await expect(page.getByText("Microphone off",{exact:true})).toBeVisible();
});
