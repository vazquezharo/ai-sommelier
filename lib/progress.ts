import { wines } from "./wines";
export type Progress = { version:1; order:string[]; index:number; started:boolean; finished:boolean; revealMode:"end"|"each"; lineupRevealed:boolean; scores:Record<string,number>; guesses:Record<string,string>; revealed:string[]; notes:Record<string,string>; transcripts:Record<string,{role:string;text:string;blind?:boolean}[]> };
export const initialProgress = ():Progress => ({version:1,order:wines.map(w=>w.id),index:0,started:false,finished:false,revealMode:"end",lineupRevealed:false,scores:{},guesses:{},revealed:[],notes:{},transcripts:{}});
export function restoreProgress(raw:string|null):Progress {
 try {
  const p=JSON.parse(raw || "null"); const ids=wines.map(w=>w.id);
  if(p?.version===1 && Array.isArray(p.order) && p.order.includes("syrah") && !p.order.includes("grenache")){
   p.order=p.order.map((id:string)=>id==="syrah"?"grenache":id);
   if(Array.isArray(p.revealed))p.revealed=p.revealed.map((id:string)=>id==="syrah"?"grenache":id);
   if(p.notes?.syrah)p.notes.grenache=p.notes.syrah;
   if(p.transcripts?.syrah)p.transcripts.grenache=p.transcripts.syrah;
  }
  if (!p || p.version!==1 || !Array.isArray(p.order) || p.order.length!==8 || new Set(p.order).size!==8 || p.order.some((id:string)=>!ids.includes(id))) return initialProgress();
  const notes:Record<string,string>={};
  const transcripts:Progress["transcripts"]={};
  const scores:Progress["scores"]={},guesses:Progress["guesses"]={};
  for(const id of ids){
   if(Number.isInteger(p.scores?.[id]) && p.scores[id]>=1 && p.scores[id]<=10)scores[id]=p.scores[id];
   if(typeof p.guesses?.[id]==="string")guesses[id]=p.guesses[id];
   if(typeof p.notes?.[id]==="string")notes[id]=p.notes[id];
   if(Array.isArray(p.transcripts?.[id]))transcripts[id]=p.transcripts[id].filter((t:unknown)=>t && typeof t==="object" && typeof (t as {role?:unknown}).role==="string" && typeof (t as {text?:unknown}).text==="string").slice(-100);
  }
  return {version:1,order:p.order,index:Math.max(0,Math.min(7,Number.isInteger(p.index)?p.index:0)),started:p.started===true,finished:p.finished===true,revealMode:p.revealMode==="each"?"each":"end",lineupRevealed:p.lineupRevealed===true,scores,guesses,revealed:Array.isArray(p.revealed)?p.revealed.filter((id:string)=>ids.includes(id)):[],notes,transcripts};
 } catch {return initialProgress();}
}
export function reveal(p:Progress):Progress {const id=p.order[p.index];return {...p,revealed:[...new Set([...p.revealed,id])]};}
export function reorder(p:Progress,from:number,to:number):Progress {
 if(p.started || to<0 || to>=8) return p;
 const order=[...p.order];const [item]=order.splice(from,1);order.splice(to,0,item);return {...p,order};
}

export function identityVisible(p:Progress,id:string){return p.lineupRevealed || (p.revealMode==="each" && p.revealed.includes(id));}
export function revealLineup(p:Progress):Progress{return p.finished?{...p,lineupRevealed:true,revealed:[...p.order]}:p;}
