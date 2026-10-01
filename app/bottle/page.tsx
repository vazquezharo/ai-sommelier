"use client";
import {useEffect,useRef,useState} from "react";
import type {BottleLabel,BottleState} from "@/lib/bottle-types";
import {bottleImage} from "@/lib/bottle-image";
import {Voice,VoiceState} from "@/lib/voice";
type Entry={role:string;text:string};
const empty:BottleLabel={producer:null,name:null,grape:null,region:null,vintage:null};
const fields={producer:"Producer",name:"Wine name",grape:"Grape",region:"Region",vintage:"Vintage"} as const;
export default function BottlePage(){
 const [loaded,setLoaded]=useState(false),[demo,setDemo]=useState(true),[unlocked,setUnlocked]=useState(false),[hostConfigured,setHostConfigured]=useState(false),[code,setCode]=useState("");
 const [bottle,setBottle]=useState<BottleState|null>(null),[label,setLabel]=useState<BottleLabel>(empty),[preview,setPreview]=useState<string|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
 const [question,setQuestion]=useState(""),[voiceState,setVoiceState]=useState<VoiceState>("off"),[transcript,setTranscript]=useState<Entry[]>([]),[notes,setNotes]=useState(""),[blocked,setBlocked]=useState(false),[speaking,setSpeaking]=useState(false);
 const audio=useRef<HTMLAudioElement|null>(null),voiceAudio=useRef<HTMLAudioElement|null>(null),voice=useRef<Voice|null>(null),epoch=useRef(0),abort=useRef<AbortController|null>(null),blob=useRef<string|null>(null),previewRef=useRef<string|null>(null),codeInput=useRef<HTMLInputElement|null>(null),settings=useRef<HTMLDetailsElement|null>(null),current=useRef(bottle);
 current.current=bottle;
 function stop(){++epoch.current;abort.current?.abort();abort.current=null;voice.current?.close();voice.current=null;audio.current?.pause();if(audio.current){audio.current.removeAttribute("src");audio.current.load();}if(blob.current)URL.revokeObjectURL(blob.current);blob.current=null;setBlocked(false);setSpeaking(false);setBusy(false);setVoiceState("off");}
 function expired(){stop();setUnlocked(false);setBottle(null);setMessage("Host access expired. Enter your host code again.");}
 async function read(r:Response){const data=await r.json();if(r.status===401){expired();throw Error("Host access expired. Enter your host code again.");}if(!r.ok)throw Error(data.error||"Bottle lookup unavailable.");return data;}
 function apply(value:BottleState|null){setBottle(value);setLabel(value?.label||empty);}
 async function load(){const status=await read(await fetch("/api/host",{cache:"no-store"}));setDemo(status.demo);setUnlocked(status.unlocked);setHostConfigured(status.hostConfigured);if(status.unlocked){apply((await read(await fetch("/api/bottle",{cache:"no-store"}))).bottle);}}
 useEffect(()=>{void load().catch(e=>setMessage(e.message)).finally(()=>setLoaded(true));return()=>{++epoch.current;abort.current?.abort();voice.current?.close();if(blob.current)URL.revokeObjectURL(blob.current);if(previewRef.current)URL.revokeObjectURL(previewRef.current);};},[]);
 useEffect(()=>{if(!unlocked&&loaded&&hostConfigured){if(settings.current)settings.current.open=true;codeInput.current?.focus();}},[unlocked,loaded,hostConfigured]);
 useEffect(()=>{
  setTranscript([]);setNotes("");
  if(!bottle?.revealed)return;
  try{const saved=JSON.parse(localStorage.getItem("sommelier-photo:"+bottle.id)||"null");if(saved){setTranscript(Array.isArray(saved.transcript)?saved.transcript.slice(-80):[]);setNotes(typeof saved.notes==="string"?saved.notes:"");}}catch{}
 },[bottle?.id,bottle?.revealed]);
 useEffect(()=>{if(bottle?.revealed)try{localStorage.setItem("sommelier-photo:"+bottle.id,JSON.stringify({transcript,notes}));}catch{}},[bottle?.id,bottle?.revealed,transcript,notes]);
 useEffect(()=>{const blur=()=>voice.current?.finish(true),hidden=()=>{if(document.hidden)stop();};window.addEventListener("blur",blur);document.addEventListener("visibilitychange",hidden);return()=>{window.removeEventListener("blur",blur);document.removeEventListener("visibilitychange",hidden);};},[]);
 async function unlock(e:React.FormEvent){e.preventDefault();setMessage("");try{await read(await fetch("/api/host",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({code})}));setCode("");await load();}catch(err){setMessage(err instanceof Error?err.message:"Unlock failed.");}}
 async function scan(file:File|undefined){
  if(!file)return;stop();apply(null);setMessage("");setBusy(true);const turn=epoch.current,controller=new AbortController();abort.current=controller;
  if(previewRef.current)URL.revokeObjectURL(previewRef.current);previewRef.current=null;setPreview(null);
  try{
   const image=await bottleImage(file);if(turn!==epoch.current)return;
   const url=URL.createObjectURL(image);previewRef.current=url;setPreview(url);
   const form=new FormData();form.append("image",image,"label.jpg");
   const data=await read(await fetch("/api/bottle",{method:"POST",body:form,signal:controller.signal}));if(turn!==epoch.current)return;apply(data.bottle);setMessage("Check the label below. Leave anything unreadable unknown.");
  }catch(e){if(turn===epoch.current)setMessage(e instanceof Error?e.message:"Photo lookup failed.");}finally{if(turn===epoch.current)setBusy(false);}
 }
 async function reveal(){
  if(!bottle)return;stop();setMessage("");setBusy(true);const turn=epoch.current,controller=new AbortController();abort.current=controller;
  try{const data=await read(await fetch("/api/bottle",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"reveal",id:bottle.id,label}),signal:controller.signal}));if(turn===epoch.current)apply(data.bottle);}catch(e){if(turn===epoch.current)setMessage(e instanceof Error?e.message:"Overview unavailable.");}finally{if(turn===epoch.current)setBusy(false);}
 }
 async function clear(){
  stop();setMessage("");try{await read(await fetch("/api/bottle",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"clear"})}));apply(null);setPreview(null);if(previewRef.current)URL.revokeObjectURL(previewRef.current);previewRef.current=null;}catch(e){setMessage(e instanceof Error?e.message:"Could not close this bottle.");}
 }
 function prime(el:HTMLAudioElement|null){if(el&&!el.src){el.src="data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";void el.play().catch(()=>{});}}
 async function play(){
  if(!bottle?.revealed)return;stop();prime(audio.current);setMessage("");setBusy(true);const turn=epoch.current,controller=new AbortController();abort.current=controller;
  try{
   const r=await fetch("/api/bottle/audio",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({kind:"overview",id:bottle.id}),signal:controller.signal});
   if(!r.ok){await read(r);return;}const data=await r.blob();if(turn!==epoch.current)return;
   blob.current=URL.createObjectURL(data);const el=audio.current!;el.src=blob.current;setBusy(false);setSpeaking(true);
   el.onended=()=>{if(turn===epoch.current)setSpeaking(false);};el.onerror=()=>{if(turn===epoch.current){setSpeaking(false);setMessage("Playback failed. Read the overview below.");}};
   try{await el.play();}catch{if(turn===epoch.current)setBlocked(true);}
  }catch(e){if(turn===epoch.current)setMessage(e instanceof Error?e.message:"Audio unavailable. Read the overview below.");}finally{if(turn===epoch.current)setBusy(false);}
 }
 function newVoice(){
  const id=current.current?.id;if(!id)return null;
  const v=new Voice(voiceAudio.current!,{state:setVoiceState,message:setMessage,transcript:(role,text)=>{if(current.current?.id===id)setTranscript(t=>[...t,{role,text}].slice(-80));},audioBlocked:()=>setBlocked(true),authRequired:expired},id);voice.current=v;return v;
 }
 async function connect(){stop();setMessage("");prime(voiceAudio.current);await newVoice()?.connect();}
 async function ask(e:React.FormEvent){e.preventDefault();if(!question.trim()||!bottle?.revealed)return;if(speaking)stop();const q=question;setQuestion("");prime(voiceAudio.current);await (voice.current||newVoice())?.askText(q);}
 const active=["connecting","processing","listening","speaking"].includes(voiceState);
 if(!loaded)return <main className="shell"><h1>The AI Sommelier</h1><p>Opening bottle lookup…</p></main>;
 return <main className="shell">
  <header className="masthead"><span className="brand">The AI Sommelier<small>One bottle. A fresh conversation.</small></span><span className="mode">{bottle?.revealed?"Revealed bottle":"Host-only photo"}</span></header>
  <a className="text-button" href="/" onClick={stop}>← Back to blind tasting</a>
  {message&&<div role="status" className="notice">{message}</div>}
  <section className="panel">
   <h1>Meet a bottle.</h1><p>Take a clear label photo or choose one from your library.</p>
   {!bottle?.revealed&&<p className="muted">Host-only: label details can identify the wine. Keep this screen private until you reveal it.</p>}
   {demo&&<p role="status">Demo mode: photo lookup and live bottle Q&A need the server API key. No bottle is simulated.</p>}
   <div className="controls photo-inputs">
    <label className={"secondary photo-picker"+(!unlocked||demo||busy?" disabled":"")}>Choose photo<input aria-label="Choose bottle photo" type="file" accept="image/*" disabled={!unlocked||demo||busy} onChange={e=>{void scan(e.target.files?.[0]);e.target.value="";}}/></label>
    <label className={"secondary photo-picker"+(!unlocked||demo||busy?" disabled":"")}>Take photo<input aria-label="Take bottle photo" type="file" accept="image/*" capture="environment" disabled={!unlocked||demo||busy} onChange={e=>{void scan(e.target.files?.[0]);e.target.value="";}}/></label>
   </div>
   {busy&&<p role="status">Preparing your bottle…</p>}
   {preview&&unlocked&&!bottle?.revealed&&<img className="bottle-preview" src={preview} alt="Host-only uploaded label preview"/>}
   {unlocked&&bottle&&!bottle.revealed&&<form onSubmit={e=>{e.preventDefault();void reveal();}}>
    <p className="muted">Label reading confidence: {bottle.confidence}. {bottle.note}</p>
    {Object.entries(fields).map(([key,title])=><label className="field" key={key}>{title}<input aria-label={title} value={label[key as keyof BottleLabel]||""} maxLength={100} placeholder="Unknown" onChange={e=>setLabel(v=>({...v,[key]:e.target.value.trim()?e.target.value:null}))}/></label>)}
    <p className="muted">Exact blend unknown. Check the label before continuing.</p>
    <button className="primary full" disabled={busy}>Reveal & prepare overview</button>
   </form>}
   {unlocked&&bottle?.revealed&&<>
    <p className="eyebrow">{bottle.label.producer||"Producer unknown"}</p><h2>{bottle.label.name||"Your bottle"}</h2>
    <p>{bottle.label.grape||"Grape unknown"} · {bottle.label.region||"Region unknown"} · {bottle.label.vintage||"Vintage unknown"}</p><p className="muted">Label details confirmed by host · exact blend unknown</p>
    <div className="controls"><button className="secondary" disabled={busy} onClick={play}>▷ Play overview</button><button className="primary" disabled={busy||voiceState==="connecting"} onClick={connect}>{voiceState==="error"?"Reconnect sommelier":"Ask about this bottle"}</button><button className="stop span-two" onClick={()=>{stop();setMessage("Speaking stopped.");}}>■ Stop speaking</button></div>
    {blocked&&<button className="primary full" onClick={()=>{const el=speaking?audio.current:voiceAudio.current;void el?.play().then(()=>setBlocked(false)).catch(()=>setMessage("Playback is blocked. Check Safari audio permissions."));}}>Enable speaker</button>}
    <div className="voice-box">
     <p role="status">{voiceState==="off"?"Microphone off":voiceState==="ready"?"Ready · microphone off":voiceState==="listening"?"Listening to your question":voiceState==="processing"?"Preparing bottle answer · microphone off":voiceState==="speaking"?"Sommelier speaking · microphone off":voiceState==="connecting"?"Connecting…":"Voice unavailable"}</p>
     {["ready","listening","processing","speaking"].includes(voiceState)&&<><button className="ptt full" disabled={voiceState==="processing"||voiceState==="speaking"} onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);voice.current?.begin();}} onPointerUp={e=>{e.preventDefault();voice.current?.finish();}} onPointerCancel={()=>voice.current?.finish(true)} onLostPointerCapture={()=>voice.current?.finish(true)} onContextMenu={e=>e.preventDefault()} onKeyDown={e=>{if((e.key===" "||e.key==="Enter")&&!e.repeat){e.preventDefault();voice.current?.begin();}}} onKeyUp={e=>{if(e.key===" "||e.key==="Enter"){e.preventDefault();voice.current?.finish();}}}>{voiceState==="listening"?"Release to send":"Hold to ask · release to send"}</button><button className="text-button" onClick={stop}>End voice session</button></>}
     <form onSubmit={ask}><label htmlFor="bottle-question">Your bottle question</label><input id="bottle-question" value={question} maxLength={1200} placeholder="What food would pair well?" onChange={e=>setQuestion(e.target.value)}/><button className="secondary full" disabled={active||busy}>Send question</button></form>
    </div>
    <details className="details" open><summary>Sommelier overview</summary><p>{bottle.overview}</p></details>
    <details className="details"><summary>Label, research & sources</summary><p>{bottle.researchNote}</p>{bottle.facts.map((fact,i)=><p key={i}>{fact.claim} <a href={fact.url} target="_blank" rel="noreferrer">Source</a></p>)}{bottle.sources.map(url=><p key={url}><a href={url} target="_blank" rel="noreferrer">{new URL(url).hostname}</a></p>)}</details>
    <details className="details"><summary>Tasting notes</summary><label htmlFor="bottle-notes">What do you notice?</label><textarea id="bottle-notes" rows={3} value={notes} onChange={e=>setNotes(e.target.value)}/></details>
    <details className="details"><summary>Bottle transcript ({transcript.length})</summary>{transcript.map((t,i)=><p key={i}><strong>{t.role}</strong><br/>{t.text}</p>)}</details>
   </>}
   {unlocked&&bottle&&<button className="text-button" onClick={clear}>Scan another bottle</button>}
  </section>
  <details ref={settings} className="panel host-settings"><summary>Host access</summary>{unlocked?<p>Host access unlocked.</p>:hostConfigured?<form onSubmit={unlock}><label htmlFor="bottle-code">Host access code</label><input ref={codeInput} id="bottle-code" type="password" autoComplete="off" value={code} onChange={e=>setCode(e.target.value)}/><button className="primary full">Unlock bottle lookup</button></form>:<p>Host access is not configured. Set the server host variables first.</p>}<p className="muted">Photo lookup is separate from the eight blind rounds. Photos are sent to OpenAI for label reading; originals are not stored by this app.</p></details>
  <audio ref={audio} preload="none"/><audio ref={voiceAudio} preload="none"/>
 </main>;
}
