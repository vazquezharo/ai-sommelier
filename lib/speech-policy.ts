// A strict transcript comparison is an additional gate, not proof of acoustic truth.
export function normalizedSpeech(text:string){
 return text.toLowerCase().replace(/[’']/g,"").replace(/[^a-z0-9]+/g," ").trim();
}
export function matchesApprovedSpeech(expected:string,heard:unknown){
 return typeof heard==="string"&&Boolean(normalizedSpeech(expected))&&normalizedSpeech(expected)===normalizedSpeech(heard);
}
