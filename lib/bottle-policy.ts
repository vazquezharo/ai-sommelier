import type {BottleLabel} from "./bottle-types";
export const labelSchema={type:"object",properties:{isWine:{type:"boolean"},producer:{type:["string","null"]},name:{type:["string","null"]},grape:{type:["string","null"]},region:{type:["string","null"]},vintage:{type:["string","null"]},confidence:{type:"string",enum:["high","medium","low"]},note:{type:"string"}},required:["isWine","producer","name","grape","region","vintage","confidence","note"],additionalProperties:false};
export const overviewSchema={type:"object",properties:{overview:{type:"string"},facts:{type:"array",items:{type:"object",properties:{claim:{type:"string"},url:{type:"string"}},required:["claim","url"],additionalProperties:false}}},required:["overview","facts"],additionalProperties:false};
export function cleanLabel(value:unknown):BottleLabel{
 if(!value||typeof value!=="object")throw Error("Invalid label");
 const v=value as Record<string,unknown>,label={} as BottleLabel;
 for(const key of ["producer","name","grape","region","vintage"] as const){
  const text=v[key];if(text!==null&&(typeof text!=="string"||text.length>100||/[\u0000-\u001f]/.test(text)))throw Error("Invalid label");
  label[key]=typeof text==="string"?text.trim()||null:null;
 }
 if(label.vintage&&!/^(?:[12]\d{3}|NV)$/i.test(label.vintage))throw Error("Invalid vintage");
 return label;
}
export function safeSource(value:unknown):string|null{
 if(typeof value!=="string"||value.length>220)return null;
 try{const u=new URL(value);if(u.protocol!=="https:"||u.username||u.password||u.hostname==="localhost"||/^(?:\d+\.){3}\d+$/.test(u.hostname))return null;u.hash="";return u.href;}catch{return null;}
}
type Output={type?:string;action?:{sources?:{url?:unknown}[]};content?:{type?:string;text?:string;annotations?:{type?:string;url?:unknown}[]}[]};
export function responseText(data:{output?:Output[]}){return (data.output||[]).flatMap(o=>o.content||[]).filter(c=>c.type==="output_text").map(c=>c.text||"").join("");}
export function researchSources(data:{output?:Output[]},limit=2){
 const urls=(data.output||[]).flatMap(o=>[...(o.action?.sources||[]).map(s=>s.url),...(o.content||[]).flatMap(c=>(c.annotations||[]).filter(a=>a.type==="url_citation").map(a=>a.url))]);
 return [...new Set(urls.map(safeSource).filter((u):u is string=>Boolean(u)))].slice(0,limit);
}
export function cleanOverview(value:unknown,allowed:string[]){
 const v=value as {overview?:unknown;facts?:unknown};
 if(!v||typeof v.overview!=="string"||v.overview.length>1400)throw Error("Invalid overview");
 const text=v.overview.trim(),words=text.split(/\s+/).length;
 if(words<110||words>150)throw Error("Invalid overview length");
 const facts=cleanFacts(v.facts,allowed);
 return {overview:text,facts};
}

export function cleanFacts(value:unknown,allowed:string[],limit=2){
 return Array.isArray(value)?value.flatMap(f=>{
  if(!f||typeof f!=="object")return [];const claim=(f as {claim?:unknown}).claim,url=safeSource((f as {url?:unknown}).url);
  return typeof claim==="string"&&claim.trim().length>0&&claim.length<=160&&url&&allowed.includes(url)?[{claim:claim.trim(),url}]:[];
 }).slice(0,limit):[];
}
