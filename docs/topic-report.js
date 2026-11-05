/* Local-first report queue for incorrect research topic suggestions.
 * Public issue submission is always an explicit user action.
 */
(function(root,factory){
 "use strict";
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.AxiovoTopicReport=api;
})(typeof window!=="undefined"?window:null,function(){
 "use strict";
 const KEY="axiovo-topic-reports-v1";
 const REPO="https://github.com/pritam-roy-99/axiovo/issues/new";
 const sources=new Set(["arxiv","biorxiv","chemrxiv"]);
 const trim=(value,n=300)=>String(value||"").trim().slice(0,n);
 function all(storage){
  try{const raw=JSON.parse(storage.getItem(KEY)||"[]");
   return Array.isArray(raw)?raw.filter(x=>x&&typeof x==="object"&&sources.has(x.source)).slice(-300):[];
  }catch{return []}
 }
 function record(storage,p,selectedPath,proposed){
  const source=trim(p?.source,20).toLowerCase(),id=trim(p?.recordId||p?.id,180);
  const url=trim(p?.url,500);
  if(!sources.has(source)||!id||!/^https:\/\//i.test(url))return false;
  const report={source,id,url,title:trim(p?.title,350),
   selected_path:trim(selectedPath,220),
   proposed_topic:trim(proposed,120),
   status:"saved-on-device-not-submitted",
   reported_at:new Date().toISOString()};
  const current=all(storage).filter(x=>!(x.source===source&&x.id===id&&x.selected_path===report.selected_path));
  current.push(report);
  try{storage.setItem(KEY,JSON.stringify(current.slice(-300)));return report}catch{return false}
 }
 function issue(report){
  const u=new URL(REPO);
  const title="Wrong Axiovo topic: "+report.id;
  const body=[
   "Paper: "+report.url,
   "Source: "+report.source,
   "Selected research path: "+(report.selected_path||"not specified"),
   "Suggested correct topic: "+(report.proposed_topic||"not provided"),
   "",
   "This issue was prepared by a researcher. Please verify the official source metadata and topic evidence."
  ].join("\n");
  u.searchParams.set("title",title);u.searchParams.set("body",body);
  return u.href;
 }
 function attach(container,p,selectedPath){
  if(typeof document==="undefined")return;
  const details=document.createElement("details");
  details.className="ex-report-topic";
  const summary=document.createElement("summary");
  summary.textContent="Report wrong topic";
  const form=document.createElement("form");
  const label=document.createElement("label");
  label.textContent="Suggested correct topic (optional)";
  const input=document.createElement("input");
  input.type="text";input.maxLength=120;input.placeholder="e.g. Stochastic thermodynamics";
  label.append(input);
  const submit=document.createElement("button");
  submit.type="submit";submit.textContent="Save topic report on this device";submit.className="rd-button rd-secondary";
  const message=document.createElement("p");
  message.className="rd-small";message.setAttribute("role","status");
  const send=document.createElement("a");
  send.target="_blank";send.rel="noopener noreferrer";send.className="rd-button rd-secondary";
  send.textContent="Submit report on GitHub";send.hidden=true;
  form.append(label,submit,message,send);
  form.addEventListener("submit",event=>{
   event.preventDefault();
   const report=record(localStorage,p,selectedPath,input.value);
   if(!report){message.textContent="Could not save this report. Check browser storage.";return}
   message.textContent="Saved locally. It will not reach maintainers until you open and submit the public GitHub issue.";
   send.href=issue(report);send.hidden=false;
  });
  details.append(summary,form);container.append(details);
 }
 return {KEY,all,record,issue,attach};
});
