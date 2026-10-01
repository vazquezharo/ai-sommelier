import {test} from "node:test";
import assert from "node:assert/strict";
import {resolveConfiguration} from "../lib/config";
test("custom Vercel names enable server configuration",()=>{
 const c=resolveConfiguration({Open_AI_Key:"test-only-api",Host_Access_Code:"test-code",HOST_SESSION_SECRET:"test-secret"});
 assert.equal(c.apiKey,"test-only-api");assert.equal(c.hostAccessCode,"test-code");assert.deepEqual(c.missing,[]);
});
test("standard names take precedence and blank standard names allow aliases",()=>{
 const c=resolveConfiguration({OPENAI_API_KEY:"standard-api",Open_AI_Key:"alias-api",HOST_ACCESS_CODE:"standard-code",Host_Access_Code:"alias-code",HOST_SESSION_SECRET:"secret"});
 assert.equal(c.apiKey,"standard-api");assert.equal(c.hostAccessCode,"standard-code");
 const fallback=resolveConfiguration({OPENAI_API_KEY:" ",Open_AI_Key:"alias-api",HOST_ACCESS_CODE:"",Host_Access_Code:"alias-code"});
 assert.equal(fallback.apiKey,"alias-api");assert.equal(fallback.hostAccessCode,"alias-code");assert.deepEqual(fallback.missing,["HOST_SESSION_SECRET"]);
});
test("diagnostics list missing names without revealing configured secrets",()=>{
 const c=resolveConfiguration({Open_AI_Key:"test-only-private-api"});
 assert.deepEqual(c.missing,["HOST_ACCESS_CODE or Host_Access_Code","HOST_SESSION_SECRET"]);
 assert.ok(!JSON.stringify(c.missing).includes(c.apiKey));
});
