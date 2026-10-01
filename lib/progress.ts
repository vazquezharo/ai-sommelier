export type Progress={version:2;sessionId:string;order:string[];index:number;started:boolean;finished:boolean;revealMode:"end"|"each";notes:Record<string,string>;transcripts:Record<string,{role:string;text:string;blind:boolean}[]>};
export const demoOrder=Array.from({length:8},(_,i)=>"demo-"+(i+1));
export const initialProgress=():Progress=>({version:2,sessionId:"demo",order:[...demoOrder],index:0,started:false,finished:false,revealMode:"end",notes:{},transcripts:{}});
const handle=(id:unknown)=>typeof id==="string"&&(/^[a-f0-9]{32}$/.test(id)||/^demo-[1-8]$/.test(id));
export function restoreProgress(raw:string|null):Progress{
 try{
 const p=JSON.parse(raw||"null");if(p?.version!==2||!Array.isArray(p.order)||p.order.length!==8||new Set(p.order).size!==8||!p.order.every(handle))return initialProgress();
 const notes:Progress["notes"]={},transcripts:Progress["transcripts"]={};
 for(const id of p.order){if(typeof p.notes?.[id]==="string")notes[id]=p.notes[id].slice(0,5000);
 if(Array.isArray(p.transcripts?.[id]))transcripts[id]=p.transcripts[id].filter((t:unknown)=>t&&typeof t==="object"&&typeof (t as {role?:unknown}).role==="string"&&typeof (t as {text?:unknown}).text==="string"&&typeof (t as {blind?:unknown}).blind==="boolean").slice(-100);}
 return {version:2,sessionId:typeof p.sessionId==="string"?p.sessionId:"demo",order:p.order,index:Math.max(0,Math.min(7,Number.isInteger(p.index)?p.index:0)),started:p.started===true,finished:p.finished===true,revealMode:p.revealMode==="each"?"each":"end",notes,transcripts};
 }catch{return initialProgress();}
}
export function reorder(p:Progress,from:number,to:number){if(p.started||!Number.isInteger(from)||from<0||from>=8||!Number.isInteger(to)||to<0||to>=8)return p;const order=[...p.order];const [id]=order.splice(from,1);order.splice(to,0,id);return {...p,order};}
