/* Axiovo optional voice input: no audio stored or uploaded by Axiovo. */
(() => {
  'use strict';
  const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Speech) return;
  let active = null;
  const style = document.createElement('style');
  style.textContent = '.axiovo-voice-wrap{position:relative!important;display:inline-flex;align-items:center;min-width:0;max-width:100%}.axiovo-voice-wrap>input,.axiovo-voice-wrap>textarea{padding-right:2.8rem!important;min-width:0}.axiovo-voice-button{position:absolute;right:.35rem;top:50%;transform:translateY(-50%);border:0;border-radius:50%;background:transparent;color:inherit;cursor:pointer;padding:.38rem;display:grid;place-items:center;z-index:2}.axiovo-voice-button:focus-visible{outline:2px solid #28b9d6;outline-offset:2px}.axiovo-voice-button[aria-pressed="true"]{color:#d43d52;background:rgba(212,61,82,.12)}.axiovo-voice-button svg{width:19px;height:19px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}';
  document.head.append(style);
  const icon = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v5m-4 0h8"/></svg>';
  const eligible = el => {
    if (!el || el.disabled || el.readOnly || el.closest('.axiovo-voice-wrap')) return false;
    const hint = [el.placeholder,el.getAttribute('aria-label'),el.id,el.name].filter(Boolean).join(' ').toLowerCase();
    return el.matches('input[type="search"]') || (el.matches('input[type="text"],input:not([type]),textarea') && /search|query|ask|question|prompt|author|paper|topic|research|find|filter/.test(hint) && !/password|email|url|date/.test(hint));
  };
  function attach(el) {
    if (!eligible(el)) return;
    const parent = el.parentNode;
    if (!parent) return;
    const wrap = document.createElement('span');
    wrap.className = 'axiovo-voice-wrap';
    const computed = getComputedStyle(el);
    wrap.style.width = computed.width === 'auto' ? '100%' : computed.width;
    if (el.tagName === 'TEXTAREA') wrap.style.alignItems = 'stretch';
    parent.insertBefore(wrap,el);
    wrap.append(el);
    const button = document.createElement('button');
    button.type='button';button.className='axiovo-voice-button';
    button.innerHTML=icon;button.setAttribute('aria-label','Start voice input');
    button.setAttribute('title','Voice input (browser speech service may process audio)');
    button.setAttribute('aria-pressed','false');
    wrap.append(button);
    button.addEventListener('click',()=>{
      if(active){active.recognition.abort();if(active.button===button){active=null;button.setAttribute('aria-pressed','false');return;}active.button.setAttribute('aria-pressed','false');active=null;}
      if(!window.confirm('Voice input uses your browser’s speech recognition service, which may send audio to its provider. Axiovo does not record or store audio. Continue?'))return;
      const recognition = new Speech();
      recognition.lang=document.documentElement.lang||navigator.language||'en-US';
      recognition.interimResults=false;recognition.continuous=false;recognition.maxAlternatives=1;
      active={recognition,button};
      button.setAttribute('aria-pressed','true');button.setAttribute('aria-label','Stop voice input');
      recognition.onresult=e=>{
        const transcript=e.results?.[0]?.[0]?.transcript;
        if(!transcript)return;
        const setter=Object.getOwnPropertyDescriptor(el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value')?.set;
        if(setter)setter.call(el,transcript);else el.value=transcript;
        el.dispatchEvent(new Event('input',{bubbles:true}));
        el.dispatchEvent(new Event('change',{bubbles:true}));
        el.focus();
      };
      recognition.onerror=e=>{if(e.error!=='aborted' && e.error!=='no-speech')button.title='Voice input: '+e.error;};
      recognition.onend=()=>{button.setAttribute('aria-pressed','false');button.setAttribute('aria-label','Start voice input');if(active?.recognition===recognition)active=null;};
      try{recognition.start();}catch(_){recognition.onend();}
    });
  }
  function scan(root=document){if(root.matches?.('input,textarea'))attach(root);root.querySelectorAll?.('input,textarea').forEach(attach);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>scan());else scan();
  const observer=new MutationObserver(records=>{for(const r of records)for(const node of r.addedNodes)if(node.nodeType===1 && !node.closest?.('.axiovo-voice-wrap'))scan(node);});
  observer.observe(document.documentElement,{childList:true,subtree:true});
})();