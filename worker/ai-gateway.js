/* Optional Axiovo AI gateway. NOT deployed automatically.
 * Provider secrets are Worker environment secrets, never browser variables.
 * Turnstile and rate-control bindings are required; fail closed by default.
 */
const ORIGIN="https://pritam-roy-99.github.io";
const UPSTREAM={
 openrouter:"https://openrouter.ai/api/v1/chat/completions",
 openai:"https://api.openai.com/v1/chat/completions",
 moonshot:"https://api.moonshot.ai/v1/chat/completions",
 gemini:"https://generativelanguage.googleapis.com/v1beta/models"
};
function cors(origin){
 return {
  "Access-Control-Allow-Origin":origin===ORIGIN?ORIGIN:"null",
  "Access-Control-Allow-Methods":"POST,OPTIONS",
  "Access-Control-Allow-Headers":"Content-Type",
  "Vary":"Origin",
  "Cache-Control":"no-store",
  "X-Content-Type-Options":"nosniff"
 };
}
function reply(status,payload,origin){
 return new Response(JSON.stringify(payload),{
  status,headers:{"Content-Type":"application/json; charset=utf-8",...cors(origin)}
 });
}
async function validatedChallenge(token,env,ip){
 const params=new FormData();
 params.set("secret",env.TURNSTILE_SECRET_KEY);
 params.set("response",token);
 if(ip)params.set("remoteip",ip);
 const response=await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify",{
  method:"POST",body:params,signal:AbortSignal.timeout(8000)
 });
 if(!response.ok)return false;
 const result=await response.json();
 return result.success===true&&result.hostname==="pritam-roy-99.github.io";
}
async function allowRate(ip,env){
 if(!env.RATE_LIMIT_KV||!env.RATE_SALT)return false;
 const date=new Date().toISOString().slice(0,10);
 const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(env.RATE_SALT+ip));
 const key="limit:"+date+":"+Array.from(new Uint8Array(digest)).map(x=>x.toString(16).padStart(2,"0")).join("");
 const count=Number(await env.RATE_LIMIT_KV.get(key)||0);
 const max=Math.max(1,Math.min(30,Number(env.DAILY_LIMIT_PER_IP)||8));
 if(count>=max)return false;
 await env.RATE_LIMIT_KV.put(key,String(count+1),{expirationTtl:86400});
 return true;
}
function validateMessages(messages){
 if(!Array.isArray(messages)||messages.length<2||messages.length>16)return null;
 const result=[];
 for(const msg of messages){
  if(!msg||!["user","assistant","system"].includes(msg.role)||typeof msg.content!=="string")return null;
  if(msg.content.length>16000)return null;
  result.push({role:msg.role,content:msg.content});
 }
 return JSON.stringify(result).length<=30000?result:null;
}
async function providerRequest(messages,env){
 const provider=String(env.PROVIDER||"openrouter").toLowerCase();
 if(!Object.hasOwn(UPSTREAM,provider))throw Error("Provider unavailable");
 if(provider!=="openrouter"&&env.ENABLE_PAID_PROVIDERS!=="EXPLICITLY_APPROVED"){
  throw Error("Paid providers are disabled until approved");
 }
 const model=String(env.MODEL||"openrouter/free");
 if(!/^[a-zA-Z0-9][a-zA-Z0-9._:/-]{0,99}$/.test(model))throw Error("Invalid model configuration");
 if(provider==="openrouter"&&model!=="openrouter/free"&&!model.endsWith(":free")){
  throw Error("Non-free models are disabled by default");
 }
 const key=env.API_KEY;
 if(!key)throw Error("Missing secure API key");
 const common={method:"POST",signal:AbortSignal.timeout(65000)};
 let upstream,options;
 if(provider==="gemini"){
  upstream=UPSTREAM.gemini+"/"+encodeURIComponent(model)+":generateContent";
  options={...common,headers:{"Content-Type":"application/json","x-goog-api-key":key},
   body:JSON.stringify({
    systemInstruction:{parts:[{text:"You are a source-grounded research assistant. Never fabricate citations or assert unverified technical claims."}]},
    contents:messages.filter(x=>x.role!=="system").map(x=>({
     role:x.role==="assistant"?"model":"user",parts:[{text:x.content}]
    })),
    generationConfig:{temperature:0.1,maxOutputTokens:1400}
   })};
 }else{
  upstream=UPSTREAM[provider];
  options={...common,headers:{"Content-Type":"application/json","Authorization":"Bearer "+key},
   body:JSON.stringify({model,messages,temperature:0.1,max_tokens:1400,stream:false})};
 }
 const response=await fetch(upstream,options);
 if(response.status===429)return {status:429,answer:null};
 if(!response.ok)return {status:502,answer:null};
 const value=await response.json();
 const text=provider==="gemini"?(value.candidates?.[0]?.content?.parts||[]).map(p=>p.text||"").join(""):value.choices?.[0]?.message?.content;
 if(typeof text!=="string"||!text.trim())return {status:502,answer:null};
 return {status:200,answer:text.slice(0,14000)};
}
export default {
 async fetch(request,env){
  const origin=request.headers.get("Origin")||"";
  const url=new URL(request.url);
  if(request.method==="OPTIONS")return new Response(null,{status:origin===ORIGIN?204:403,headers:cors(origin)});
  if(request.method!=="POST"||url.pathname!=="/v1/answer")return reply(404,{error:"Not found"},origin);
  if(origin!==ORIGIN)return reply(403,{error:"Forbidden origin"},origin);
  if(!env.TURNSTILE_SECRET_KEY||!env.RATE_LIMIT_KV||!env.RATE_SALT||!env.API_KEY){
   return reply(503,{error:"Secure AI gateway not configured"},origin);
  }
  const length=Number(request.headers.get("Content-Length")||0);
  if(length>38000)return reply(413,{error:"Request too large"},origin);
  try{
   const bodyText=await request.text();
   if(bodyText.length>38000)return reply(413,{error:"Request too large"},origin);
   const body=JSON.parse(bodyText);
   const messages=validateMessages(body.messages);
   if(!messages||typeof body.turnstile_token!=="string"||body.turnstile_token.length>3000){
    return reply(400,{error:"Malformed request"},origin);
   }
   const ip=request.headers.get("CF-Connecting-IP")||"";
   if(!(await validatedChallenge(body.turnstile_token,env,ip))){
    return reply(403,{error:"Verification failed"},origin);
   }
   if(!(await allowRate(ip,env)))return reply(429,{error:"Daily request limit reached"},origin);
   const result=await providerRequest(messages,env);
   if(result.status!==200)return reply(result.status,{error:"Provider temporarily unavailable or quota reached"},origin);
   return reply(200,{answer:result.answer,mode:"source-evidence-assisted",model:String(env.MODEL||"openrouter/free")},origin);
  }catch(_){
   // Never log private prompts, token values, API keys or provider response bodies.
   return reply(502,{error:"Research AI gateway unavailable"},origin);
  }
 }
};
