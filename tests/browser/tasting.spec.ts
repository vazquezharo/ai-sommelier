import {test,expect} from "@playwright/test";import {start,host} from "../fixtures";
test("all eight opaque blind rounds, finish, final reveal and resume",async({page})=>{
 await start(page);for(let i=0;i<8;i++){
 await expect(page.getByText("WINE "+(i+1)+" OF 8",{exact:true})).toBeVisible();await expect(page.getByRole("heading",{name:"Let the glass speak."})).toBeVisible();
 await expect(page.getByText("Pinot Noir",{exact:true})).toHaveCount(0);await page.getByRole("button",{name:i===7?"Finish tasting":"Next wine",exact:true}).click();}
 await expect(page.getByRole("heading",{name:"A toast to curiosity."})).toBeVisible();await page.getByRole("button",{name:"Reveal the lineup",exact:true}).click();
 await expect(page.getByText("Wine 1: St. Francis — Pinot Noir",{exact:true})).toBeVisible();await page.reload();await expect(page.getByText("Wine 1: St. Francis — Pinot Noir",{exact:true})).toBeVisible();
 await page.getByRole("button",{name:"Review the last wine",exact:true}).click();await page.getByText("Jump to wine",{exact:true}).click();await page.getByRole("button",{name:"Go to wine 1",exact:true}).click();await expect(page.getByRole("heading",{name:"Pinot Noir",exact:true})).toBeVisible();
});
test("explicit host lineup and reorder, then revealed to fresh blind round",async({page})=>{
 await host(page);await page.getByText("Customize setup · host only",{exact:true}).click();await page.locator("#reveal-mode").selectOption("each");
 await page.getByRole("button",{name:"Host-only lineup",exact:true}).first().click();await page.getByRole("button",{name:"Move wine 1 later",exact:true}).click();
 await page.getByRole("button",{name:"Start tasting",exact:true}).click();await page.getByRole("button",{name:"Reveal wine",exact:true}).click();await expect(page.getByRole("heading",{name:"Grenache",exact:true})).toBeVisible();
 await page.getByText("Tasting notes",{exact:true}).click();await page.getByLabel("What did your table notice?",{exact:true}).fill("Fresh texture");
 await page.reload();await expect(page.getByRole("heading",{name:"Grenache",exact:true})).toBeVisible();await page.getByText("Tasting notes",{exact:true}).click();await expect(page.getByLabel("What did your table notice?",{exact:true})).toHaveValue("Fresh texture");
 await page.getByRole("button",{name:"Next wine",exact:true}).click();await expect(page.getByRole("heading",{name:"Let the glass speak."})).toBeVisible();await expect(page.getByRole("heading",{name:"Pinot Noir"})).toHaveCount(0);
});
test("fake local reveal state cannot fetch or show an unrevealed identity",async({page})=>{
 await start(page);await page.evaluate(()=>{const p=JSON.parse(localStorage.getItem("ai-sommelier-v2")!);p.revealed=["pinot"];p.wine={name:"Pinot Noir"};localStorage.setItem("ai-sommelier-v2",JSON.stringify(p));});await page.reload();
 await expect(page.getByRole("heading",{name:"Let the glass speak."})).toBeVisible();await expect(page.getByRole("heading",{name:"Pinot Noir"})).toHaveCount(0);
});
test("demo is honest and anonymous; private controls are locked",async({page})=>{
 await page.route("**/api/host",r=>r.fulfill({json:{demo:true,unlocked:false,hostConfigured:false,missing:[]}}));await page.goto("/");await page.getByRole("button",{name:"Start tasting",exact:true}).click();await page.getByRole("button",{name:"Play hint"}).click();await expect(page.getByText(/Demo mode: generated audio is unavailable/)).toBeVisible();await expect(page.getByText(/Look at the color, then take/)).toBeVisible();
 await page.getByRole("button",{name:"Ask sommelier",exact:true}).click();await expect(page.getByText(/No answers are simulated/)).toBeVisible();await expect(page.getByText("Pinot Noir",{exact:true})).toHaveCount(0);
});
