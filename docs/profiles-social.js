/* Optional public profiles and follows, enabled only after Supabase setup. */
(async function(){
const cfg=window.ResearchLensSocialConfig||{};
if(!cfg.url||!cfg.anonKey||!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(cfg.url))return;
const $=id=>document.getElementById(id);
const root=$("hosted-accounts");if(!root)return;
root.hidden=false;
try{
 const {createClient}=await import("https://esm.sh/@supabase/supabase-js@2");
 const db=createClient(cfg.url,cfg.anonKey);
 let user=null,following=new Set();
 const button=$("hosted-save");
 const state=$("hosted-status");
 function make(tag,text,parent){const e=document.createElement(tag);e.textContent=text;parent.append(e);return e}
 async function syncAuth(){
  const auth=await db.auth.getUser();user=auth.data?.user||null;
  $("hosted-login").hidden=!!user;$("hosted-logout").hidden=!user;button.disabled=!user;
  if(!user){state.textContent="Log in with GitHub to store a hosted profile or follow other researchers.";return}
  state.textContent="Signed in as "+(user.user_metadata?.user_name||user.email||"Researcher");
  const {data}=await db.from("research_profiles").select("*").eq("user_id",user.id).maybeSingle();
  if(data){$("public-optin").checked=!!data.is_public;for(const [id,key] of [["name","display_name"],["affiliation","affiliation"],["bio","about"],["orcid","orcid"]])if(data[key]&&!$(id).value)$(id).value=data[key];if(data.interests?.length&&!$("areas").value)$("areas").value=data.interests.join(", ")}
  const follows=await db.from("profile_follows").select("followed_id").eq("follower_id",user.id);
  following=new Set((follows.data||[]).map(x=>x.followed_id));
 }
 $("hosted-login").onclick=async()=>{const r=await db.auth.signInWithOAuth({provider:"github",options:{redirectTo:location.href.split("#")[0]}});if(r.error)state.textContent=r.error.message};
 $("hosted-logout").onclick=async()=>{await db.auth.signOut();await syncAuth();await showResearchers()};
 button.onclick=async()=>{
  if(!user)return;const name=$("name").value.trim();if(name.length<1||name.length>100){state.textContent="Display name must contain 1–100 characters.";return}
  const orcid=$("orcid").value.trim();if(orcid&&!/^https:\/\/orcid\.org\//.test(orcid)){state.textContent="Invalid ORCID address.";return}
  const data={user_id:user.id,display_name:name,affiliation:$("affiliation").value.trim().slice(0,200),about:$("bio").value.trim().slice(0,2000),orcid,interests:$("areas").value.split(",").map(x=>x.trim()).filter(Boolean).slice(0,20),is_public:$("public-optin").checked,updated_at:new Date().toISOString()};
  const r=await db.from("research_profiles").upsert(data);
  state.textContent=r.error?("Profile save failed: "+r.error.message):"Hosted profile saved. Visibility: "+(data.is_public?"public":"private")+".";
  await showResearchers();
 };
 async function showResearchers(){
  const root=$("public-researchers");root.replaceChildren();
  const result=await db.from("research_profiles").select("user_id,display_name,affiliation,interests").eq("is_public",true).order("updated_at",{ascending:false}).limit(40);
  if(result.error){root.textContent="Could not load public profiles.";return}
  const people=result.data||[];
  if(!people.length){root.textContent="No public researcher profiles published yet.";return}
  for(const p of people){
   const row=make("div","",root);row.className="paper";
   const title=make("b",p.display_name,row);title.style.marginRight="8px";
   make("span",p.affiliation||"",row).className="muted";
   const desc=make("p",(p.interests||[]).join(" · "),row);desc.className="muted";
   if(user&&user.id!==p.user_id){
    const btn=make("button",following.has(p.user_id)?"✓ Following":"☆ Follow researcher",row);btn.className="btn";
    btn.onclick=async()=>{
     const old=following.has(p.user_id);
     const r=old?await db.from("profile_follows").delete().eq("follower_id",user.id).eq("followed_id",p.user_id):
       await db.from("profile_follows").insert({follower_id:user.id,followed_id:p.user_id});
     if(r.error){state.textContent=r.error.message;return}
     if(old)following.delete(p.user_id);else following.add(p.user_id);
     btn.textContent=following.has(p.user_id)?"✓ Following":"☆ Follow researcher";
    };
   }
  }
 }
 await syncAuth();await showResearchers();
}catch(err){$("hosted-status").textContent="Account service unavailable: "+String(err.message||err).slice(0,160)}
})();
