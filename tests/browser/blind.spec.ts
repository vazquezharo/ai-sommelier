import {test,expect} from "@playwright/test";
test("default eight-round blind tasting saves guesses and scores before final lineup reveal",async({page})=>{
 await page.route("**/api/host",r=>r.fulfill({json:{demo:true,unlocked:false}}));
 await page.goto("/");await expect(page.locator("#reveal-mode")).toHaveValue("end");
 await page.getByRole("button",{name:"Start tasting",exact:true}).click();
 for(let i=0;i<8;i++){
  await expect(page.getByText("WINE "+(i+1)+" OF 8",{exact:true})).toBeVisible();
  await expect(page.getByRole("button",{name:"Reveal wine",exact:true})).toHaveCount(0);
  await expect(page.getByRole("button",{name:"Play overview",exact:false})).toHaveCount(0);
  await expect(page.getByText("St. Francis",{exact:true})).not.toBeVisible();
  await expect(page.getByRole("heading",{name:"Pinot Noir",exact:true})).toHaveCount(0);
  await page.getByLabel("Your table’s grape guess").fill("Guess "+(i+1));
  await page.getByLabel("Your table’s score").selectOption(String(i+1));
  if(i===0){
   await page.getByRole("button",{name:"Read tasting guide",exact:true}).click();
   await expect(page.getByText(/Look at the color, then take/)).toBeVisible();
   await page.reload();await expect(page.getByLabel("Your table’s grape guess")).toHaveValue("Guess 1");
   await expect(page.getByLabel("Your table’s score")).toHaveValue("1");
  }
  await page.getByRole("button",{name:i===7?"Finish tasting":"Next wine",exact:true}).click();
 }
 await expect(page.getByRole("heading",{name:"A toast to curiosity."})).toBeVisible();
 await expect(page.getByText(/Guess: Guess 1 · Score: 1\/10/)).toBeVisible();
 await expect(page.getByText(/St. Francis/)).not.toBeVisible();
 await page.getByRole("button",{name:"Reveal the lineup",exact:true}).click();
 await expect(page.getByText(/St. Francis — Pinot Noir/)).toBeVisible();
 await page.reload();await expect(page.getByText(/St. Francis — Pinot Noir/)).toBeVisible();
 await page.getByRole("button",{name:"Review the last wine",exact:true}).click();
 await page.getByRole("button",{name:"Go to wine 1, already revealed",exact:true}).click();
 await expect(page.getByRole("heading",{name:"Pinot Noir",exact:true})).toBeVisible();
 await expect(page.getByLabel("Your table’s score")).toBeDisabled();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBeTruthy();
});
test("old revealed rounds and identifying transcripts are hidden in end reveal mode",async({page})=>{
 await page.addInitScript(()=>{
  localStorage.setItem("ai-sommelier-v1",JSON.stringify({version:1,order:["pinot","grenache","rosso","malbec","chianti","tempranillo","cabernet","merlot"],index:0,started:true,finished:false,revealed:["pinot"],notes:{},transcripts:{pinot:[{role:"Script",text:"Pinot Noir is the revealed grape."}]}}));
 });
 await page.goto("/");await expect(page.getByRole("heading",{name:"Let the glass speak."})).toBeVisible();
 await expect(page.getByText("Transcript (0)",{exact:true})).toBeVisible();
 await page.getByText("Transcript (0)",{exact:true}).click();
 await expect(page.getByText("Pinot Noir is the revealed grape.",{exact:true})).toHaveCount(0);
 await expect(page.getByRole("button",{name:"Next wine",exact:true})).toBeEnabled();
});
test("saved blind guesses and scores never enter live AI requests",async({page})=>{
 await page.route("**/api/host",r=>r.fulfill({json:{demo:false,unlocked:true}}));
 await page.addInitScript(()=>{
  Object.defineProperty(navigator.mediaDevices,"getUserMedia",{value:()=>Promise.resolve({getTracks:()=>[{enabled:false,stop(){}}],getAudioTracks:()=>[]})});
 });
 const payloads:unknown[]=[];
 await page.route("**/api/voice",r=>{payloads.push(r.request().postDataJSON());return r.fulfill({status:503,json:{error:"Test service unavailable."}});});
 await page.goto("/");await page.getByRole("button",{name:"Start tasting",exact:true}).click();
 await page.getByLabel("Your table’s grape guess").fill("Pinot Noir");
 await page.getByLabel("Your table’s score").selectOption("9");
 await page.getByRole("button",{name:"Ask sommelier",exact:true}).click();
 await expect(page.getByRole("status")).toContainText("Test service unavailable");
 await page.getByRole("button",{name:"Next wine",exact:true}).click();
 await page.getByRole("button",{name:"Ask sommelier",exact:true}).click();
 await expect(page.getByRole("status")).toContainText("Test service unavailable");
 expect(payloads).toEqual([{mode:"blind"},{mode:"blind"}]);
});
