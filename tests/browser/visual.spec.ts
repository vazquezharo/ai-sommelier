import {test,expect} from "@playwright/test";
test("mobile and desktop layout screenshots",async({page},info)=>{
 await page.goto("/");await page.locator("#reveal-mode").selectOption("each");await expect(page.getByRole("heading",{name:"Set the table."})).toBeVisible();
 await info.attach("mobile-setup",{body:await page.screenshot({fullPage:true}),contentType:"image/png"});
 await page.getByRole("button",{name:"Start tasting",exact:true}).click();
 await info.attach("mobile-blind",{body:await page.screenshot({fullPage:true}),contentType:"image/png"});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBeTruthy();
 await page.getByRole("button",{name:"Reveal wine",exact:true}).click();
 await info.attach("mobile-reveal",{body:await page.screenshot({fullPage:true}),contentType:"image/png"});
 await page.setViewportSize({width:1440,height:1000});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBeTruthy();
 await info.attach("desktop-reveal",{body:await page.screenshot({fullPage:true}),contentType:"image/png"});
});
