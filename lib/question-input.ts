import "server-only";
import {providerURL,providerHeaders} from "./provider";
export async function readQuestion(req:Request){
 let question="",previousTicket:unknown=null,id:unknown=null;
 if(req.headers.get("content-type")?.startsWith("application/json")){
  const body=await req.json();if(Object.keys(body).some(k=>!["question","previousTicket","id"].includes(k))||typeof body.question!=="string")throw Error("Invalid question");question=body.question;previousTicket=body.previousTicket;id=body.id;
 }else{
  const form=await req.formData();if([...form.keys()].some(k=>!["audio","previousTicket","id"].includes(k))||form.getAll("audio").length!==1||form.getAll("previousTicket").length>1||form.getAll("id").length!==1)throw Error("Invalid question");
  const file=form.get("audio");previousTicket=form.get("previousTicket");id=form.get("id");
  if(!(file instanceof File)||!file.size||file.size>2*1024*1024||!["audio/mp4","audio/webm","audio/wav","audio/ogg"].some(t=>file.type.startsWith(t)))throw Error("Invalid question");
  const upload=new FormData();upload.append("file",new File([file],"question."+ (file.type.startsWith("audio/mp4")?"mp4":file.type.startsWith("audio/wav")?"wav":file.type.startsWith("audio/ogg")?"ogg":"webm"),{type:file.type}));upload.append("model",process.env.OPENAI_TRANSCRIBE_MODEL||"gpt-4o-mini-transcribe");upload.append("response_format","json");
  const r=await fetch(providerURL("/audio/transcriptions"),{method:"POST",headers:providerHeaders(),body:upload,signal:AbortSignal.timeout(25000)});if(!r.ok)throw Error("Could not transcribe the question. Try again or type it.");
  const data=await r.json();question=typeof data.text==="string"?data.text:"";
 }
 if(!question.trim()||question.trim().length>1200)throw Error("Invalid question");return {question:question.trim(),previousTicket,id};
}
