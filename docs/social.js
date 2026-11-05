/* Optional hosted Axiovo accounts. Requires Supabase setup by repository owner. */
(async function(){
const cfg=window.AxiovoSocialConfig||{};
if(!cfg.url||!cfg.anonKey)return;
if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(cfg.url))return;
const root=document.getElementById("native-community");if(!root)return;
const status=document.getElementById("native-state");
const id=new URLSearchParams(location.search).get("id");
if(!id||! /^(?:\d{4}\.\d{4,5}|[a-z-]+(?:\.[a-z]{2})?\/\d{7})$/i.test(id))return;
const b=document.getElementById("native-vote"),signin=document.getElementById("native-login"),
  logout=document.getElementById("native-logout"),send=document.getElementById("native-post"),
  textarea=document.getElementById("native-message"),messages=document.getElementById("native-messages");
const add=(tag,text,parent,cls)=>{const e=document.createElement(tag);e.textContent=text;if(cls)e.className=cls;parent.append(e);return e};
try{
 const {createClient}=await import("https://esm.sh/@supabase/supabase-js@2");
 const db=createClient(cfg.url,cfg.anonKey);
 let user=null,voted=false;
 async function syncAuth(){
  const auth=await db.auth.getUser();user=auth.data?.user||null;
  signin.hidden=!!user;logout.hidden=!user;b.disabled=!user;send.disabled=!user;
  status.textContent=user?"Signed in with GitHub · "+(user.user_metadata?.user_name||user.email||"researcher"):"Sign in with GitHub to endorse or comment. Public records are visible without an account.";
 }
 async function render(){
  const [votes,comments]=await Promise.all([
   db.from("paper_votes").select("user_id",{count:"exact"}).eq("paper_id",id),
   db.from("paper_comments").select("id,body,user_id,created_at").eq("paper_id",id).order("created_at",{ascending:false}).limit(80)
  ]);
  if(votes.error||comments.error)throw Error(votes.error?.message||comments.error?.message);
  voted=!!user&&votes.data.some(x=>x.user_id===user.id);
  b.textContent=(voted?"♥ Endorsed":"♡ Endorse")+" · "+(votes.count||0);
  messages.replaceChildren();
  const c=comments.data||[];
  add("h3",c.length+" public comments (up to 80 shown)",messages);
  const ids=[...new Set(c.map(x=>x.user_id))];
  const names={};
  if(ids.length){
   const profiles=await db.from("research_profiles").select("user_id,display_name").in("user_id",ids);
   for(const p of profiles.data||[])names[p.user_id]=p.display_name;
  }
  for(const item of c){
   const wrapper=add("div","",messages,"related");
   add("b",names[item.user_id]||("Researcher "+item.user_id.slice(0,6)),wrapper);
   add("span"," · "+new Date(item.created_at).toLocaleString(),wrapper,"muted");
   add("p",item.body,wrapper);
  }
 }
 signin.onclick=async()=>{const {error}=await db.auth.signInWithOAuth({provider:"github",options:{redirectTo:location.href.split("#")[0]}});if(error)status.textContent=error.message};
 logout.onclick=async()=>{await db.auth.signOut();await syncAuth();await render()};
 b.onclick=async()=>{if(!user)return;const result=voted?await db.from("paper_votes").delete().eq("user_id",user.id).eq("paper_id",id):await db.from("paper_votes").insert({paper_id:id,user_id:user.id});if(result.error){status.textContent=result.error.message;return}await render()};
 send.onclick=async()=>{if(!user)return;const body=textarea.value.trim();if(body.length<3||body.length>4000){status.textContent="Comments must contain 3 to 4,000 characters.";return}send.disabled=true;const result=await db.from("paper_comments").insert({paper_id:id,user_id:user.id,body});if(result.error)status.textContent=result.error.message;else{textarea.value="";status.textContent="Comment published."}send.disabled=false;await render()};
 root.hidden=false;await syncAuth();await render();
}catch(err){root.hidden=false;status.textContent="Native social backend unavailable: "+String(err.message||err).slice(0,180)+". GitHub Discussions/Issues remain available."}
})();
