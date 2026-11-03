/* Optional opt-in research library cloud backup. Disabled until owner configures Supabase. */
(async function(){
"use strict";
const $=id=>document.getElementById(id),cfg=window.ResearchLensSocialConfig||{};
if(!$("lab-cloud-status"))return;
const status=s=>$("lab-cloud-status").textContent=s;
if(!cfg.url||!cfg.anonKey||!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(cfg.url)){
 status("Private cloud sync is not configured. Local research reading and questions remain usable. The site owner must enable the optional Supabase integration.");return;
}
const KEYS=[
 "researchlens-reading-list",
 "researchlens-field-saved-v1",
 "researchlens-library-metadata-v1",
 "researchlens-field-explorer-v1",
 "researchlens-research-projects-v1",
 "researchlens-research-interest-settings-v1",
 "researchlens-pdf-notes-v1",
 "researchlens-alert-seen-v1"
];
try{
 const {createClient}=await import("https://esm.sh/@supabase/supabase-js@2");
 const db=createClient(cfg.url,cfg.anonKey),namespace="research_workspace";
 let user=null;
 function copyLocal(){
  const data={version:1,backed_up_at:new Date().toISOString(),keys:{}};
  for(const key of KEYS){const raw=localStorage.getItem(key);if(raw===null)continue;
   try{data.keys[key]=JSON.parse(raw)}catch{}}
  return data
 }
 async function auth(){
  const result=await db.auth.getUser();user=result.data?.user||null;
  $("lab-cloud-login").hidden=!!user;$("lab-cloud-logout").hidden=!user;
  $("lab-cloud-push").disabled=!user;$("lab-cloud-pull").disabled=!user;
  status(user?"Signed in. Private backups are only accessible to your account.":"Sign in with GitHub to use optional private backups.")
 }
 $("lab-cloud-login").onclick=async()=>{
  const {error}=await db.auth.signInWithOAuth({provider:"github",options:{redirectTo:location.href.split("#")[0]}});
  if(error)status("Sign-in failed: "+error.message)
 };
 $("lab-cloud-logout").onclick=async()=>{await db.auth.signOut();await auth()};
 $("lab-cloud-push").onclick=async()=>{
  if(!user)return;
  if(!confirm("Back up your browser-local research questions, saved papers, notes and preferences to your configured account?"))return;
  const payload=copyLocal();
  if(new Blob([JSON.stringify(payload)]).size>900000){status("Your research backup exceeds the current 900 KB client limit. Export a local JSON backup instead.");return}
  const r=await db.from("research_user_data").upsert({user_id:user.id,namespace,payload,updated_at:new Date().toISOString()});
  status(r.error?"Cloud backup failed: "+r.error.message:"Private backup saved successfully.")
 };
 $("lab-cloud-pull").onclick=async()=>{
  if(!user)return;
  const {data,error}=await db.from("research_user_data").select("payload,updated_at").eq("user_id",user.id).eq("namespace",namespace).maybeSingle();
  if(error){status("Cloud restore failed: "+error.message);return}
  if(!data||!data.payload||data.payload.version!==1){status("No supported account backup found.");return}
  if(!confirm("Restore the backup from "+new Date(data.updated_at).toLocaleString()+"? Existing local reading lists and research notes for matching keys will be replaced."))return;
  for(const key of KEYS){if(!Object.prototype.hasOwnProperty.call(data.payload.keys||{},key))continue;
   localStorage.setItem(key,JSON.stringify(data.payload.keys[key]))}
  status("Backup restored to this browser. Reload My Workspace to see the changes.")
 };
 db.auth.onAuthStateChange((_event,session)=>{\n  user=session?.user||null;\n  $("lab-cloud-login").hidden=!!user;$("lab-cloud-logout").hidden=!user;\n  $("lab-cloud-push").disabled=!user;$("lab-cloud-pull").disabled=!user;\n  status(user?"Signed in. Private cloud backups are available.":"Signed out. Local research data remains in this browser.");\n });
 await auth()
}catch(err){status("Account service unavailable: "+String(err.message||err).slice(0,170))}
})();