/* Axiovo feed freshness: arXiv announcements are Sun-Thu 20:00 America/New_York.
 * A submittedDate archive is not equivalent to an announcement-date archive.
 * This UI never claims a complete daily announcement without a verified source.
 */
(function(){
 "use strict";
 const ZONE="America/New_York";
 const format=new Intl.DateTimeFormat("en-US",{timeZone:ZONE,weekday:"short",month:"short",day:"numeric",hour:"numeric",minute:"2-digit",hour12:false});
 function announcements(now){
  const times=[];
  const start=Math.floor((now.getTime()-9*86400000)/3600000)*3600000;
  for(let i=0;i<18*24;i++){
   const d=new Date(start+i*3600000);
   const parts=Object.fromEntries(format.formatToParts(d).map(p=>[p.type,p.value]));
   if(["Sun","Mon","Tue","Wed","Thu"].includes(parts.weekday)&&Number(parts.hour)===20&&Number(parts.minute)===0)times.push(d);
  }
  return {last:times.filter(x=>x<=now).at(-1),next:times.find(x=>x>now)};
 }
 const timeFormat=new Intl.DateTimeFormat(undefined,{year:"numeric",month:"short",day:"numeric",hour:"numeric",minute:"2-digit",timeZoneName:"short"});
 const relative=m=>m<60?Math.max(0,Math.floor(m))+" min":m<1440?Math.floor(m/60)+" h":Math.floor(m/1440)+" days";
 function init(){
  if(document.body.classList.contains("axiovo-home"))return;
  const coverage=document.getElementById("coverage")||document.getElementById("arxiv-discovery");
  if(!coverage)return;
  const panel=document.createElement("section");
  panel.setAttribute("aria-label","arXiv synchronization and publication timing");
  panel.style.cssText="border:1px solid var(--rl-border,#cadce7);background:var(--rl-panel,#fff);color:var(--rl-text,#17324b);border-radius:12px;padding:13px 16px;margin:12px 0;font-size:13px;line-height:1.6";
  panel.innerHTML='<strong>arXiv update status</strong><div id="axiovo-feed-times">Checking the feed…</div><div id="axiovo-arxiv-clock"></div><div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:8px"><button class="btn" id="axiovo-check-feed" type="button">Check for new papers</button><a href="https://arxiv.org/list/quant-ph/new" target="_blank" rel="noopener noreferrer">Verify on arXiv</a></div><small id="axiovo-feed-notice">Submission dates and arXiv announcement dates differ. Feed updates may lag official announcements.</small>';
  coverage.parentNode.insertBefore(panel,coverage);
  const times=panel.querySelector("#axiovo-feed-times"),clock=panel.querySelector("#axiovo-arxiv-clock"),notice=panel.querySelector("#axiovo-feed-notice"),check=panel.querySelector("#axiovo-check-feed");
  let currentStamp="";
  let checking=false;
  function updateClock(){
   const now=new Date(),a=announcements(now);
   clock.textContent="Last scheduled announcement: "+(a.last?timeFormat.format(a.last):"unknown")+" · Next: "+(a.next?timeFormat.format(a.next):"unknown")+". arXiv normally announces Sunday–Thursday at 8 PM US Eastern.";
  }
  function easternDate(date){
   const parts=Object.fromEntries(new Intl.DateTimeFormat("en-US",{timeZone:ZONE,year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(date).map(p=>[p.type,p.value]));
   return [parts.year,parts.month,parts.day].join("-");
  }
  async function poll(manual=false){
   if(checking)return;checking=true;check.disabled=true;
   try{
    // Under 2 KB rather than redownloading a multi-megabyte arXiv feed.
    const res=await fetch("./data/source-freshness.json?fresh="+Date.now(),{
     cache:"no-store",signal:AbortSignal.timeout(9000)
    });
    if(!res.ok)throw new Error("HTTP "+res.status);
    const report=await res.json();
    const source=report.sources?.arxiv;
    if(!source?.available)throw new Error("arXiv snapshot unavailable");
    const stamp=source.checked_at||"";
    const updated=stamp?new Date(stamp):null;
    const valid=updated&&!Number.isNaN(updated.getTime());
    const date=/^\d{4}-\d{2}-\d{2}$/.test(source.announcement_date||"")?source.announcement_date:"unknown";
    const mins=valid?(Date.now()-updated.getTime())/60000:null;
    times.textContent="Latest arXiv announcement batch: "+date+" · "+(source.indexed_records??"unknown")+
      " papers · Snapshot checked: "+(valid?timeFormat.format(updated):"not recorded")+
      (mins!==null?" ("+relative(Math.max(0,mins))+" ago)":"")+".";
    const release=announcements(new Date()).last;
    const lastRelease=release?easternDate(release):null;
    // arXiv RSS can be dated one day after an evening Eastern announcement.
    const behind=lastRelease&&date!=="unknown"&&date<lastRelease&&
     Date.now()-release.getTime()>45*60*1000;
    if(behind){
     notice.textContent="Axiovo is behind the latest scheduled arXiv announcement. This batch may be stale. Verify against the official arXiv list.";
    }else if(!source.announcement_complete){
     notice.textContent="The latest arXiv batch is partial or unverified. Do not treat the paper count as complete.";
    }else{
     notice.textContent="Announcement batch verified for the displayed date. This does not certify all historical arXiv submissions.";
    }
    const version=[date,stamp,source.indexed_records,source.announcement_complete].join("|");
    if(currentStamp&&version!==currentStamp){
     notice.textContent="A newer arXiv metadata snapshot is available. Reload Axiovo to display it.";
     if(manual&&window.confirm("Axiovo has updated arXiv metadata. Reload now?"))window.location.reload();
    }
    currentStamp=version;
    if(manual)check.textContent="Checked just now";
   }catch(err){
    times.textContent="Could not verify the latest arXiv metadata. Previously loaded papers may still be available.";
    notice.textContent="No freshness claim can be made while the source manifest is unreachable.";
   }finally{checking=false;check.disabled=false}
  }
  check.addEventListener("click",()=>poll(true));
  updateClock();poll();
  setInterval(()=>{updateClock();if(!document.hidden)poll()},5*60*1000);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden){updateClock();poll()}});
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();