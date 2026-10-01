import {test,expect} from "@playwright/test";
const origin="http://127.0.0.1:3000";
test("paid routes reject unauthenticated and cross-origin requests",async({request})=>{
 for(const route of ["voice","audio"]){
  const denied=await request.post("/api/"+route,{headers:{Origin:origin},data:route==="voice"?{mode:"blind"}:{kind:"hint"}});
  expect(denied.status()).toBe(401);
  const foreign=await request.post("/api/"+route,{headers:{Origin:"https://untrusted.example"},data:{}});
  expect(foreign.status()).toBe(403);
 }
});
test("host code issues a private signed cookie and invalid code is rejected",async({request})=>{
 const invalid=await request.post("/api/host",{headers:{Origin:origin,"x-forwarded-for":"192.0.2.10"},data:{code:"wrong"}});
 expect(invalid.status()).toBe(401);
 const valid=await request.post("/api/host",{headers:{Origin:origin,"x-forwarded-for":"192.0.2.11"},data:{code:"test-host-code"}});
 expect(valid.status()).toBe(200);
 const cookie=valid.headers()["set-cookie"];
 expect(cookie).toContain("HttpOnly");expect(cookie).toContain("Secure");expect(cookie).toContain("SameSite=strict");
});
test("host authentication attempts are rate limited",async({request})=>{
 let last=0;
 for(let i=0;i<11;i++){
  const r=await request.post("/api/host",{headers:{Origin:origin,"x-forwarded-for":"192.0.2.12"},data:{code:"wrong"}});
  last=r.status();
 }
 expect(last).toBe(429);
});
test("no identifying extra fields are accepted in blind requests even for authenticated host",async({request})=>{
 const login=await request.post("/api/host",{headers:{Origin:origin,"x-forwarded-for":"192.0.2.13"},data:{code:"test-host-code"}});
 const token=login.headers()["set-cookie"]?.match(/sommelier-host=([^;]+)/)?.[1];
 expect(token).toBeTruthy();
 const r=await request.post("/api/voice",{headers:{Origin:origin,Cookie:"sommelier-host="+token},data:{mode:"blind",id:"pinot"}});
 expect(r.status()).toBe(400);
 expect(await r.json()).toEqual({error:"Blind requests must contain only mode."});
});

test("malformed host cookies fail closed without a server error",async({request})=>{
 const r=await request.get("/api/host",{headers:{Cookie:"sommelier-host=bad.1234.invalid"}});
 expect(r.status()).toBe(200);expect((await r.json()).unlocked).toBe(false);
});
