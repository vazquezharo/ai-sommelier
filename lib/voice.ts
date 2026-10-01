import {answers,AnswerId} from "./guidance";
export type VoiceState="off"|"connecting"|"ready"|"listening"|"processing"|"speaking"|"error";
type Callbacks={state:(s:VoiceState)=>void;message:(s:string)=>void;transcript:(role:string,text:string)=>void;audioBlocked:()=>void;authRequired?:()=>void};
export class Voice{
 private stream:MediaStream|null=null;private recorder:MediaRecorder|null=null;private abort:AbortController|null=null;
 private epoch=0;private chunks:Blob[]=[];private listening=false;private responseActive=false;private pressTime=0;
 private questionTimer:ReturnType<typeof setTimeout>|null=null;private sessionTimer:ReturnType<typeof setTimeout>|null=null;
 private lastTicket:string|null=null;private url:string|null=null;private state:VoiceState="off";
 constructor(private audio:HTMLAudioElement,private cb:Callbacks,private bottleId:string|null=null){}
 private emit(s:VoiceState){this.state=s;this.cb.state(s);}
 close(){
  ++this.epoch;this.abort?.abort();this.abort=null;if(this.questionTimer)clearTimeout(this.questionTimer);if(this.sessionTimer)clearTimeout(this.sessionTimer);
  if(this.recorder){this.recorder.ondataavailable=null;this.recorder.onstop=null;this.recorder.onerror=null;if(this.recorder.state!=="inactive")try{this.recorder.stop();}catch{}}
  this.lastTicket=null;this.recorder=null;this.stream?.getTracks().forEach(t=>{t.enabled=false;t.stop();});this.stream=null;this.chunks=[];this.listening=false;this.responseActive=false;
  this.audio.onended=null;this.audio.onerror=null;this.audio.pause();this.audio.removeAttribute("src");this.audio.load();if(this.url)URL.revokeObjectURL(this.url);this.url=null;this.emit("off");
 }
 stop(){this.close();}
 async connect(){
  this.close();const epoch=this.epoch;this.emit("connecting");
  try{
   if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==="undefined")throw Error("Recording needs a supported browser over HTTPS. You can type a question.");
   const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
   stream.getTracks().forEach(t=>t.enabled=false);if(epoch!==this.epoch){stream.getTracks().forEach(t=>t.stop());return;}
   this.stream=stream;stream.getTracks().forEach(t=>t.addEventListener?.("ended",()=>{if(epoch===this.epoch){this.close();this.emit("error");this.cb.message("Microphone disconnected. Reconnect or type a question.");}}));
   this.emit("ready");this.sessionTimer=setTimeout(()=>{this.close();this.cb.message("Voice session ended. Reconnect when ready.");},10*60*1000);
  }catch(e){if(epoch!==this.epoch)return;this.close();this.emit("error");this.cb.message(e instanceof DOMException&&e.name==="NotAllowedError"?"Microphone access was denied. Allow it in Safari’s website settings, or type a question.":e instanceof Error?e.message:"Recording unavailable. Type a question.");}
 }
 begin(){
  if(!this.stream||this.listening||this.responseActive||this.state!=="ready")return;
  const epoch=this.epoch;this.chunks=[];
  try{
   const mime=["audio/mp4","audio/webm;codecs=opus","audio/webm"].find(m=>MediaRecorder.isTypeSupported(m));
   const recorder=new MediaRecorder(this.stream,mime?{mimeType:mime}:undefined);this.recorder=recorder;
   recorder.ondataavailable=e=>{if(epoch===this.epoch&&e.data.size)this.chunks.push(e.data);};
   recorder.onerror=()=>{if(epoch===this.epoch){this.close();this.emit("error");this.cb.message("Recording failed. Reconnect or type a question.");}};
   this.stream.getTracks().forEach(t=>t.enabled=true);this.listening=true;this.pressTime=Date.now();recorder.start();this.emit("listening");
   this.questionTimer=setTimeout(()=>this.finish(),30000);
  }catch{this.close();this.emit("error");this.cb.message("Recording failed. You can type a question.");}
 }
 finish(cancel=false){
  if(!this.listening||!this.recorder)return;this.listening=false;this.stream?.getTracks().forEach(t=>t.enabled=false);if(this.questionTimer)clearTimeout(this.questionTimer);
  const epoch=this.epoch,recorder=this.recorder,discard=cancel||Date.now()-this.pressTime<250;
  if(discard){recorder.ondataavailable=null;recorder.onstop=null;try{recorder.stop();}catch{}this.chunks=[];this.emit("ready");return;}
  this.responseActive=true;this.emit("processing");
  recorder.onstop=()=>{if(epoch!==this.epoch)return;const blob=new Blob(this.chunks,{type:recorder.mimeType||"audio/webm"});this.chunks=[];const data=new FormData();data.append("audio",blob,blob.type.startsWith("audio/mp4")?"question.mp4":"question.webm");void this.ask(data,epoch);};
  try{recorder.stop();}catch{this.close();this.emit("error");this.cb.message("Recording failed. Type a question.");}
 }
 async askText(question:string){
  if(this.listening||this.responseActive)return;const epoch=this.epoch;this.responseActive=true;this.emit("processing");await this.ask(JSON.stringify({question}),epoch);
 }
 private async ask(body:FormData|string,epoch:number){
  this.abort=new AbortController();const signal=this.abort.signal;
  try{
   if(this.bottleId){if(typeof body==="string")body=JSON.stringify({...JSON.parse(body),id:this.bottleId,...(this.lastTicket?{previousTicket:this.lastTicket}:{})});else{body.append("id",this.bottleId);if(this.lastTicket)body.append("previousTicket",this.lastTicket);}}
   const r=await fetch(this.bottleId?"/api/bottle/question":"/api/question",{method:"POST",headers:typeof body==="string"?{"Content-Type":"application/json"}:undefined,body,signal});
   const result=await r.json();if(epoch!==this.epoch)return;if(r.status===401){this.close();this.cb.authRequired?.();this.cb.message("Host access expired. Enter the host code again.");return;}if(!r.ok)throw Error(result.error||"Question unavailable.");
   // Exact catalog membership is a second boundary. No model prose is allowed through.
   const id=result.answerId as AnswerId;
   if(this.bottleId){
    let signedText:string|null=null;try{const bytes=Uint8Array.from(atob(result.ticket.split(".")[0].replace(/-/g,"+").replace(/_/g,"/")),c=>c.charCodeAt(0));signedText=JSON.parse(new TextDecoder().decode(bytes)).text;}catch{}
    if(result.id!==this.bottleId||typeof result.ticket!=="string"||result.ticket.length>3000||typeof result.text!=="string"||!result.text||result.text.length>1000||signedText!==result.text)throw Error("Unapproved bottle answer blocked. Reconnect and try again.");
    this.lastTicket=result.ticket;
   }else if(!Object.hasOwn(answers,id)||result.text!==answers[id])throw Error("Unapproved answer blocked. Try a general tasting question.");
   this.cb.transcript("Guest",result.question);this.cb.transcript("Sommelier",result.text);
   if(result.notice)this.cb.message(result.notice);
   if(!result.audioAvailable){this.responseActive=false;this.emit(this.stream?"ready":"off");return;}
   const speech=this.bottleId?await fetch("/api/bottle/audio",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({kind:"answer",id:this.bottleId,ticket:result.ticket}),signal}):await fetch("/api/audio",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({kind:"answer",answerId:id}),signal});
   if(epoch!==this.epoch)return;
   if(speech.status===401){this.close();this.cb.authRequired?.();this.cb.message("Host access expired. Enter the host code again.");return;}
   if(!speech.ok){const error=await speech.json();throw Error(error.error||"Audio unavailable. The reviewed answer is in the transcript.");}
   const blob=await speech.blob();if(epoch!==this.epoch)return;
   if(this.url)URL.revokeObjectURL(this.url);this.url=URL.createObjectURL(blob);this.audio.src=this.url;
   this.audio.onended=()=>{if(epoch===this.epoch){this.responseActive=false;this.emit(this.stream?"ready":"off");}};
   this.audio.onerror=()=>{if(epoch===this.epoch){this.responseActive=false;this.emit("error");this.cb.message("Audio playback failed. The reviewed answer is in the transcript.");}};
   this.emit("speaking");try{await this.audio.play();}catch{if(epoch===this.epoch){this.cb.audioBlocked();this.cb.message("Tap Enable speaker. The reviewed answer is in the transcript.");}}
  }catch(e){if(epoch!==this.epoch)return;this.responseActive=false;this.emit("error");this.cb.message(e instanceof Error?e.message:"Question unavailable. Written guidance remains available.");}
 }
}
