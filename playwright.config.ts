import {defineConfig,devices} from "@playwright/test";
export default defineConfig({
 testDir:"./tests/browser",
 use:{baseURL:"http://127.0.0.1:3000",...devices["iPhone 13"],browserName:"chromium",channel:"chrome",trace:"retain-on-failure"},
 webServer:{command:"npm run start",url:"http://127.0.0.1:3000",reuseExistingServer:!process.env.CI,timeout:120000,env:{OPENAI_API_KEY:"test-only-no-upstream-access",HOST_ACCESS_CODE:"test-host-code",HOST_SESSION_SECRET:"test-only-cookie-signing-secret-for-ci-32"}},
 reporter:[["list"],["html",{open:"never"}]]
});
