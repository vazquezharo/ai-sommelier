import {spawn,spawnSync} from "node:child_process";
import {mkdirSync,readFileSync} from "node:fs";
import https from "node:https";import http from "node:http";
mkdirSync(".review-tls",{recursive:true});
const cert=spawnSync("openssl",["req","-x509","-newkey","rsa:2048","-nodes","-keyout",".review-tls/key.pem","-out",".review-tls/cert.pem","-days","1","-subj","/CN=localhost"],{stdio:"ignore"});if(cert.status!==0)throw Error("Test TLS setup failed");
const children=[spawn(process.execPath,["tests/provider.mjs"],{stdio:"inherit"}),spawn(process.execPath,["node_modules/next/dist/bin/next","start","-p","3000"],{stdio:"inherit",env:{...process.env,CI:"true",SOMMELIER_TEST_MODE:"1"}})];
const server=https.createServer({key:readFileSync(".review-tls/key.pem"),cert:readFileSync(".review-tls/cert.pem")},(req,res)=>{
 const upstream=http.request({hostname:"127.0.0.1",port:3000,path:req.url,method:req.method,headers:{...req.headers,"x-forwarded-proto":"https"}},r=>{res.writeHead(r.statusCode||502,r.headers);r.pipe(res);});
 upstream.on("error",()=>{res.writeHead(502);res.end("Starting test server");});req.pipe(upstream);
}).listen(3443);
for(const signal of ["SIGINT","SIGTERM"])process.on(signal,()=>{for(const child of children)child.kill();server.close();process.exit(0);});
