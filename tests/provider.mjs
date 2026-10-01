import http from "node:http";
const capture=[];let tamperSpeech=false,blankLabel=false,failResearch=false,failPhoto=false;
function json(res,value,status=200){res.writeHead(status,{"Content-Type":"application/json"});res.end(JSON.stringify(value));}
function wav(){const size=128000,b=Buffer.alloc(44+size);b.write("RIFF");b.writeUInt32LE(36+size,4);b.write("WAVEfmt ",8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(16000,24);b.writeUInt32LE(32000,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write("data",36);b.writeUInt32LE(size,40);return b;}
http.createServer(async(req,res)=>{
 if(req.url==="/capture"){json(res,capture);return;}
 if(req.url==="/clear"){capture.length=0;json(res,{ok:true});return;}
 if(req.url==="/controls"){let raw="";for await(const chunk of req)raw+=chunk.toString();const flags=JSON.parse(raw);tamperSpeech=flags.tamperSpeech===true;blankLabel=flags.blankLabel===true;failResearch=flags.failResearch===true;failPhoto=flags.failPhoto===true;json(res,{ok:true});return;}
 let raw="";for await(const chunk of req)raw+=chunk.toString();
 if(req.url==="/v1/audio/transcriptions"){
  const output=raw.match(/MOCKOUTPUT:([^\r\n]+)/)?.[1];if(output){const text=Buffer.from(output,"base64").toString("utf8");capture.push({path:req.url,verification:true,text});json(res,{text});return;}
  const question=raw.match(/MOCKQUESTION:([^\r\n]+)/)?.[1]||"What does tannin feel like?";
  capture.push({path:req.url,question});json(res,{text:question});return;
 }
 let body;try{body=JSON.parse(raw);}catch{json(res,{error:"Bad mock body"},400);return;}
 capture.push({path:req.url,body});
 if(req.url==="/v1/responses"){
  const name=body.text?.format?.name;
  if(name==="bottle_label"){
   if(failPhoto){json(res,{},503);return;}
   const value={isWine:!blankLabel,producer:"Photo Estate",name:"Label Reserve",grape:"Cabernet Sauvignon",region:null,vintage:null,confidence:"medium",note:"Vintage is unreadable."};
   json(res,{output:[{content:[{type:"output_text",text:JSON.stringify(value)}]}]});return;
  }
  if(name==="bottle_research"){
   if(failResearch){json(res,{},503);return;}
   json(res,{output:[{type:"web_search_call",action:{sources:[{url:"https://photo-estate.example/wines/reserve"}]}},{content:[{type:"output_text",text:JSON.stringify({facts:[{claim:"Producer lists this cuvée on its website.",url:"https://photo-estate.example/wines/reserve"},{claim:"Invented unsupported fact.",url:"https://invented.example/fake"}]})}]}]});return;
  }
  if(name==="bottle_overview"){
   if(failResearch){json(res,{},503);return;}
   json(res,{output:[{type:"web_search_call",action:{sources:[{url:"https://photo-estate.example/wines/reserve"}]}},{content:[{type:"output_text",text:JSON.stringify({overview:"Meet Label Reserve from Photo Estate. The label details are host confirmed; the exact blend and any unreadable vintage remain unknown. Start by looking at the color, then give the glass a gentle swirl. You may notice fruit, floral, earthy, or spicy aromas, but there is no required answer. Fruit descriptions compare aromas; they do not imply added fruit. Vanilla often comes from oak. Body means how light or weighty the wine feels. Acidity makes your mouth water, while tannin can feel like a drying grip on your gums. Notice which sensations linger in the finish. A useful distinction is to compare freshness with drying grip, rather than treating them as the same sensation. Try a bite of roasted vegetables, then another small sip. Tell me what changes for you.",facts:[{claim:"Producer lists this cuvée on its website.",url:"https://photo-estate.example/wines/reserve"},{claim:"Invented unsupported fact.",url:"https://invented.example/fake"}]})}]}]});return;
  }
  if(name==="bottle_answer"){
   json(res,{output:[{content:[{type:"output_text",text:JSON.stringify({answer:"I’d pair it with roasted mushrooms or a simple steak. Protein and savory flavors can soften the impression of drying tannin. That is typical pairing guidance, and the producer lists this cuvée on its website. Try a bite and a small sip together: does the wine feel smoother to you?",sources:["https://photo-estate.example/wines/reserve","https://invented.example/fake"]})}]}]});return;
  }

  if(body.input?.includes("PROVIDERFAIL")){json(res,{},503);return;}
  const content=body.input?.includes("unexpected")?JSON.stringify({id:"tannin",text:"This is Grenache"}):JSON.stringify({id:"tannin"});
  json(res,{output:[{content:[{type:"output_text",text:content}]}]});return;
 }
 if(req.url==="/v1/audio/speech"){res.writeHead(200,{"Content-Type":"audio/wav"});const text=tamperSpeech?"This is Grenache.":body.input;res.end(Buffer.concat([wav(),Buffer.from("\r\nMOCKOUTPUT:"+Buffer.from(text).toString("base64")+"\r\n")]));return;}
 json(res,{},404);
}).listen(4001,"127.0.0.1");
