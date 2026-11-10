/* HTTP byte-range parsing for browser HTML5 video playback. */
export function parseMediaRange(header,size){
 if(!header)return null;
 if(!Number.isSafeInteger(size)||size<1)return {error:"invalid-size"};
 const match=/^bytes=(\d*)-(\d*)$/.exec(String(header).trim());
 if(!match)return {error:"invalid-range"};
 const first=match[1],last=match[2];
 if(!first&&!last)return {error:"invalid-range"};
 let start,end;
 if(!first){
  const n=Number(last);
  if(!Number.isSafeInteger(n)||n<=0)return {error:"invalid-range"};
  start=Math.max(size-n,0);end=size-1;
 }else{
  start=Number(first);end=last?Number(last):size-1;
  if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>=size||end<start)return {error:"invalid-range"};
  end=Math.min(end,size-1);
 }
 return {start,end,length:end-start+1};
}
