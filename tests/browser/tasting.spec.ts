import {test,expect} from "@playwright/test";
test("all eight rounds, reveal states, finish and resume on mobile",async({page})=>{
 await page.goto("/");await page.locator("#reveal-mode").selectOption("each");await page.getByRole("button",{name:"Start tasting",exact:true}).click();
 const names=["Pinot Noir","Grenache","Rosso di Montepulciano","Malbec","Baruffo Chianti Classico","Tempranillo","Seven Oaks","Vintner’s Reserve"];
 for(let i=0;i<8;i++){
  await expect(page.getByText("WINE "+(i+1)+" OF 8",{exact:true})).toBeVisible();
  await expect(page.getByRole("heading",{name:"Let the glass speak."})).toBeVisible();
  await page.getByRole("button",{name:"Reveal wine",exact:true}).click();
  await expect(page.getByRole("heading",{name:names[i],exact:true})).toBeVisible();
  await page.getByRole("button",{name:i===7?"Finish tasting":"Next wine",exact:true}).click();
 }
 await expect(page.getByRole("heading",{name:"A toast to curiosity."})).toBeVisible();
 await page.getByRole("button",{name:"Review the last wine"}).click();
 await page.reload();await expect(page.getByRole("heading",{name:"Vintner’s Reserve",exact:true})).toBeVisible();
 await page.getByRole("button",{name:"Go to wine 1, already revealed",exact:true}).click();
 await expect(page.getByRole("heading",{name:"Pinot Noir",exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBeTruthy();
});
test("reorder, notes, and reveal survive reload",async({page})=>{
 await page.goto("/");await page.locator("#reveal-mode").selectOption("each");await page.getByRole("button",{name:"Move St. Francis later",exact:true}).click();
 await page.reload();await page.getByRole("button",{name:"Start tasting",exact:true}).click();
 await page.getByRole("button",{name:"Reveal wine",exact:true}).click();
 await expect(page.getByRole("heading",{name:"Grenache",exact:true})).toBeVisible();
 await page.getByText("Tasting notes",{exact:true}).click();await page.getByLabel("What did your table notice?").fill("Pepper and freshness");
 await page.reload();await page.getByText("Tasting notes",{exact:true}).click();
 await expect(page.getByLabel("What did your table notice?")).toHaveValue("Pepper and freshness");
});
test("demo is honest, text scripts work, and blind screen hides identity",async({page})=>{
 await page.route("**/api/host",route=>route.fulfill({json:{demo:true,unlocked:false}}));
 await page.goto("/");await page.locator("#reveal-mode").selectOption("each");await page.getByRole("button",{name:"Start tasting",exact:true}).click();
 await expect(page.getByText("St. Francis",{exact:true})).not.toBeVisible();
 await page.getByRole("button",{name:"Play hint"}).click();
 await expect(page.getByText(/Demo mode: generated audio is not installed/)).toBeVisible();
 await expect(page.getByText(/Look at the color, then take/)).toBeVisible();
 await page.getByRole("button",{name:"Ask sommelier",exact:true}).click();
 await expect(page.getByRole("status")).toContainText("No answers are simulated");
 await page.getByRole("button",{name:"Reveal wine",exact:true}).click();
 await page.getByRole("button",{name:"Play overview"}).click();
 await expect(page.getByText(/You may notice cherry, raspberry/).first()).toBeVisible();
});
test("microphone denial leaves the tasting usable",async({page})=>{
 await page.route("**/api/host",route=>route.fulfill({json:{demo:false,unlocked:true}}));
 await page.addInitScript(()=>{Object.defineProperty(navigator.mediaDevices,"getUserMedia",{value:()=>Promise.reject(new DOMException("Denied","NotAllowedError"))});});
 await page.goto("/");await page.locator("#reveal-mode").selectOption("each");await page.getByRole("button",{name:"Start tasting",exact:true}).click();
 await page.getByRole("button",{name:"Ask sommelier",exact:true}).click();
 await expect(page.getByRole("status")).toContainText("Microphone access was denied");
 await page.getByRole("button",{name:"Reveal wine",exact:true}).click();
 await page.getByRole("button",{name:"Next wine",exact:true}).click();
 await expect(page.getByText("WINE 2 OF 8",{exact:true})).toBeVisible();
});
test("unavailable voice API sends an anonymous request and releases microphone",async({page})=>{
 await page.route("**/api/host",route=>route.fulfill({json:{demo:false,unlocked:true}}));
 await page.addInitScript(()=>{
  (window as unknown as {stopped:boolean}).stopped=false;
  Object.defineProperty(navigator.mediaDevices,"getUserMedia",{value:()=>Promise.resolve({getTracks:()=>[{enabled:false,stop:()=>{(window as unknown as {stopped:boolean}).stopped=true;}}],getAudioTracks:()=>[]})});
 });
 let payload:unknown;
 await page.route("**/api/voice",route=>{payload=route.request().postDataJSON();return route.fulfill({status:503,json:{error:"OpenAI voice is unavailable."}});});
 await page.goto("/");await page.locator("#reveal-mode").selectOption("each");await page.getByRole("button",{name:"Start tasting",exact:true}).click();await page.getByRole("button",{name:"Ask sommelier",exact:true}).click();
 await expect(page.getByRole("status")).toContainText("OpenAI voice is unavailable");
 expect(payload).toEqual({mode:"blind"});
 expect(await page.evaluate(()=>(window as unknown as {stopped:boolean}).stopped)).toBeTruthy();
});
test("changing rounds aborts stale introduction fetches",async({page})=>{
 await page.route("**/api/host",route=>route.fulfill({json:{demo:false,unlocked:true}}));
 await page.route("**/audio/*.mp3",route=>route.fulfill({status:404}));
 await page.route("**/api/audio",async route=>{await new Promise(r=>setTimeout(r,500));try{await route.fulfill({contentType:"audio/mpeg",body:"fake-audio"});}catch{}});
 await page.goto("/");await page.locator("#reveal-mode").selectOption("each");await page.getByRole("button",{name:"Start tasting",exact:true}).click();
 await page.getByRole("button",{name:"Reveal wine",exact:true}).click();await page.getByRole("button",{name:"Play overview"}).click();
 await page.getByRole("button",{name:"Next wine",exact:true}).click();
 await expect(page.getByText("WINE 2 OF 8",{exact:true})).toBeVisible();
 await page.waitForTimeout(750);
 expect(await page.evaluate(()=>Array.from(document.querySelectorAll("audio")).every(a=>a.paused && !a.srcObject))).toBeTruthy();
 await expect(page.getByRole("heading",{name:"Let the glass speak."})).toBeVisible();
});
