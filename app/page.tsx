"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import {wines,anonymousHint} from "@/lib/wines";
import {initialProgress,restoreProgress,reveal,reorder,identityVisible,revealLineup,Progress} from "@/lib/progress";
import {Voice,VoiceState} from "@/lib/voice";
const storageKey="ai-sommelier-v1";
const silent="data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";
export default function Home(){
 const [p,setP]=useState<Progress>(initialProgress);
 const [loaded,setLoaded]=useState(false);
 const [setup,setSetup]=useState(true);
 const [lineup,setLineup]=useState(false);
 const [demo,setDemo]=useState(true);
 const [configurationIssue,setConfigurationIssue]=useState("");
 const [unlocked,setUnlocked]=useState(false);
 const [code,setCode]=useState("");
 const [message,setMessage]=useState("");
 const [voiceState,setVoiceState]=useState<VoiceState>("off");
 const [playing,setPlaying]=useState<"hint"|"overview"|null>(null);
 const [busy,setBusy]=useState(false);
 const [script,setScript]=useState<"hint"|"overview"|null>(null);
 const [audioBlocked,setAudioBlocked]=useState(false);
 const hostSettings=useRef<HTMLDetailsElement|null>(null);
 const player=useRef<HTMLAudioElement|null>(null);
 const livePlayer=useRef<HTMLAudioElement|null>(null);
 const voice=useRef<Voice|null>(null);
 const audioEpoch=useRef(0);
 const fetchAbort=useRef<AbortController|null>(null);
 const blobURL=useRef<string|null>(null);
 const progress=useRef(p);progress.current=p;
 const wine=wines.find(w=>w.id===p.order[p.index])!;
 const isRevealed=identityVisible(p,wine.id);
 const stop=useCallback(()=>{
  ++audioEpoch.current;fetchAbort.current?.abort();fetchAbort.current=null;
  player.current?.pause();if(player.current){player.current.removeAttribute("src");player.current.load();}
  if(blobURL.current){URL.revokeObjectURL(blobURL.current);blobURL.current=null;}
  voice.current?.stop();voice.current=null;
  setVoiceState("off");setPlaying(null);setBusy(false);setAudioBlocked(false);
 },[]);
 useEffect(()=>{
  let stored=initialProgress();try{stored=restoreProgress(localStorage.getItem(storageKey));}catch{setMessage("Local storage is unavailable. Keep this tab open to retain progress.");}setP(stored);setSetup(!stored.started);setLoaded(true);
  fetch("/api/host",{cache:"no-store"}).then(r=>{if(!r.ok)throw Error("Host status unavailable");return r.json();}).then(s=>{setDemo(s.demo);setUnlocked(s.unlocked);if(s.demo && Array.isArray(s.missing) && s.missing.length){const issue="Missing server variables: "+s.missing.join(", ")+". Set them for Production in Vercel and redeploy.";setConfigurationIssue(issue);setMessage(issue);}}).catch(()=>{setDemo(true);setConfigurationIssue("Host status could not be loaded. Refresh to retry; written scripts still work.");setMessage("Server unavailable. Demo mode and written scripts still work.");});
  return()=>{++audioEpoch.current;fetchAbort.current?.abort();voice.current?.close();};
 },[]);
 useEffect(()=>{if(loaded){try{localStorage.setItem(storageKey,JSON.stringify(p));}catch{setMessage("This browser could not save progress. Keep this tab open.");}}},[p,loaded]);
 useEffect(()=>{
  const cancel=()=>{voice.current?.finish(true);};
  const hidden=()=>{if(document.hidden){stop();setMessage("Audio and microphone stopped while the page was hidden.");}};
  window.addEventListener("blur",cancel);document.addEventListener("visibilitychange",hidden);
  return()=>{window.removeEventListener("blur",cancel);document.removeEventListener("visibilitychange",hidden);};
 },[stop]);
 function prime(element:HTMLAudioElement|null){
  if(!element)return; element.setAttribute("playsinline","");
  if(!element.srcObject && !element.src){element.src=silent;void element.play().catch(()=>{});}
 }
 function requestUnlock(){
  if(hostSettings.current){hostSettings.current.open=true;hostSettings.current.scrollIntoView({block:"nearest"});}
  document.getElementById("code")?.focus();
 }
 async function unlock(){
  setMessage("");
  try{
   const r=await fetch("/api/host",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({code})});
   const j=await r.json();if(!r.ok)throw Error(j.error);setUnlocked(true);setCode("");setMessage("Host access unlocked for six hours.");
  }catch(e){setMessage(e instanceof Error?e.message:"Unable to unlock.");}
 }
 function log(role:string,text:string){
  const id=progress.current.order[progress.current.index];
  setP(prev=>({...prev,transcripts:{...prev.transcripts,[id]:[...(prev.transcripts[id]||[]),{role,text,blind:!isRevealed}].slice(-100)}}));
 }
 async function play(kind:"hint"|"overview"){
  if(kind==="overview"&&!isRevealed)return;
  stop();setScript(kind);setMessage("");setBusy(true);prime(player.current);
  const epoch=audioEpoch.current,abort=new AbortController();fetchAbort.current=abort;
  const cacheName="sommelier-audio-v1";
  const file=kind==="hint"?"hint-v1":wine.id+"-overview-v1";
  const cacheKey=location.origin+"/audio-cache/"+file;
  try{
   let cache:Cache|undefined;try{cache=await caches.open(cacheName);}catch{}
   let response=await cache?.match(cacheKey);
   if(!response){
    const staticAudio=await fetch("/audio/"+file+".mp3",{signal:abort.signal});
    if(staticAudio.ok && staticAudio.headers.get("content-type")?.includes("audio"))response=staticAudio;
   }
   if(!response){
    if(demo)throw Error("Demo mode: generated audio is not installed. The complete script is below.");
    if(!unlocked){requestUnlock();throw Error("Enter your host code once to enable audio.");}
    const r=await fetch("/api/audio",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(kind==="hint"?{kind}:{kind,id:wine.id}),signal:abort.signal});
    if(!r.ok){const j=await r.json();throw Error(j.error || "Audio unavailable.");}response=r;
   }
   const cached=response.clone();const blob=await response.blob();
   if(epoch!==audioEpoch.current)return;
   try{await cache?.put(cacheKey,cached);}catch{}
   if(epoch!==audioEpoch.current)return;
   const url=URL.createObjectURL(blob);blobURL.current=url;
   const el=player.current!;el.src=url;setBusy(false);setPlaying(kind);
   el.onended=()=>{if(epoch===audioEpoch.current)setPlaying(null);};
   el.onerror=()=>{if(epoch===audioEpoch.current){setPlaying(null);setMessage("Playback failed. The script remains available.");}};
   log("Script",kind==="hint"?anonymousHint:wine.overview);
   try{await el.play();}catch{setAudioBlocked(true);setMessage("Tap Enable speaker to allow audio playback.");}
  }catch(e){
   if(epoch!==audioEpoch.current)return;
   setBusy(false);setPlaying(null);setMessage(e instanceof Error?e.message:"Audio unavailable. Read the script below.");
  }
 }
 async function connectVoice(){
  stop();setMessage("");prime(livePlayer.current);
  if(demo){setMessage("Demo mode: live AI Q&A is unavailable. No answers are simulated. You can read the wine education below.");return;}
  if(!unlocked){requestUnlock();setMessage("Enter your host code once to enable live Q&A.");return;}
  const mode=isRevealed?"revealed":"blind";
  const session=new Voice(livePlayer.current!,{state:setVoiceState,message:setMessage,transcript:log,audioBlocked:()=>setAudioBlocked(true)});
  voice.current=session;await session.connect(mode,isRevealed?wine.id:undefined);
 }
 function changeRound(index:number){
  stop();setMessage("");setScript(null);setLineup(false);setP(prev=>({...prev,index,finished:false}));
 }
 function doReveal(){if(p.revealMode!=="each")return;stop();setScript("overview");setMessage("Revealed. Tap Play overview when the group is ready.");setP(reveal);}
 function start(){stop();setSetup(false);setLineup(false);setP(prev=>({...prev,started:true,finished:false}));}
 function next(){
  if(p.index===7){stop();setP(prev=>({...prev,finished:true}));}
  else changeRound(p.index+1);
 }
 function reset(){if(window.confirm("Reset the tasting, round order, reveal states, notes, and transcripts on this device?")){stop();setP(initialProgress());setSetup(true);setScript(null);setMessage("");}}
 const note=typeof p.notes[wine.id]==="string"?p.notes[wine.id]:"";
 const allTranscripts=Array.isArray(p.transcripts[wine.id])?p.transcripts[wine.id]:[];
 const transcripts=isRevealed?allTranscripts:allTranscripts.filter(t=>t.blind===true);
 if(!loaded)return <main className="shell"><h1>The AI Sommelier</h1><p>Opening your tasting…</p></main>;
 return <main className="shell">
  <header className="masthead"><a href="/" className="brand"><span className="brand-mark" aria-hidden="true">AS</span><span>The AI Sommelier<small>A private table. Eight wines.</small></span></a><span className="mode">{demo?"Demo mode":"AI enabled"}</span></header>
  {message && <div role="status" className="notice">{message}</div>}
  {audioBlocked && <button className="primary full" onClick={()=>{const el=playing?player.current:livePlayer.current;el?.play().then(()=>setAudioBlocked(false)).catch(()=>setMessage("Playback is blocked. Check Safari audio permissions."));}}>Enable speaker</button>}
  {setup ? <section className="panel setup">
   <p className="eyebrow">HOST SETUP · 10–12 ADULTS</p><h1>Set the table.</h1>
   <p>Eight covered bottles. One curious sommelier.</p>
   <p className="muted">{p.revealMode==="end"?"Identities stay hidden until the final reveal.":"The host reveals each wine."}</p><details className="details setup-options"><summary>Customize setup · host only</summary><p className="muted">Number covered bottles in this order. Keep these identities with the host.</p>
   <label htmlFor="reveal-mode">When to reveal identities</label><select id="reveal-mode" value={p.revealMode} disabled={p.started} onChange={e=>setP(v=>({...v,revealMode:e.target.value==="each"?"each":"end"}))}><option value="end">Keep all rounds blind; reveal at the end</option><option value="each">Reveal each wine after tasting</option></select>
   <ol className="wine-list">{p.order.map((id,i)=>{const w=wines.find(x=>x.id===id)!;return <li key={id}><span className="number">{i+1}</span><div><strong>{w.producer}</strong><span>{w.name} · {w.grape}</span></div><div className="reorder"><button disabled={p.started||i===0} onClick={()=>setP(v=>reorder(v,i,i-1))} aria-label={"Move "+w.producer+" earlier"}>↑</button><button disabled={p.started||i===7} onClick={()=>setP(v=>reorder(v,i,i+1))} aria-label={"Move "+w.producer+" later"}>↓</button></div></li>;})}</ol></details>
   {p.started?<><button className="primary full" onClick={()=>{setSetup(false);setLineup(false);}}>Resume wine {p.index+1}</button><p className="muted">Order is locked after starting. Reset to change it.</p></>:<button className="primary full" onClick={start}>Start tasting</button>}
   <p className="muted">AI-generated speech. Written scripts always available.</p>
  </section> : p.finished ? <section className="panel finale">
   <p className="eyebrow">EIGHT WINES, MANY OPINIONS</p><h1>A toast to curiosity.</h1><p>Ready to meet the wines?</p>{(p.lineupRevealed||p.revealMode==="each") && <ol className="results">{p.order.map((id,i)=>{const w=wines.find(x=>x.id===id)!;return <li key={id}><strong>Wine {i+1}</strong>{identityVisible(p,id) && <p>{w.producer} — {w.name} · {w.grape}</p>}</li>;})}</ol>}{p.revealMode==="end"&&!p.lineupRevealed && <button className="primary full" onClick={()=>{stop();setScript(null);setP(revealLineup);setMessage("Lineup revealed. Review a wine to hear its overview.");}}>Reveal the lineup</button>}
   <button className="primary full" onClick={()=>changeRound(7)}>Review the last wine</button><button className="secondary full" onClick={()=>{stop();setLineup(true);}}>Host-only lineup</button>
  </section> : <section className="panel round">
   <div className="round-top"><span className="eyebrow">WINE {p.index+1} OF 8</span><span className={"seal "+(isRevealed?"revealed":"")}>{isRevealed?"Revealed":"Blind tasting"}</span></div>

   <div className="wine-heading">{isRevealed?<><p className="eyebrow">{wine.producer}</p><h1>{wine.name}</h1><p className="grape">{wine.grape}</p><p className="muted">Region: {wine.region||"not yet verified"} · Vintage: unknown</p></>:<><h1>Let the glass speak.</h1><p>Look. Smell. Sip.</p></>}</div>
   <div className="controls">
    {!isRevealed?<><button className="secondary" disabled={busy} onClick={()=>play("hint")}>▷ Play hint</button>{p.revealMode==="each"?<button className="primary" onClick={doReveal}>Reveal wine</button>:null}</>:<button className="primary span-two" disabled={busy} onClick={()=>play("overview")}>▷ Play overview</button>}
    {(voiceState==="off"||voiceState==="error"||voiceState==="connecting") && <button className="primary" disabled={voiceState==="connecting"} onClick={connectVoice}>{voiceState==="connecting"?"Connecting…":voiceState==="error"?"Reconnect sommelier":"Ask sommelier"}</button>}
    <button className="stop span-two" onClick={()=>{stop();setMessage("Speaking stopped. Ask sommelier to start a fresh voice session.");}}>■ Stop speaking</button>
   </div>
   {busy && <p role="status" className="muted">Preparing reusable audio…</p>}
   {playing && <p role="status" className="muted">Playing {playing} · AI-generated voice</p>}
   <div className="next-row"><button className="text-button" disabled={p.index===0} onClick={()=>changeRound(p.index-1)}>Previous</button><button className="primary" disabled={p.revealMode==="each"&&!isRevealed} onClick={next}>{p.index===7?"Finish tasting":"Next wine"}</button></div>
   <div className="voice-box">
    <div className="voice-status"><span className={"status-dot "+voiceState}></span><strong>{voiceState==="off"?"Microphone off":voiceState==="connecting"?"Connecting…":voiceState==="ready"?"Ready · microphone off":voiceState==="listening"?"Listening to your question":voiceState==="speaking"?"Sommelier speaking · microphone off":"Voice unavailable"}</strong></div>
    {(voiceState==="ready"||voiceState==="listening"||voiceState==="speaking") && <><button className="ptt full" disabled={voiceState==="speaking"} onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);voice.current?.begin();}} onPointerUp={e=>{e.preventDefault();voice.current?.finish();}} onPointerCancel={()=>voice.current?.finish(true)} onLostPointerCapture={()=>voice.current?.finish(true)} onContextMenu={e=>e.preventDefault()} onKeyDown={e=>{if((e.key===" "||e.key==="Enter")&&!e.repeat){e.preventDefault();voice.current?.begin();}}} onKeyUp={e=>{if(e.key===" "||e.key==="Enter"){e.preventDefault();voice.current?.finish();}}}>{voiceState==="listening"?"Release to send":"Hold to ask · release to send"}</button><button className="text-button" onClick={()=>{stop();setMessage("Voice session ended. Microphone released.");}}>End voice session</button></>}
    <p className="muted">{demo?"Live Q&A is unavailable in demo mode. No answers are simulated.":isRevealed?"Ask about the grape, style, or pairing. Hold only while speaking.":"Ask about aromas, tannin, acidity, or food."}</p>
   </div>
   <details key={script||"hint"} open={Boolean(script)} className="details"><summary>{script==="overview"?"Overview script":"Hint script"} · {script==="overview"?"~1 minute":"~20 seconds"}</summary><p>{script==="overview"&&isRevealed?wine.overview:anonymousHint}</p></details>
   <details className="details"><summary>Tasting notes</summary>
    {isRevealed && <><p><strong>Typical grape traits</strong></p><p>{wine.overview}</p><p><strong>Bottle facts</strong></p><p>{wine.verification}</p><p>Vintage: unknown. Exact blend: unknown. Region: {wine.region||"unknown"}.</p>{wine.sources.length>0?<ul>{wine.sources.map(s=><li key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.claim}</a></li>)}</ul>:<p className="muted">Producer verification pending; no bottle-specific tasting claims are presented as verified.</p>}</>}
    <label htmlFor="notes">What did your table notice?</label><textarea id="notes" rows={3} value={note} placeholder="Aromas, texture, pairing ideas…" onChange={e=>setP(v=>({...v,notes:{...v.notes,[wine.id]:e.target.value}}))}/><p className="muted">Saved on this device only.</p>
   </details>
   <details className="details"><summary>Transcript ({transcripts.length})</summary>{transcripts.length?transcripts.map((t,i)=><p key={i}><strong>{t.role}</strong><br/>{t.text}</p>):<p>No transcript yet. Live transcripts appear after each question and answer; played scripts are recorded here too.</p>}</details>
   <details className="details"><summary>Jump to wine</summary><div className="progress" aria-label={"Wine "+(p.index+1)+" of 8"}>{p.order.map((id,i)=><button key={id} className={(i===p.index?"current ":"")+(identityVisible(p,id)?"done":"")} aria-label={"Go to wine "+(i+1)+(identityVisible(p,id)?", already revealed":"")} onClick={()=>changeRound(i)}>{i+1}</button>)}</div></details>
  </section>}
  {lineup && !setup && <section className="panel"><p className="eyebrow">HOST ONLY · KEEP LABELS HIDDEN</p><h2>Tonight’s lineup</h2><ol className="host-list">{p.order.map((id,i)=>{const w=wines.find(x=>x.id===id)!;return <li key={id}><button onClick={()=>changeRound(i)}>{i+1}. {w.producer} — {w.name}<small>{w.grape} · {p.revealed.includes(id)?"revealed":"hidden"}</small></button></li>;})}</ol><button className="secondary full" onClick={()=>setLineup(false)}>Close lineup</button></section>}
  <details ref={hostSettings} className="panel host-settings"><summary>Host settings & access</summary>
   <p className="muted">Keep this device with the host. Lineup access displays identities.</p>
   <div className="controls"><button className="secondary" onClick={()=>{stop();setLineup(v=>!v);}}>Host-only lineup</button><button className="secondary" onClick={()=>{stop();setSetup(true);}}>Setup / resume</button></div>
   {demo?<p>Demo mode works without credentials. {configurationIssue || "Configure the server to enable OpenAI audio and live Q&A."}</p>:unlocked?<p>Paid AI routes unlocked. Voice sessions end after ten minutes.</p>:<form onSubmit={e=>{e.preventDefault();void unlock();}}><label htmlFor="code">Host access code</label><input id="code" type="password" value={code} autoComplete="off" onChange={e=>setCode(e.target.value)}/><button className="primary full" type="submit">Unlock AI</button></form>}
   <button className="text-button danger" onClick={reset}>Reset tasting</button><a className="text-button" href="/guide">Setup & rehearsal guide</a>
  </details>
  <details className="panel education"><summary>Wine words, without the fuss</summary><p><strong>Tannin</strong> is the drying grip on your gums, like strong black tea.</p><p><strong>Acidity</strong> makes your mouth water. It is different from bitterness.</p><p><strong>Body</strong> means how light or weighty a wine feels in your mouth.</p><p>Fruit words are aroma comparisons, not added ingredients. Vanilla often comes from oak.</p></details>
  <footer>Drink thoughtfully. Water, small pours, and a spit cup are welcome.</footer>
  <audio ref={player} preload="none"/><audio ref={livePlayer} autoPlay/>
 </main>;
}
