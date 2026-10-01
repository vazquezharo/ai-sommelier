import {test,expect} from "@playwright/test";import {readdirSync,readFileSync,existsSync} from "node:fs";import {join} from "node:path";
const identities=["St. Francis","Halos de Jupiter","Rosso di Montepulciano","La Enfermera","Kendall-Jackson","Baruffo Chianti Classico"];
function files(dir:string):string[]{return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(join(dir,e.name)):[join(dir,e.name)]);}
test("production browser chunks and public assets have no answer key or long-lived key",()=>{
 const chunks=files(".next/static").filter(p=>/\.js$|\.json$/.test(p));
 for(const file of chunks){const text=readFileSync(file,"utf8");for(const name of identities)expect(text.includes(name),file+" contains "+name).toBe(false);expect(text.includes("test-only-no-upstream-access")).toBe(false);}
 expect(existsSync("public/source.json")).toBe(false);expect(existsSync("public/audio")).toBe(false);
});
test("unauthenticated HTML, anonymous payloads, localStorage and errors reveal no answer",async({page})=>{
 const bodies:string[]=[];page.on("response",async r=>{if(r.url().includes("/api/")&&r.status()<400)try{bodies.push(await r.text());}catch{}});
 await page.goto("/");await page.getByRole("button",{name:"Start tasting",exact:true}).click();await page.getByText("Customize setup · host only",{exact:true}).count();
 const html=await page.content();const stored=await page.evaluate(()=>localStorage.getItem("ai-sommelier-v2"));
 for(const identity of identities){expect(html).not.toContain(identity);expect(stored||"").not.toContain(identity);expect(bodies.join(" ")).not.toContain(identity);}
 await page.getByText("Host settings & access",{exact:true}).click();await page.getByRole("button",{name:"Host-only lineup",exact:true}).last().click();await expect(page.getByText(/Unlock host access to view the lineup/)).toBeVisible();
});
