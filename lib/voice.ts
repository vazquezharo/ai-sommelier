export type VoiceState="off"|"connecting"|"ready"|"listening"|"speaking"|"error";
type Callbacks={state:(s:VoiceState)=>void;message:(s:string)=>void;transcript:(role:string,text:string)=>void;audioBlocked:()=>void};
export class Voice {
 private pc:RTCPeerConnection|null=null;
 private dc:RTCDataChannel|null=null;
 private stream:MediaStream|null=null;
 private abort:AbortController|null=null;
 private epoch=0;
 private pressTime=0;
 private listening=false;
 private responseActive=false;
 private partialTranscript="";
 private questionTimer:ReturnType<typeof setTimeout>|null=null;
 private sessionTimer:ReturnType<typeof setTimeout>|null=null;
 private disconnectTimer:ReturnType<typeof setTimeout>|null=null;
 private audio:HTMLAudioElement;
 constructor(audio:HTMLAudioElement,private cb:Callbacks){this.audio=audio;}
 private emit(s:VoiceState){this.cb.state(s);}
 private send(event:Record<string,unknown>){if(this.dc?.readyState==="open")this.dc.send(JSON.stringify(event));}
 close(){
  ++this.epoch;this.abort?.abort();
  if(this.partialTranscript){this.cb.transcript("Sommelier (interrupted)",this.partialTranscript);this.partialTranscript="";}this.abort=null;
  if(this.questionTimer)clearTimeout(this.questionTimer);
  if(this.sessionTimer)clearTimeout(this.sessionTimer);
  if(this.disconnectTimer)clearTimeout(this.disconnectTimer);
  this.stream?.getTracks().forEach(t=>{t.enabled=false;t.stop();});this.stream=null;
  if(this.pc){this.pc.ontrack=null;this.pc.onconnectionstatechange=null;}
  if(this.dc){this.dc.onmessage=null;this.dc.onclose=null;this.dc.close();}
  this.pc?.close();this.pc=null;this.dc=null;this.listening=false;this.responseActive=false;
  this.audio.pause();this.audio.srcObject=null;this.emit("off");
 }
 async connect(){
  this.close();const epoch=this.epoch;this.emit("connecting");
  this.abort=new AbortController();const signal=this.abort.signal;
  let connectionTimeout:ReturnType<typeof setTimeout>|undefined;
  try{
   if(!window.isSecureContext || !navigator.mediaDevices?.getUserMedia)throw Error("Microphone needs Safari over HTTPS. Written notes are still available.");
   // Acquire permission directly from the host gesture; disable all tracks before connecting.
   const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
   stream.getTracks().forEach(t=>t.enabled=false);
   if(epoch!==this.epoch){stream.getTracks().forEach(t=>t.stop());return;}
   this.stream=stream;
   const r=await fetch("/api/voice",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({mode:"blind"}),signal});
   const token=await r.json();if(!r.ok)throw Error(token.error || "Voice is unavailable.");
   if(epoch!==this.epoch)return;
   const pc=new RTCPeerConnection();this.pc=pc;
   stream.getAudioTracks().forEach(t=>pc.addTrack(t,stream));
   const dc=pc.createDataChannel("oai-events");this.dc=dc;
   pc.ontrack=e=>{if(epoch!==this.epoch)return;this.audio.srcObject=e.streams[0];this.audio.play().catch(()=>this.cb.audioBlocked());};
   const ready=new Promise<void>((resolve,reject)=>{
    connectionTimeout=setTimeout(()=>reject(Error("Voice connection timed out. Try connecting again.")),20000);
    dc.onmessage=e=>{
     if(epoch!==this.epoch)return;
     let event;try{event=JSON.parse(e.data);}catch{return;}
     if(event.type==="session.created"){resolve();this.emit("ready");}
     if(event.type==="response.created"){this.responseActive=true;this.emit("speaking");}
     if(event.type==="output_audio_buffer.started"){this.emit("speaking");}
     if(event.type==="output_audio_buffer.stopped"){this.responseActive=false;this.emit("ready");}
     if(event.type==="response.done" && event.response?.status!=="completed"){this.responseActive=false;this.emit("ready");}
     if(event.type==="response.output_audio_transcript.delta" && event.delta)this.partialTranscript+=event.delta;
     if(event.type==="response.output_audio_transcript.done" && event.transcript){this.cb.transcript("Sommelier",event.transcript);this.partialTranscript="";}
     if(event.type==="conversation.item.input_audio_transcription.completed" && event.transcript)this.cb.transcript("Guest",event.transcript);
     if(event.type==="error"){
      const detail=event.error?.message || "Voice service error.";
      reject(Error(detail));this.close();this.emit("error");this.cb.message(detail);
     }
    };
    dc.onclose=()=>{if(epoch===this.epoch){reject(Error("Voice disconnected."));this.close();this.emit("error");this.cb.message("Voice disconnected. Ask sommelier to reconnect.");}};
   });
   void ready.catch(()=>{});
   pc.onconnectionstatechange=()=>{
    if(epoch!==this.epoch)return;
    if(pc.connectionState==="connected" && this.disconnectTimer){clearTimeout(this.disconnectTimer);this.disconnectTimer=null;}
    if(pc.connectionState==="disconnected")this.disconnectTimer=setTimeout(()=>{if(epoch===this.epoch){this.close();this.emit("error");this.cb.message("Voice disconnected. Reconnect when ready.");}},5000);
    if(pc.connectionState==="failed"){this.close();this.emit("error");this.cb.message("Voice connection failed. Try again.");}
   };
   const offer=await pc.createOffer();await pc.setLocalDescription(offer);
   const answer=await fetch("https://api.openai.com/v1/realtime/calls",{method:"POST",headers:{Authorization:"Bearer "+token.value,"Content-Type":"application/sdp"},body:offer.sdp,signal});
   if(!answer.ok)throw Error("Voice handshake failed ("+answer.status+"). Try again.");
   const sdp=await answer.text();if(epoch!==this.epoch)return;
   await pc.setRemoteDescription({type:"answer",sdp});await ready;
   if(connectionTimeout)clearTimeout(connectionTimeout);
   if(epoch!==this.epoch)return;
   this.sessionTimer=setTimeout(()=>{this.close();this.cb.message("Ten-minute voice session ended. Reconnect to ask more.");},10*60*1000);
  }catch(e){
   if(connectionTimeout)clearTimeout(connectionTimeout);
   if(epoch!==this.epoch)return;
   this.close();this.emit("error");
   this.cb.message(e instanceof DOMException && e.name==="NotAllowedError"?"Microphone access was denied. Allow it in Safari’s website settings, then reconnect. You can still use every written script.":e instanceof Error?e.message:"Voice unavailable.");
  }
 }
 begin(){
  if(!this.stream||this.dc?.readyState!=="open"||this.listening||this.responseActive)return;
  this.send({type:"input_audio_buffer.clear"});this.pressTime=Date.now();this.listening=true;
  this.stream.getAudioTracks().forEach(t=>t.enabled=true);this.emit("listening");
  this.questionTimer=setTimeout(()=>this.finish(),30000);
 }
 finish(cancel=false){
  if(!this.listening)return;
  this.listening=false;this.stream?.getTracks().forEach(t=>t.enabled=false);
  if(this.questionTimer)clearTimeout(this.questionTimer);
  if(cancel || Date.now()-this.pressTime<250){this.send({type:"input_audio_buffer.clear"});this.emit("ready");return;}
  // Commit a single explicit PTT turn; VAD and automatic response creation are disabled.
  this.responseActive=true;this.send({type:"input_audio_buffer.commit"});this.send({type:"response.create"});this.emit("speaking");
 }
 // Stop closes the entire connection so late packets cannot restart playback or spoil another round.
 stop(){this.send({type:"response.cancel"});this.send({type:"output_audio_buffer.clear"});this.close();}
}
