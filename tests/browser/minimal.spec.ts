import {test,expect} from "@playwright/test";
test("compact blind audio controls fit the mobile screen and setup is tucked away",async({page})=>{
 await page.route("**/api/host",r=>r.fulfill({json:{demo:true,unlocked:false}}));
 await page.goto("/");await expect(page.getByRole("button",{name:"Start tasting",exact:true})).toBeVisible();
 await expect(page.getByText("St. Francis",{exact:true})).not.toBeVisible();
 await page.getByRole("button",{name:"Start tasting",exact:true}).click();
 for(const name of ["Play hint","Ask sommelier","Stop speaking","Next wine"]){
  const button=page.getByRole("button",{name:new RegExp(name)});await expect(button).toBeVisible();
  const box=(await button.boundingBox())!;expect(box.y).toBeGreaterThanOrEqual(0);expect(box.y+box.height).toBeLessThanOrEqual(page.viewportSize()!.height);expect(box.height).toBeGreaterThanOrEqual(48);
 }
 await expect(page.locator("#guess, #score")).toHaveCount(0);
 await expect(page.getByRole("button",{name:"Read tasting guide",exact:true})).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBeTruthy();
});
test("asking while locked opens host access and focuses the code without starting microphone",async({page})=>{
 await page.route("**/api/host",r=>r.fulfill({json:{demo:false,unlocked:false}}));
 await page.goto("/");await page.getByRole("button",{name:"Start tasting",exact:true}).click();
 await page.getByRole("button",{name:"Ask sommelier",exact:true}).click();
 await expect(page.getByLabel("Host access code", {exact:true})).toBeFocused();
 await expect(page.getByRole("status")).toContainText("Enter your host code once");
});
test("old local scorecard entries remain private and have no controls or results",async({page})=>{
 await page.addInitScript(()=>{
  localStorage.setItem("ai-sommelier-v1",JSON.stringify({version:1,order:["pinot","grenache","rosso","malbec","chianti","tempranillo","cabernet","merlot"],index:7,started:true,finished:true,revealMode:"end",revealed:[],notes:{},transcripts:{},scores:{pinot:9},guesses:{pinot:"PRIVATE OLD GUESS"}}));
 });
 await page.goto("/");await expect(page.getByText("PRIVATE OLD GUESS",{exact:true})).toHaveCount(0);
 await expect(page.getByText(/Score:/)).toHaveCount(0);
 await page.getByRole("button",{name:"Reveal the lineup",exact:true}).click();
 await expect(page.getByText("PRIVATE OLD GUESS",{exact:true})).toHaveCount(0);
 await expect(page.getByText(/Score:/)).toHaveCount(0);
 await expect(page.getByText(/St. Francis — Pinot Noir/)).toBeVisible();
});
