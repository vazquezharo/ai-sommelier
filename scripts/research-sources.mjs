// Focused final producer research; never automatically promotes claims to notes.
const seeds=[
 "https://www.vecchiacantinashop.com/en/shop/cantina-del-redi/vini-rossi/rosso-di-montepulciano-cantina-del-redi/",
 "https://www.halosdejupiter.com/en/",
 "https://www.jlohr.com/wines/2023-seven-oaks-cabernet-sauvignon"
];
const seen=new Set();
async function inspect(url,depth=0){
 if(seen.has(url))return;seen.add(url);
 try{
  const r=await fetch(url,{signal:AbortSignal.timeout(15000)});
  if(!r.headers.get("content-type")?.includes("text/html"))return;
  const html=await r.text();
  const text=html.replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/\s+/g," ");
  const specific=/Rosso di Montepulciano|Prugnolo|Sangiovese|Seven Oaks|Grenache|Origin Paso Robles/gi;
  const excerpts=[...text.matchAll(specific)].slice(-12).map(m=>text.slice(Math.max(0,m.index-100),m.index+1800));
  const links=[...html.matchAll(/href=["']([^"']+)["']/gi)].map(m=>{try{const u=new URL(m[1].replace(/&amp;/g,"&"),r.url);u.hash="";return u.href;}catch{return "";}}).filter(u=>/rosso|montepulciano|redi/i.test(u) && !/wp-json|uploads|themes/.test(u));
  console.log(JSON.stringify({candidate:url,finalURL:r.url,status:r.status,links:[...new Set(links)].slice(0,20),excerpts:excerpts.length?excerpts:[text.slice(0,8000)]}));
  if(r.ok&&depth===0&&new URL(r.url).hostname.includes("vecchiacantinashop"))await Promise.all([...new Set(links)].filter(u=>new URL(u).hostname===new URL(r.url).hostname && new URL(u).pathname!==new URL(r.url).pathname).slice(0,4).map(u=>inspect(u,1)));
 }catch(e){console.log(JSON.stringify({candidate:url,error:String(e)}));}
}
await Promise.all(seeds.map(u=>inspect(u)));
