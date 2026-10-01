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

test("primary colors meet WCAG text contrast and status uses text, not color alone",async({page})=>{
 await start(page);
 const ratio=await page.getByRole("button",{name:"Ask sommelier",exact:true}).evaluate(el=>{
  const style=getComputedStyle(el);const luminance=(color:string)=>{const rgb=color.match(/[\d.]+/g)!.slice(0,3).map(v=>{const s=Number(v)/255;return s<=0.04045?s/12.92:Math.pow((s+0.055)/1.055,2.4);});return rgb[0]*0.2126+rgb[1]*0.7152+rgb[2]*0.0722;};
  const a=luminance(style.color),b=luminance(style.backgroundColor);return (Math.max(a,b)+0.05)/(Math.min(a,b)+0.05);
 });expect(ratio).toBeGreaterThanOrEqual(4.5);await expect(page.getByText("Microphone off",{exact:true})).toBeVisible();
});
