import {test,expect} from "@playwright/test";import {start} from "../fixtures";
test("mobile controls, keyboard focus, labels and screenshots",async({page},info)=>{
 await start(page);
 for(const name of ["Play hint","Ask sommelier","Stop speaking","Next wine"]){const control=page.getByRole("button",{name:new RegExp(name)});const box=(await control.boundingBox())!;expect(box.height).toBeGreaterThanOrEqual(48);expect(box.y+box.height).toBeLessThanOrEqual(page.viewportSize()!.height);}
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 await info.attach("mobile-blind",{body:await page.screenshot({fullPage:true}),contentType:"image/png"});
 await page.getByRole("button",{name:"Play hint"}).focus();await expect(page.getByRole("button",{name:"Play hint"})).toBeFocused();
 await page.getByText("Type a question",{exact:true}).click();await page.getByLabel("Your tasting question",{exact:true}).fill("What is body?");await expect(page.getByRole("button",{name:"Send question",exact:true})).toBeEnabled();
 await page.setViewportSize({width:1440,height:1000});await info.attach("desktop-blind",{body:await page.screenshot({fullPage:true}),contentType:"image/png"});
});
