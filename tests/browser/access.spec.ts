import {test,expect} from "@playwright/test";import {authenticate} from "../fixtures";
const origin="https://localhost:3443";
test("private key, lineup, reveal and speech endpoints require host authorization",async({request})=>{
 for(const path of ["tasting","lineup","audio","question"]){
  const r=path==="tasting"?await request.get("/api/"+path):await request.post("/api/"+path,{headers:{Origin:origin},data:{kind:"overview",handle:"pinot"}});
  expect(r.status()).toBe(401);
 }
 expect((await request.get("/source.json")).status()).toBe(404);
 expect((await request.get("/data/wines.json")).status()).toBe(404);
 expect((await request.post("/api/voice",{data:{mode:"blind"}})).status()).toBe(410);
});
test("server rejects blind overview, payload identities, premature reveals and cross-origin changes",async({request})=>{
 await authenticate(request);const initial=await request.get("/api/tasting");const state=await initial.json();
 expect(JSON.stringify(state)).not.toMatch(/Pinot|Grenache|Francis|Jupiter|Montepulciano/);
 const handle=state.order[0];expect(handle).toMatch(/^[a-f0-9]{32}$/);
 const audio=await request.post("/api/audio",{headers:{Origin:origin},data:{kind:"overview",handle}});expect(audio.status()).toBe(403);
 expect((await request.post("/api/audio",{headers:{Origin:origin},data:{kind:"hint",id:"pinot"}})).status()).toBe(403);
 expect((await request.post("/api/question",{headers:{Origin:origin},data:{question:"What is tannin?",id:"pinot"}})).status()).toBe(400);
 expect((await request.post("/api/tasting",{headers:{Origin:origin},data:{action:"reveal",handle}})).status()).toBe(400);
 expect((await request.post("/api/tasting",{headers:{Origin:"https://foreign.example"},data:{action:"start",mode:"each"}})).status()).toBe(403);
});
test("explicit server reveal unlocks only that overview and survives refresh",async({request})=>{
 await authenticate(request);let state=await (await request.get("/api/tasting")).json();
 const headers={Origin:origin};await request.post("/api/tasting",{headers,data:{action:"start",mode:"each"}});
 state=await (await request.post("/api/tasting",{headers,data:{action:"reveal",handle:state.order[0]}})).json();
 expect(Object.keys(state.revealed)).toEqual([state.order[0]]);
 expect((await request.post("/api/audio",{headers,data:{kind:"overview",handle:state.order[1]}})).status()).toBe(403);
 const overview=await request.post("/api/audio",{headers,data:{kind:"overview",handle:state.order[0]}});expect(overview.status()).toBe(200);
 expect(overview.headers()["cache-control"]).toBe("no-store");
 const refreshed=await (await request.get("/api/tasting")).json();expect(Object.keys(refreshed.revealed)).toHaveLength(1);
});
test("signed and encrypted cookies have secure flags and malformed cookies fail closed",async({request})=>{
 const login=await request.post("/api/host",{headers:{Origin:origin,"x-forwarded-for":"192.0.2.210"},data:{code:"test-host-code"}});
 const cookie=login.headers()["set-cookie"];expect(cookie).toContain("HttpOnly");expect(cookie).toContain("Secure");expect(cookie).toContain("SameSite=strict");
 const tasting=await request.get("/api/tasting");const encrypted=tasting.headers()["set-cookie"];expect(encrypted).toContain("HttpOnly");expect(encrypted).not.toMatch(/pinot|grenache/);
 const bad=await request.get("/api/host",{headers:{Cookie:"sommelier-host=bad.1234.invalid"}});expect((await bad.json()).unlocked).toBe(false);
});
test("host auth attempts are limited and rejected values are never echoed",async({request})=>{
 let status=0;for(let i=0;i<11;i++)status=(await request.post("/api/host",{headers:{Origin:origin,"x-forwarded-for":"192.0.2.211"},data:{code:"wrong"}})).status();expect(status).toBe(429);
 const r=await request.post("/api/host",{headers:{Origin:origin,"x-forwarded-for":"192.0.2.212","Content-Type":"application/json"},data:'{"secret":"encoded identity"'});expect(JSON.stringify(await r.json())).not.toContain("encoded identity");
});

test("expired authentication fails closed without discarding the encrypted tasting",async({request})=>{
 await authenticate(request);const before=await (await request.get("/api/tasting")).json();
 const crypto=await import("node:crypto");const value="a".repeat(32)+"."+String(Date.now()-10000);const sig=crypto.createHmac("sha256","test-only-cookie-signing-secret-for-ci-32").update(value).digest("hex");
 const status=await request.get("/api/host",{headers:{Cookie:"sommelier-host="+value+"."+sig}});expect((await status.json()).unlocked).toBe(false);
 await authenticate(request);const after=await (await request.get("/api/tasting")).json();expect(after.sessionId).toBe(before.sessionId);expect(after.order).toEqual(before.order);
});
