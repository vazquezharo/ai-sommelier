import {test,expect} from "@playwright/test";
test("simulated WebRTC PTT, Stop, reconnect, reveal and fresh blind context",async({page})=>{
 const payloads:unknown[]=[];
 await page.route("**/api/host",route=>route.fulfill({json:{demo:false,unlocked:true}}));
 await page.route("**/api/voice",route=>{payloads.push(route.request().postDataJSON());return route.fulfill({json:{value:"ek_simulated",model:"gpt-realtime-2.1"}});});
 await page.route("https://api.openai.com/v1/realtime/calls",route=>route.fulfill({body:"simulated-sdp",contentType:"application/sdp"}));
 await page.addInitScript(()=>{
  const state={enabled:false,stopped:0,closed:0,stale:null as null|((e:{data:string})=>void),channel:null as null|MockChannel};
  (window as unknown as {voiceTest:typeof state}).voiceTest=state;
  const track={get enabled(){return state.enabled;},set enabled(v:boolean){state.enabled=v;},stop:()=>{state.stopped++;state.enabled=false;}};
  Object.defineProperty(navigator.mediaDevices,"getUserMedia",{value:()=>Promise.resolve({getTracks:()=>[track],getAudioTracks:()=>[track]})});
  class MockChannel{
   readyState="open";onmessage:((e:{data:string})=>void)|null=null;onclose:(()=>void)|null=null;
   send(data:string){const e=JSON.parse(data);if(e.type==="response.create"){state.stale=this.onmessage;setTimeout(()=>{this.onmessage?.({data:JSON.stringify({type:"response.created"})});this.onmessage?.({data:JSON.stringify({type:"response.output_audio_transcript.done",transcript:"Tannin feels drying, like strong tea."})});},10);}}
   close(){this.readyState="closed";}
  }
  class MockPeer{
   connectionState="connected";ontrack:null=null;onconnectionstatechange:null=null;channel=new MockChannel();
   createDataChannel(){state.channel=this.channel;return this.channel;}
   addTrack(){}
   async createOffer(){return {sdp:"simulated-offer"};}
   async setLocalDescription(){}
   async setRemoteDescription(){this.channel.onmessage?.({data:JSON.stringify({type:"session.created"})});}
   close(){state.closed++;}
  }
  Object.defineProperty(window,"RTCPeerConnection",{value:MockPeer});
 });
 await page.goto("/");await page.getByRole("button",{name:"Start tasting",exact:true}).click();
 await page.getByRole("button",{name:"Ask sommelier",exact:true}).click();
 await expect(page.getByText("Ready · microphone off",{exact:true})).toBeVisible();
 expect(await page.evaluate(()=>(window as unknown as {voiceTest:{enabled:boolean}}).voiceTest.enabled)).toBeFalsy();
 const ptt=page.getByRole("button",{name:"Hold to ask · release to send"});const box=(await ptt.boundingBox())!;
 await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
 await expect(page.getByText("Listening to your question",{exact:true})).toBeVisible();
 expect(await page.evaluate(()=>(window as unknown as {voiceTest:{enabled:boolean}}).voiceTest.enabled)).toBeTruthy();
 await page.waitForTimeout(300);await page.mouse.up();
 await expect(page.getByText("Sommelier speaking · microphone off",{exact:true})).toBeVisible();
 expect(await page.evaluate(()=>(window as unknown as {voiceTest:{enabled:boolean}}).voiceTest.enabled)).toBeFalsy();
 await page.getByRole("button",{name:"Stop speaking"}).click();await expect(page.getByText("Microphone off",{exact:true})).toBeVisible();
 expect(await page.evaluate(()=>(window as unknown as {voiceTest:{stopped:number}}).voiceTest.stopped)).toBeGreaterThan(0);
 await page.getByRole("button",{name:"Ask sommelier",exact:true}).click();await expect(page.getByText("Ready · microphone off",{exact:true})).toBeVisible();
 await page.getByRole("button",{name:"Reveal wine",exact:true}).click();
 await page.getByRole("button",{name:"Ask sommelier",exact:true}).click();await expect(page.getByText("Ready · microphone off",{exact:true})).toBeVisible();
 await page.getByRole("button",{name:"Next wine",exact:true}).click();
 await page.evaluate(()=>(window as unknown as {voiceTest:{stale:((e:{data:string})=>void)|null}}).voiceTest.stale?.({data:JSON.stringify({type:"response.output_audio_transcript.done",transcript:"OLD WINE SPOILER"})}));
 await page.getByRole("button",{name:"Ask sommelier",exact:true}).click();await expect(page.getByText("Ready · microphone off",{exact:true})).toBeVisible();
 expect(payloads).toEqual([{mode:"blind"},{mode:"blind"},{mode:"revealed",id:"pinot"},{mode:"blind"}]);
 await expect(page.getByText("Transcript (0)",{exact:true})).toBeVisible();
 await expect(page.getByText("OLD WINE SPOILER",{exact:true})).not.toBeVisible();
 await page.getByRole("button",{name:"End voice session",exact:true}).click();
});
