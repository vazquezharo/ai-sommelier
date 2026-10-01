import "server-only";
import {openAIKey} from "./access";
// Mock is usable only inside CI with explicit opt-in. Production defaults to OpenAI.
export function providerURL(path:string){const base=process.env.CI==="true"&&process.env.SOMMELIER_TEST_MODE==="1"?"http://127.0.0.1:4001/v1":"https://api.openai.com/v1";return base+path;}
export function providerHeaders(){return {Authorization:"Bearer "+openAIKey()};}
