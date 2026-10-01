import http from "node:http";
const capture=[];
function json(res,value,status=200){res.writeHead(status,{"Content-Type":"application/json"});res.end(JSON.stringify(value));}
function wav(){const size=128000,b=Buffer.alloc(44+size);b.write("RIFF");b.writeUInt32LE(36+size,4);b.write("WAVEfmt ",8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(16000,24);b.writeUInt32LE(32000,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write("data",36);b.writeUInt32LE(size,40);return b;}
http.createServer(async(req,res)=>{
 if(req.url==="/capture"){json(res,capture);return;}
 if(req.url==="/clear"){capture.length=0;json(res,{ok:true});return;}
 let raw="";for await(const chunk of req)raw+=chunk.toString();
 if(req.url==="/v1/audio/transcriptions"){
  const question=raw.match(/MOCKQUESTION:([^\r\n]+)/)?.[1]||"What does tannin feel like?";
  capture.push({path:req.url,question});json(res,{text:question});return;
 }
 let body;try{body=JSON.parse(raw);}catch{json(res,{error:"Bad mock body"},400);return;}
 capture.push({path:req.url,body});
 if(req.url==="/v1/responses"){
  if(body.input?.includes("PROVIDERFAIL")){json(res,{},503);return;}
  const content=body.input?.includes("unexpected")?JSON.stringify({id:"tannin",text:"This is Grenache"}):JSON.stringify({id:"tannin"});
  json(res,{output:[{content:[{type:"output_text",text:content}]}]});return;
 }
 if(req.url==="/v1/audio/speech"){res.writeHead(200,{"Content-Type":"audio/wav"});res.end(wav());return;}
 json(res,{},404);
}).listen(4001,"127.0.0.1");
