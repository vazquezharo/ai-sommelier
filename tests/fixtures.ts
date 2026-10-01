import {expect,Page,APIRequestContext} from "@playwright/test";
let attempt=20;
export async function authenticate(request:APIRequestContext){const r=await request.post("/api/host",{headers:{Origin:"https://localhost:3443","x-forwarded-for":"192.0.2."+attempt++},data:{code:"test-host-code"}});expect(r.status()).toBe(200);}
export async function host(page:Page){await authenticate(page.request);await page.goto("/");await expect(page.getByText("Host access unlocked.",{exact:true})).toHaveCount(1);return page;}
export async function start(page:Page,mode:"end"|"each"="end"){await host(page);if(mode==="each"){await page.getByText("Customize setup · host only",{exact:true}).click();await page.locator("#reveal-mode").selectOption(mode);}await page.getByRole("button",{name:"Start tasting",exact:true}).click();}
export async function typed(page:Page,question:string){const summary=page.getByText("Type a question",{exact:true});const details=summary.locator("..");if(!await details.evaluate(el=>(el as HTMLDetailsElement).open))await summary.click();await page.getByLabel("Your tasting question",{exact:true}).fill(question);await page.getByRole("button",{name:"Send question",exact:true}).click();}
export async function mockMic(page:Page,deny=false){
 await page.addInitScript((denied:boolean)=>{
  const state={enabled:false,stopped:0,ended:null as null|(()=>void),question:"What does tannin feel like?"};(window as unknown as {micTest:typeof state}).micTest=state;
  const track={get enabled(){return state.enabled;},set enabled(v:boolean){state.enabled=v;},stop(){state.stopped++;state.enabled=false;},addEventListener(type:string,handler:()=>void){if(type==="ended")state.ended=handler;}};
  // Replace the whole test interface: WebKit can return a fresh native mediaDevices object.
  Object.defineProperty(navigator,"mediaDevices",{configurable:true,value:{getUserMedia:()=>denied?Promise.reject(new DOMException("Denied","NotAllowedError")):Promise.resolve({getTracks:()=>[track]})}});
  class Recorder{
   static isTypeSupported(){return true;}state="inactive";mimeType="audio/mp4";ondataavailable:((e:{data:Blob})=>void)|null=null;onstop:(()=>void)|null=null;onerror:null=null;
   start(){this.state="recording";}stop(){this.state="inactive";this.ondataavailable?.({data:new Blob(["MOCKQUESTION:"+state.question],{type:"audio/mp4"})});this.onstop?.();}
  }
  Object.defineProperty(window,"MediaRecorder",{value:Recorder});
 },deny);
}
