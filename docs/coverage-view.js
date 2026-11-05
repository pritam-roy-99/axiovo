/* Present only observed, source-linked counts. Never imply global archive completeness. */
(async function(){
 "use strict";
 const root=document.getElementById("axiovo-coverage");
 if(!root)return;
 const p=(value)=>{const el=document.createElement("p");el.textContent=value;root.append(el);return el};
 const state=p("Loading observed record counts…");
 try{
  const response=await fetch("./data/coverage.json",{cache:"no-store",signal:AbortSignal.timeout(9000)});
  if(!response.ok)throw Error("Coverage manifest unavailable");
  const data=await response.json();
  if(!data.archives||!Number.isInteger(data.total_indexed))throw Error("Invalid coverage data");
  state.textContent=data.total_indexed.toLocaleString()+" indexed source-linked records across available snapshots. These are NOT complete archive totals.";
  const table=document.createElement("table");
  table.className="axiovo-coverage-table";
  const header=document.createElement("thead"),headrow=document.createElement("tr");
  for(const label of ["Source","Processed records","Invalid records","Last metadata sync","Coverage"]){
   const th=document.createElement("th");th.textContent=label;th.scope="col";headrow.append(th);
  }
  header.append(headrow);table.append(header);
  const body=document.createElement("tbody");
  for(const [archive,entry] of Object.entries(data.archives)){
   const row=document.createElement("tr");
   const values=[archive,entry.input_records??"Unknown",entry.invalid_or_unavailable??"Unknown",
      entry.last_sync||"Not available","Partial indexed snapshot"];
   values.forEach(value=>{const cell=document.createElement("td");cell.textContent=String(value);row.append(cell)});
   body.append(row);
  }
  table.append(body);root.append(table);
  p("Tagging: "+(data.tagged||0)+" verified or suggested tags; "+(data.needs_review||0)+" records awaiting ML classification or review. A zero does not mean no papers exist.");
  const link=document.createElement("a");link.href="./data/records/manifest.json";
  link.textContent="View monthly-shard manifest";root.append(link);
 }catch(err){state.textContent="Machine-readable coverage is unavailable for this deployment. Archive search remains available; completeness cannot be claimed.";}
})();
