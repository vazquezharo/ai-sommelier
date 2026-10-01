// Browser-only: resize, convert to JPEG and remove EXIF before any upload.
export async function bottleImage(file:File):Promise<Blob>{
 if(!file.type.startsWith("image/")||!file.size||file.size>20*1024*1024)throw Error("Choose an image under 20 MB.");
 const url=URL.createObjectURL(file);
 try{
  const img=new Image();await new Promise<void>((resolve,reject)=>{img.onload=()=>resolve();img.onerror=()=>reject(Error("This photo format could not be read. Choose a JPEG or PNG, or take a new photo."));img.src=url;});
  const scale=Math.min(1,1600/Math.max(img.naturalWidth,img.naturalHeight));
  const canvas=document.createElement("canvas");canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
  const ctx=canvas.getContext("2d");if(!ctx)throw Error("Photo processing is unavailable. Try another browser.");
  ctx.fillStyle="#fff";ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
  const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error("Photo conversion failed.")),"image/jpeg",0.82));
  if(blob.size>2*1024*1024)throw Error("Photo is too large after resizing. Take a closer photo of just the label.");
  return blob;
 }finally{URL.revokeObjectURL(url);}
}
