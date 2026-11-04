/* Axiovo user-owned appearance settings: no external scripts or tracking. */
(function(){
 "use strict";
 function init(){
  const root=document.getElementById("axiovo-palette-options"),appearance=window.AxiovoAppearance;
  if(!root||!appearance)return;
  const opts=[["ocean","Ocean","#126f9c"],["forest","Forest","#24775e"],["violet","Violet","#7256b9"],["rose","Rose","#a54f7d"],["amber","Amber","#8f5e16"]];
  function render(){
   root.replaceChildren();
   for(const [value,label,color] of opts){
    const b=document.createElement("button");
    b.type="button";b.className="axiovo-color-option";b.setAttribute("aria-pressed",String(appearance.getPalette()===value));
    b.setAttribute("aria-label","Select "+label+" accent theme");
    const dot=document.createElement("span");dot.className="axiovo-color-swatch";dot.style.background=color;
    b.append(dot,document.createTextNode(label));b.onclick=()=>{appearance.setPalette(value);render()};
    root.append(b);
   }
  }
  render();
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();