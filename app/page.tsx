"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import {anonymousHint} from "@/lib/guidance";
import {initialProgress,restoreProgress,reorder,Progress} from "@/lib/progress";
import type {PublicTasting, WineFacts} from "@/lib/types";
import {Voice,VoiceState} from "@/lib/voice";
const storageKey="ai-sommelier-v2";
const silent="data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";
type Lineup={handle:string;producer:string;name:string;grape:string}[];
export default function Home(){
 const [p,setP]=useState<Progress>(initialProgress),[loaded,setLoaded]=useState(false),[setup,setSetup]=useState(true);
 const [session,setSession]=useState<PublicTasting|null>(null),[lineup,setLineup]=useState<Lineup|null>(null),[showLineup,setShowLineup]=useState(false);
 const [demo,setDemo]=useState(true),[unlocked,setUnlocked]=useState(false),[hostConfigured,setHostConfigured]=useState(false),[configurationIssue,setConfigurationIssue]=useState("");
 const [code,setCode]=useState(""),[message,setMessage]=useState(""),[voiceState,setVoiceState]=useState<VoiceState>("off"),[typed,setTyped]=useState("");
 const [playing,setPlaying]=useState<"hint"|"overview"|null>(null),[busy,setBusy]=useState(false),[hostBusy,setHostBusy]=useState(false),[script,setScript]=useState<"hint"|"overview"|null>(null),[audioBlocked,setAudioBlocked]=useState(false);
 const hostSettings=useRef<HTMLDetailsElement|null>(null),player=useRef<HTMLAudioElement|null>(null),livePlayer=useRef<HTMLAudioElement|null>(null),voice=useRef<Voice|null>(null),audioEpoch=useRef(0),fetchAbort=useRef<AbortController|null>(null),blobURL=useRef<string|null>(null),hostPending=useRef(false);
 const progress=useRef(p);progress.current=p;
 const handle=p.order[p.index],wine:WineFacts|undefined=session?.revealed[handle],isRevealed=Boolean(wine);
 const stop=useCallback(()=>{++audioEpoch.current;fetchAbort.current?.abort();fetchAbort.current=null;player.current?.pause();if(player.current){player.current.removeAttribute("src");player.current.load();}if(blobURL.current)URL.revokeObjectURL(blobURL.current);blobURL.current=null;voice.current?.stop();voice.current=null;setVoiceState("off");setPlaying(null);setBusy(false);setAudioBlocked(false);},[]);
 function requestUnlock(){if(hostSettings.current){hostSettings.current.open=true;hostSettings.current.scrollIntoView({block:"nearest"});}document.getElementById("code")?.focus();}
 function applySession(s:PublicTasting){
  setSession(s);
  setP(prev=>{
   const notes={...prev.notes},transcripts={...prev.transcripts};
   if(prev.sessionId!==s.sessionId){prev.order.forEach((id,i)=>{if(prev.notes[id])notes[s.order[i]]=prev.notes[id];if(prev.transcripts[id])transcripts[s.order[i]]=prev.transcripts[id];});}
   return {...prev,sessionId:s.sessionId,order:s.order,revealMode:s.mode,started:s.started,finished:s.finished,index:Math.min(prev.index,7),notes,transcripts};
  });
 }
 async function loadSession(){setHostBusy(true);try{const r=await fetch("/api/tasting",{cache:"no-store"});if(!r.ok)throw Error("Host session is unavailable. Unlock host access again.");applySession(await r.json());}finally{setHostBusy(false);}}
 useEffect(()=>{
  let restored=initialProgress();try{restored=restoreProgress(localStorage.getItem(storageKey));}catch{setMessage("Local storage unavailable. Keep this tab open.");}setP(restored);setSetup(!restored.started);setLoaded(true);
  fetch("/api/host",{cache:"no-store"}).then(async r=>{if(!r.ok)throw Error("Status unavailable");const s=await r.json();setDemo(s.demo);setUnlocked(s.unlocked);setHostConfigured(s.hostConfigured);if(s.missing?.length)setConfigurationIssue("Missing server variables: "+s.missing.join(", ")+".");
   if(s.unlocked){await loadSession();}
  }).catch(()=>{setMessage("Server status unavailable. Anonymous written guidance still works.");setDemo(true);});
  return()=>{++audioEpoch.current;fetchAbort.current?.abort();voice.current?.close();};
 },[]);
 useEffect(()=>{if(loaded)try{localStorage.setItem(storageKey,JSON.stringify(p));}catch{setMessage("Progress could not be saved. Keep this tab open.");}},[p,loaded]);
 useEffect(()=>{const blur=()=>voice.current?.finish(true);const hidden=()=>{if(document.hidden)stop();};window.addEventListener("blur",blur);document.addEventListener("visibilitychange",hidden);return()=>{window.removeEventListener("blur",blur);document.removeEventListener("visibilitychange",hidden);};},[stop]);
 function prime(el:HTMLAudioElement|null){if(el&&!el.src){el.setAttribute("playsinline","");el.src=silent;void el.play().catch(()=>{});}}
 function log(role:string,text:string){const id=progress.current.order[progress.current.index];setP(v=>({...v,transcripts:{...v.transcripts,[id]:[...(v.transcripts[id]||[]),{role,text,blind:role!=="Script"||!isRevealed}].slice(-100)}}));}
 async function hostAction(body:Record<string,unknown>){
  if(!unlocked){requestUnlock();setMessage("Unlock host access for this control.");return null;}
  if(hostPending.current)return null;hostPending.current=true;setHostBusy(true);stop();
  try{const r=await fetch("/api/tasting",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});const data=await r.json();if(!r.ok)throw Error(data.error||"Host action failed.");applySession(data);return data as PublicTasting;}
  catch(e){setMessage(e instanceof Error?e.message:"Host action failed.");return null;}finally{hostPending.current=false;setHostBusy(false);}
 }
 async function unlock(){try{const r=await fetch("/api/host",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({code})});const data=await r.json();if(!r.ok)throw Error(data.error);setCode("");setUnlocked(true);await loadSession();setMessage("Host access unlocked.");}catch(e){setMessage(e instanceof Error?e.message:"Unlock failed.");}}
 async function openLineup(){
  stop();if(!unlocked){requestUnlock();setMessage("Unlock host access to view the lineup.");return;}
  try{const r=await fetch("/api/lineup",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"host-lineup"})});const data=await r.json();if(!r.ok)throw Error(data.error);setLineup(data.lineup);setShowLineup(true);}catch(e){setMessage(e instanceof Error?e.message:"Lineup unavailable.");}
 }
 async function move(from:number,to:number){const next=reorder(p,from,to);if(next===p)return;if(session){await hostAction({action:"reorder",order:next.order});}else setP(next);}
 async function start(){stop();setMessage("");setShowLineup(false);setLineup(null);if(session){const s=await hostAction({action:"start",mode:p.revealMode});if(!s)return;}else setP(v=>({...v,started:true,finished:false}));setSetup(false);}
 function changeRound(index:number){if(hostPending.current)return;stop();setMessage("");setScript(null);setShowLineup(false);setLineup(null);setP(v=>({...v,index,finished:false}));}
 async function next(){if(p.index<7){changeRound(p.index+1);return;}stop();if(session){const s=await hostAction({action:"finish"});if(!s)return;}setP(v=>({...v,finished:true}));}
 async function doReveal(){if(await hostAction({action:"reveal",handle})){setScript("overview");setMessage("Revealed. Play the overview when ready.");}}
 async function revealAll(){if(await hostAction({action:"reveal-lineup"})){setMessage("Lineup revealed.");}}
 async function play(kind:"hint"|"overview"){
  if(kind==="overview"&&!wine)return;stop();setScript(kind);setMessage("");prime(player.current);
  if(demo){setMessage("Demo mode: generated audio is unavailable. The reviewed script is below.");return;}
  if(!unlocked){requestUnlock();setMessage("Enter your host code once to enable audio.");return;}
  setBusy(true);const epoch=audioEpoch.current,abort=new AbortController();fetchAbort.current=abort;
  try{const r=await fetch("/api/audio",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(kind==="hint"?{kind}:{kind,handle}),signal:abort.signal});if(!r.ok){const data=await r.json();throw Error(data.error);}
   const blob=await r.blob();if(epoch!==audioEpoch.current)return;const url=URL.createObjectURL(blob);blobURL.current=url;const el=player.current!;el.src=url;setBusy(false);setPlaying(kind);log("Script",kind==="hint"?anonymousHint:wine!.overview);
   el.onended=()=>{if(epoch===audioEpoch.current)setPlaying(null);};el.onerror=()=>{if(epoch===audioEpoch.current)setMessage("Playback failed. Read the script below.");};
   try{await el.play();}catch{if(epoch===audioEpoch.current)setAudioBlocked(true);}
  }catch(e){if(epoch===audioEpoch.current){setBusy(false);setMessage(e instanceof Error?e.message:"Audio unavailable.");}}
 }
 function newVoice(){const v=new Voice(livePlayer.current!,{state:setVoiceState,message:setMessage,transcript:log,audioBlocked:()=>setAudioBlocked(true)});voice.current=v;return v;}
 async function connectVoice(){stop();setMessage("");prime(livePlayer.current);if(demo){setMessage("Demo mode: live Q&A is unavailable. No answers are simulated.");return;}if(!unlocked){requestUnlock();setMessage("Enter your host code once to enable Q&A.");return;}await newVoice().connect();}
 async function askTyped(){if(!typed.trim())return;if(demo){setMessage("Demo mode: live Q&A is unavailable. No answers are simulated.");return;}if(!unlocked){requestUnlock();return;}prime(livePlayer.current);const v=voice.current||newVoice();const q=typed;setTyped("");await v.askText(q);}
 const transcripts=(p.transcripts[handle]||[]).filter(t=>isRevealed||t.blind),note=p.notes[handle]||"";
 if(!loaded)return <main className="shell"><h1>The AI Sommelier</h1><p>Opening your tasting…</p></main>;
 return <main className="shell">
  <header className="masthead"><span className="brand"><span className="brand-mark" aria-hidden="true">AS</span><span>The AI Sommelier<small>A private table. Eight wines.</small></span></span><span className="mode">{demo?"Demo mode":"AI enabled"}</span></header>
  {message&&<div role="status" className="notice">{message}</div>}
  {audioBlocked&&<button className="primary full" onClick={()=>{const el=playing?player.current:livePlayer.current;void el?.play().then(()=>setAudioBlocked(false)).catch(()=>setMessage("Playback is blocked. Check browser audio permissions."));}}>Enable speaker</button>}
  {setup?<section className="panel setup"><p className="eyebrow">HOST SETUP</p><h1>Set the table.</h1><p>Eight covered bottles. One curious sommelier.</p><details className="details"><summary>Customize setup · host only</summary><label htmlFor="reveal-mode">When to reveal identities</label><select id="reveal-mode" disabled={p.started} value={p.revealMode} onChange={e=>setP(v=>({...v,revealMode:e.target.value==="each"?"each":"end"}))}><option value="end">Reveal at the end</option><option value="each">Reveal each wine after tasting</option></select><button className="secondary full" onClick={openLineup}>Host-only lineup</button>{showLineup&&lineup&&<ol className="wine-list">{p.order.map((id,i)=>{const w=lineup.find(w=>w.handle===id);return <li key={id}><span className="number">{i+1}</span><div><strong>{w?.producer||"Covered bottle"}</strong><span>{w?.name} {w?.grape}</span></div><div className="reorder"><button disabled={p.started||i===0||hostBusy} aria-label={"Move wine "+(i+1)+" earlier"} onClick={()=>move(i,i-1)}>↑</button><button disabled={p.started||i===7||hostBusy} aria-label={"Move wine "+(i+1)+" later"} onClick={()=>move(i,i+1)}>↓</button></div></li>;})}</ol>}</details><button className="primary full" disabled={hostBusy} onClick={()=>p.started?setSetup(false):start()}>{p.started?"Resume wine "+(p.index+1):"Start tasting"}</button><p className="muted">AI-generated speech. Written guidance always available.</p></section>
  :p.finished?<section className="panel finale"><h1>A toast to curiosity.</h1><p>Ready to meet the wines?</p>{session&&Object.keys(session.revealed).length===8?<ol className="results">{p.order.map((id,i)=><li key={id}>Wine {i+1}: {session.revealed[id]?.producer} — {session.revealed[id]?.name}</li>)}</ol>:<button className="primary full" disabled={hostBusy} onClick={revealAll}>Reveal the lineup</button>}<button className="secondary full" onClick={()=>changeRound(7)}>Review the last wine</button></section>
  :<section className="panel round">
   <div className="round-top"><span className="eyebrow">WINE {p.index+1} OF 8</span><span className="seal">{isRevealed?"Revealed":"Blind tasting"}</span></div>
   <div className="wine-heading">{wine?<><p className="eyebrow">{wine.producer}</p><h1>{wine.name}</h1><p>{wine.grape}</p><p className="muted">{wine.region||"Region unknown"} · Vintage unknown</p></>:<><h1>Let the glass speak.</h1><p>Look. Smell. Sip.</p></>}</div>
   <div className="controls"><button className="secondary" disabled={busy||hostBusy} onClick={()=>play(isRevealed?"overview":"hint")}>{isRevealed?"▷ Play overview":"▷ Play hint"}</button>{p.revealMode==="each"&&!isRevealed&&<button className="secondary" disabled={hostBusy} onClick={doReveal}>Reveal wine</button>}{(voiceState==="off"||voiceState==="error"||voiceState==="connecting")&&<button className="primary" disabled={hostBusy||voiceState==="connecting"} onClick={connectVoice}>{voiceState==="error"?"Reconnect sommelier":"Ask sommelier"}</button>}<button className="stop span-two" onClick={()=>{stop();setMessage("Speaking stopped.");}}>■ Stop speaking</button></div>
   {busy&&<p role="status">Preparing reviewed audio…</p>}
   <div className="next-row"><button className="text-button" disabled={p.index===0||hostBusy} onClick={()=>changeRound(p.index-1)}>Previous</button><button className="primary" disabled={hostBusy||(p.revealMode==="each"&&!isRevealed)} onClick={next}>{p.index===7?"Finish tasting":"Next wine"}</button></div>
   <div className="voice-box"><div role="status" aria-live="polite" className="voice-status"><strong>{voiceState==="off"?"Microphone off":voiceState==="ready"?"Ready · microphone off":voiceState==="listening"?"Listening to your question":voiceState==="processing"?"Checking reviewed answer · microphone off":voiceState==="speaking"?"Sommelier speaking · microphone off":voiceState==="connecting"?"Connecting…":"Voice unavailable"}</strong></div>
    {["ready","listening","processing","speaking"].includes(voiceState)&&<><button className="ptt full" disabled={voiceState==="processing"||voiceState==="speaking"} onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);voice.current?.begin();}} onPointerUp={e=>{e.preventDefault();voice.current?.finish();}} onPointerCancel={()=>voice.current?.finish(true)} onLostPointerCapture={()=>voice.current?.finish(true)} onContextMenu={e=>e.preventDefault()} onKeyDown={e=>{if((e.key===" "||e.key==="Enter")&&!e.repeat){e.preventDefault();voice.current?.begin();}}} onKeyUp={e=>{if(e.key===" "||e.key==="Enter"){e.preventDefault();voice.current?.finish();}}}>{voiceState==="listening"?"Release to send":"Hold to ask · release to send"}</button><button className="text-button" onClick={stop}>End voice session</button></>}
    <p className="muted">General tasting questions. Reviewed text is checked before speech; expect a short pause.</p><details className="details"><summary>Type a question</summary><form onSubmit={e=>{e.preventDefault();void askTyped();}}><label htmlFor="question">Your tasting question</label><input id="question" value={typed} maxLength={1200} onChange={e=>setTyped(e.target.value)}/><button className="secondary full" disabled={voiceState==="processing"||voiceState==="speaking"||voiceState==="listening"}>Send question</button></form></details>
   </div>
   <details key={script||"hint"} open={Boolean(script)} className="details"><summary>{script==="overview"?"Overview script":"Hint script"}</summary><p>{script==="overview"&&wine?wine.overview:anonymousHint}</p></details>
   <details className="details"><summary>Tasting notes</summary>{wine&&<><p>{wine.verification}</p><p>{wine.overview}</p><ul>{wine.sources.map(s=><li key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.claim}</a></li>)}</ul></>}<label htmlFor="notes">What did your table notice?</label><textarea id="notes" value={note} rows={3} onChange={e=>setP(v=>({...v,notes:{...v.notes,[handle]:e.target.value}}))}/></details>
   <details className="details"><summary>Transcript ({transcripts.length})</summary>{transcripts.map((t,i)=><p key={i}><strong>{t.role}</strong><br/>{t.text}</p>)}</details>
   <details className="details"><summary>Jump to wine</summary><div className="progress">{p.order.map((id,i)=><button key={id} className={i===p.index?"current":""} disabled={hostBusy} aria-label={"Go to wine "+(i+1)} onClick={()=>changeRound(i)}>{i+1}</button>)}</div></details>
  </section>}
  <details ref={hostSettings} className="panel host-settings"><summary>Host settings & access</summary><p className="muted">Identities require an authenticated, explicit host action.</p>{unlocked?<p>Host access unlocked.</p>:hostConfigured?<form onSubmit={e=>{e.preventDefault();void unlock();}}><label htmlFor="code">Host access code</label><input id="code" type="password" value={code} autoComplete="off" onChange={e=>setCode(e.target.value)}/><button className="primary full">Unlock AI</button></form>:<p>Host access is not configured. Anonymous demo controls still work.</p>}{configurationIssue&&<p>{configurationIssue}</p>}<div className="controls"><button className="secondary" onClick={openLineup}>Host-only lineup</button><button className="secondary" onClick={()=>{stop();setSetup(true);setLineup(null);setShowLineup(false);}}>Setup / resume</button></div>{showLineup&&!setup&&lineup&&<><ol>{lineup.map((w,i)=><li key={w.handle}>{i+1}. {w.producer} — {w.name}</li>)}</ol><button onClick={()=>{setShowLineup(false);setLineup(null);}}>Close lineup</button></>}<a className="text-button" href="/guide">Setup & rehearsal guide</a></details>
  <details className="panel education"><summary>Wine words, without the fuss</summary><p>Tannin is a drying grip. Acidity makes your mouth water. Body is how light or weighty the wine feels. Fruit words are aroma comparisons; vanilla often comes from oak.</p></details>
  <footer>Water, small pours, and a spit cup are welcome.</footer><audio ref={player} preload="none"/><audio ref={livePlayer} preload="none"/>
 </main>;
}
