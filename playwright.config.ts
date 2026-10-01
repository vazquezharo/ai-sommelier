import {defineConfig,devices} from "@playwright/test";
export default defineConfig({
 testDir:"./tests/browser",workers:1,
 use:{baseURL:"https://localhost:3443",ignoreHTTPSErrors:true,...devices["iPhone 13"],browserName:process.env.SOMMELIER_BROWSER==="webkit"?"webkit":"chromium",channel:process.env.SOMMELIER_BROWSER==="webkit"?undefined:"chrome",trace:"retain-on-failure"},
 webServer:{command:"node tests/start.mjs",url:"https://localhost:3443",ignoreHTTPSErrors:true,reuseExistingServer:false,timeout:120000,env:{OPENAI_API_KEY:"test-only-no-upstream-access",HOST_ACCESS_CODE:"test-host-code",HOST_SESSION_SECRET:"test-only-cookie-signing-secret-for-ci-32"}},
 reporter:[["list"],["html",{open:"never"}]]
});
