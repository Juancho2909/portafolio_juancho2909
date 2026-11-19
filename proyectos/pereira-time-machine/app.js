"use strict";

const $=id=>document.getElementById(id);
const map=new Diorama.View($("map"));
const sound=new JourneySound();
const media=window.matchMedia("(prefers-reduced-motion: reduce)");
const icon=name=>'<svg aria-hidden="true"><use href="#i-'+name+'"/></svg>';
const state={era:null,stop:0,position:0,segment:null,phase:"ready"};
const eraButtons=[];
let pinButtons=[];
let lastDraw=-Infinity;
let dialogTrigger=null;
let activeVoice=null;

function element(tag,text,cls) {
  const node=document.createElement(tag);
  if(text)node.textContent=text;
  if(cls)node.className=cls;
  return node;
}
function external(title,url) {
  const a=element("a",title);
  a.href=url;
  a.target="_blank";
  a.rel="noopener noreferrer";
  return a;
}
function silence(){
  activeVoice=null;
  window.speechSynthesis?.cancel();
  sound.voice(false);
}
function showDialog(title,trigger){
  dialogTrigger=trigger;
  $("dialog-title").textContent=title;
  $("dialog-body").replaceChildren();
  $("dialog").showModal();
  return $("dialog-body");
}
function showPhoto(photo,button){
  const body=showDialog(photo.title,button);
  if(photo.src){
    const image=element("img");
    image.alt=photo.title;
    image.src=photo.src;
    image.addEventListener("error",()=>image.replaceWith(element("p","Abre la fuente para consultar la imagen.")),{once:true});
    body.append(image);
  }
  body.append(element("p",photo.credit),element("p",photo.usage));
  const links=element("p");
  links.append(external("Abrir ficha o publicación original ↗",photo.url));
  if(photo.license)links.append(" · ",external("CC BY-SA "+(photo.license.includes("/3.0/")?"3.0":"4.0"),photo.license));
  body.append(links);
}
const vehicleDetails={
  mule:"Mira las dos cargas a los lados de la mula y las correas que las sujetan.",
  train:"Acércate a la cabina, la chimenea, los ejes y el ténder que acompaña a la locomotora.",
  tram:"Gira el coche para ver las ventanas, las puertas y la toma de corriente del techo.",
  bus:"Observa la puerta de pasajeros, las ventanillas, las luces y el parachoques.",
  taxi:"Compara el aviso sobre el techo, el parabrisas y las luces de ambos extremos.",
  megabus:"Fíjate en el fuelle que une las dos secciones y en las puertas de pasajeros.",
  cable:"Explora los ventanales y el brazo superior que sujeta la cabina al sistema de cable."
};
const landmarkDetails={
  capilla:"Observa la torre, la entrada y la cubierta de la capilla recreada.",
  ranchos:"Gira para comparar los volúmenes y las cubiertas de las viviendas del caserío.",
  station:"Fíjate en el corredor elevado, los postes y el alero frente al andén.",
  warehouse:"Acércate al andén de carga para ver las cajas apiladas junto a la bodega.",
  coffee:"Observa la chimenea y los bultos en el exterior de la trilladora.",
  "station-clock":"Acércate a la torre del reloj, las ventanas y los cuerpos laterales del edificio.",
  "plaza-old":"Observa los jardines, los senderos y la fuente en la recreación de la plaza.",
  plaza:"Explora cómo se relacionan la plaza, el monumento y la catedral.",
  church:"Gira la catedral para ver sus torres y la cubierta de la nave.",
  market:"Acércate a los puestos para ver los toldos, los mostradores y sus productos.",
  "river-park":"Gira la escena para ver el mirador y el borde del río en la recreación.",
  bridge:"Compara las torres, los tirantes, el tablero de circulación y las rampas.",
  stadium:"Gira el estadio para ver la cancha, la pista atlética y las graderías escalonadas. La cubierta ilustra las bóvedas de la tribuna occidental anterior a la remodelación de 2011.",
  terminal:"Observa los accesos, la cubierta de espera y el frente de la estación.",
  cable:"Fíjate en los pilares, los vanos y la cubierta del acceso."
};
const eraModels=HISTORY.map(era=>[
  {id:"vehicle",kind:"vehicle",name:era.transport,category:"Transporte",description:vehicleDetails[era.vehicle]},
  ...era.stops.flatMap((stop,index)=>{
    const list=[{
      id:"stop-"+index,kind:"landmark",landmark:stop.landmark,name:stop.name,
      category:"Parada "+(index+1),description:landmarkDetails[stop.landmark]
    }];
    if(stop.landmark==="plaza")list.push(
      {id:"monument",kind:"monument",name:"Bolívar Desnudo",category:"Escultura",
        description:"Rodrigo Arenas Betancourt · Bronce · 1963. Gira para ver el jinete, el caballo y los pliegues de la base."},
      {id:"cathedral",kind:"landmark",landmark:"church",name:"Catedral Nuestra Señora de la Pobreza",
        category:"Edificio",description:landmarkDetails.church}
    );
    return list;
  })
]);

function showModels(initialId,trigger){
  const era=state.era;
  const models=eraModels[era.index];
  const initial=models.find(model=>model.id===initialId);
  if(!initial)return;
  const modal=$("dialog");
  modal.classList.add("model-dialog");
  const body=showDialog(initial.name,trigger);
  const layout=element("div",null,"model-layout");
  const gallery=element("div",null,"model-gallery");
  const list=element("div",null,"model-list");
  list.setAttribute("role","group");
  list.setAttribute("aria-label","Modelos de "+era.period);
  gallery.append(element("h3","Modelos de la época"),element("p",era.period,"model-era"),list);
  const view=element("div",null,"model-view");
  const display=element("div",null,"model-display");
  const canvas=element("canvas");
  canvas.tabIndex=0;
  const controls=element("div",null,"model-tools");
  const caption=element("p",null,"model-caption");
  const current=element("p",null,"sr-only");
  current.setAttribute("aria-live","polite");
  const camera=new Diorama.View(canvas);
  camera.redraw=()=>camera.drawModel();
  let selected=initial;
  const reset=()=>{
    camera.reset();
    camera.tilt=selected.landmark==="stadium"?.64:.42;
    camera.redraw();
  };
  const actions=[
    ["plus","Acercar modelo",()=>camera.magnify(1.20)],
    ["minus","Alejar modelo",()=>camera.magnify(1/1.20)],
    ["compass","Restablecer vista del modelo",reset]
  ];
  for(const [glyph,label,action] of actions){
    const button=element("button",null,"step-control");
    button.type="button";
    button.setAttribute("aria-label",label);
    button.title=label;
    button.innerHTML=icon(glyph);
    button.addEventListener("click",()=>{
      action();
      camera.redraw();
    });
    controls.append(button);
  }
  const buttons=models.map(model=>{
    const button=element("button",null,"model-option");
    button.type="button";
    button.append(element("small",model.category),element("strong",model.name));
    button.addEventListener("click",()=>selectModel(model,true));
    list.append(button);
    return button;
  });
  function selectModel(model,announce=false){
    selected=model;
    $("dialog-title").textContent=model.name;
    caption.textContent=model.description;
    canvas.setAttribute("aria-label",model.name+" en 3D. Usa las flechas del teclado para girar.");
    for(const [i,button] of buttons.entries())button.setAttribute("aria-pressed",String(models[i]===model));
    camera.setModel(Diorama.modelFaces(era,model));
    reset();
    if(announce)current.textContent="Modelo seleccionado. "+model.name+".";
  }
  display.append(canvas,controls);
  view.append(display,element("p","Arrastra o usa las flechas para girar.","model-help"),caption,current);
  layout.append(view,gallery);
  body.append(layout);
  bindOrbit(canvas,(dx,dy)=>{
    camera.orbit(dx,dy);
    camera.redraw();
  });
  selectModel(initial);
  modal.addEventListener("close",()=>{
    camera.resizeObserver.disconnect();
    modal.classList.remove("model-dialog");
  },{once:true});
}
function showSources(){
  const body=showDialog("Fuentes y metodología",$("open-sources"));
  body.append(element("p","Los edificios y vehículos son recreaciones esquemáticas hechas a partir de referencias documentales y visuales. El visor amplía cada modelo y agrega detalles ilustrativos. Cada ficha explica qué parte de la escena orienta la referencia y cuándo la imagen corresponde a otra época."));
  body.append(element("p","La ubicación de las paradas, la distancia y las conexiones se simplificaron. Los diálogos son escenas ficticias escritas a partir del contexto de cada época. Las referencias lingüísticas orientaron el trato entre personajes y el ritmo de las conversaciones."));
  const language=element("p");
  language.append(external("Habla coloquial pereirana · Cuadernos de Lingüística Hispánica ↗","https://dialnet.unirioja.es/descarga/articulo/10058188.pdf"));
  body.append(language);
  body.append(element("p","Los fondos ambientales y los sonidos de la mula, el tren y el tranvía son sintetizados. Para los otros vehículos se editaron grabaciones reales de referencia."));
  const recording=JourneySound.recording(state.era.vehicle);
  if(recording){
    const credit=element("p",recording.detail+" ");
    credit.append(external(recording.title+" · "+recording.author+" ↗",recording.url),
      " · ",external("CC0", "https://creativecommons.org/publicdomain/zero/1.0/"));
    body.append(credit);
  }
  body.append(element("h3",state.era.period+" · "+state.era.label));
  const list=element("ul");
  for(const [title,url] of state.era.sources){
    const item=element("li");
    item.append(external(title+" ↗",url));
    list.append(item);
  }
  body.append(list);
}

function updateControls(){
  const {era,stop,phase,segment}=state;
  const labels={ready:["play","Iniciar viaje"],moving:["pause","Pausar"],paused:["play","Reanudar"],arrived:["play","Continuar"],finished:["reset","Repetir viaje"]};
  const [symbol,label]=labels[phase];
  $("play").innerHTML=icon(symbol)+"<span>"+label+"</span>";
  $("prev").disabled=stop===0 && !segment;
  $("next").disabled=stop===era.stops.length-1;
  $("route-count").textContent="Parada "+(stop+1)+" de "+era.stops.length;
  sound.update(era,stop,phase,state.segment);
}
function speakDialogue(lines){
  silence();
  const session={};
  activeVoice=session;
  const play=index=>{
    if(activeVoice!==session)return;
    if(index===lines.length){
      activeVoice=null;
      sound.voice(false);
      return;
    }
    const phrase=new SpeechSynthesisUtterance(lines[index]);
    phrase.lang="es-CO";
    phrase.rate=index===1?1:.94;
    phrase.pitch=index===1?1.08:1;
    phrase.addEventListener("start",()=>{
      if(activeVoice===session)sound.voice(true);
    });
    phrase.addEventListener("end",()=>play(index+1));
    phrase.addEventListener("error",()=>{
      if(activeVoice===session)silence();
    });
    window.speechSynthesis.speak(phrase);
  };
  play(0);
}

function renderDialogue(stop){
  const [opening,question,reply]=stop.dialogue;
  const dialogue=$("npc-line");
  dialogue.hidden=true;
  const name=stop.npc.split(" · ")[0];
  const answer=element("div",null,"dialogue-answer");
  answer.id="npc-answer";
  answer.hidden=true;
  answer.append(element("strong",name),element("p",reply));
  const ask=element("button",question,"dialogue-question");
  ask.type="button";
  ask.setAttribute("aria-controls",answer.id);
  ask.setAttribute("aria-expanded","false");
  ask.addEventListener("click",()=>{
    answer.hidden=!answer.hidden;
    ask.setAttribute("aria-expanded",String(!answer.hidden));
    if(answer.hidden)silence();
  });
  dialogue.replaceChildren(element("p",opening),element("span","TU PREGUNTA","dialogue-label"),ask,answer);
  if(window.speechSynthesis&&"SpeechSynthesisUtterance" in window){
    const voice=element("button","Reproducir voz","line-button speak");
    voice.type="button";
    voice.addEventListener("click",()=>speakDialogue(answer.hidden?[opening]:stop.dialogue));
    dialogue.append(voice);
  }
}

function renderStop(announce=true){
  const {era,stop}=state;
  const info=era.stops[stop];
  silence();
  $("place-kicker").textContent=era.period.toUpperCase()+" / "+(stop+1)+" DE "+era.stops.length;
  $("place-title").textContent=info.name;
  $("place-context").textContent=info.context;
  $("open-place-model").querySelector("span").textContent=info.landmark==="plaza"
    ?"Explorar el monumento en 3D":"Explorar la parada en 3D";
  $("npc-name").textContent=info.npc;
  $("npc-map").setAttribute("aria-label","Conversar con "+info.npc);
  $("npc-open").setAttribute("aria-expanded","false");
  $("npc-open").innerHTML="Conversar "+icon("link");
  renderDialogue(info);
  const photos=$("photos");
  photos.replaceChildren();
  $("archive-title").lastChild.textContent=era.index===0?" Archivo documental":" Archivo visual";
  for(const [i,photo] of info.photos.entries()){
    const button=element("button",null,"photo");
    button.type="button";
    if(photo.src && i===0){
      const wrap=element("span",null,"image-wrap");
      wrap.innerHTML=icon("image");
      const img=element("img");
      img.alt="";
      img.src=photo.src;
      img.addEventListener("error",()=>{
        wrap.remove();
      },{once:true});
      wrap.append(img);
      button.append(wrap);
    }
    const label=element("span",photo.title,"photo-details");
    label.insertAdjacentHTML("beforeend",icon("link"));
    button.append(label);
    button.addEventListener("click",()=>showPhoto(photo,button));
    photos.append(button);
  }
  if(era.index===0)photos.append(element("p","La escena fundacional se documenta con fuentes escritas y cartográficas.","archive-note"));
  for(const [i,pin] of pinButtons.entries())pin.setAttribute("aria-pressed",String(i===stop));
  if(announce)$("announcement").textContent="Parada "+(stop+1)+" de "+era.stops.length+". "+info.name+".";
  updateControls();
}

function selectStop(index) {
  if(!state.era.stops[index])return;
  state.stop=index;
  state.segment=null;
  state.position=state.era.stops[index].x;
  state.phase=index===0?"ready":index===state.era.stops.length-1?"finished":"arrived";
  renderStop();
}
function selectEra(index,announce=true){
  const era=HISTORY[index];
  state.era=era;
  state.stop=0;
  state.position=era.stops[0].x;
  state.segment=null;
  state.phase="ready";
  map.reset();
  map.setEra(era);
  for(const [i,button] of eraButtons.entries())button.setAttribute("aria-pressed",String(i===index));
  $("map-era").textContent=era.label;
  $("vehicle-icon").textContent=era.icon;
  $("vehicle-name").textContent=era.transport;
  $("open-vehicle-model").setAttribute("aria-label","Ver transporte en 3D. "+era.transport);
  $("open-vehicle-model").title="Ver transporte en 3D";
  const pins=$("pins");
  pins.replaceChildren();
  pinButtons=era.stops.map((stop,i)=>{
    const pin=element("button",null,"map-pin");
    pin.type="button";
    pin.append(element("span",i+1),document.createTextNode(stop.short));
    pin.setAttribute("aria-label","Parada "+(i+1)+": "+stop.name);
    pin.addEventListener("click",()=>selectStop(i));
    pins.append(pin);
    return pin;
  });
  renderStop(announce);
}
function toggleJourney(){
  if(state.phase==="moving"){
    state.phase="paused";
    state.segment.last=null;
  }else{
    if(state.phase==="finished"){
      state.stop=0;
      state.position=state.era.stops[0].x;
      renderStop(false);
    }
    if(!state.segment){
      const from=state.position,to=state.era.stops[state.stop+1].x;
      state.segment={from,to,elapsed:0,duration:Math.max(3300,Math.abs(to-from)*92),last:null};
    }
    state.segment.last=performance.now();
    state.phase="moving";
  }
  updateControls();
}
const landmarkPins={bridge:[13.8,2.5],cable:[7.6,-7.2],"station-clock":[11.5,-7.2],stadium:[9.3,-14]};
function animate(ms){
  const {era,segment,phase}=state;
  if(phase==="moving" && segment){
    if(segment.last!==null)segment.elapsed+=Math.max(0,ms-segment.last);
    segment.last=ms;
    const t=Math.min(segment.elapsed/segment.duration,1);
    const smooth=t*t*(3-2*t);
    state.position=segment.from+(segment.to-segment.from)*smooth;
    if(t===1){
      state.stop++;
      state.segment=null;
      state.phase=state.stop===era.stops.length-1?"finished":"arrived";
      renderStop();
    }
  }
  if(ms-lastDraw>30){
    lastDraw=ms;
    map.draw(state.position,ms/1000,state.phase==="moving",media.matches);
    for(const [i,pin] of pinButtons.entries()){
      const stop=era.stops[i];
      const [offset,z]=landmarkPins[stop.landmark]||[7.35,-7.2];
      const [x,y]=map.project(stop.x,offset,z);
      pin.style.left=Math.max(40,Math.min(map.w-40,x))+"px";
      pin.style.top=Math.max(83,Math.min(map.h-33,y))+"px";
    }
    const npcButton=$("npc-map");
    const [nx,ny]=map.project(era.stops[state.stop].x-4.3,2.25,8.65);
    const npcVisible=nx>24 && nx<map.w-24 && ny>110 && ny<map.h-14;
    npcButton.style.visibility=npcVisible?"visible":"hidden";
    if(npcVisible){
      npcButton.style.left=nx+"px";
      npcButton.style.top=ny+"px";
    }
    $("north-arrow").style.transform="rotate("+(-map.angle*180/Math.PI)+"deg)";
    const first=era.stops[0].x,last=era.stops.at(-1).x;
    $("route-progress").value=(state.position-first)/(last-first);
  }
  requestAnimationFrame(animate);
}
for(const [i,era] of HISTORY.entries()){
  const button=element("button",null,"era");
  button.type="button";
  button.append(element("span",era.period,"period"),element("span",era.caption,"caption"));
  button.addEventListener("click",()=>selectEra(i));
  $("eras").append(button);
  eraButtons.push(button);
}
$("eras").addEventListener("keydown",event=>{
  if(!["ArrowLeft","ArrowRight","Home","End"].includes(event.key))return;
  const delta=event.key==="ArrowLeft"?-1:1;
  const index=eraButtons.indexOf(document.activeElement);
  if(index<0)return;
  event.preventDefault();
  const next=event.key==="Home"?0:event.key==="End"?eraButtons.length-1:(index+delta+eraButtons.length)%eraButtons.length;
  eraButtons[next].focus();
  selectEra(next);
});
$("play").addEventListener("click",toggleJourney);
$("prev").addEventListener("click",()=>selectStop(state.segment?state.stop:state.stop-1));
$("next").addEventListener("click",()=>selectStop(state.stop+1));
$("zoom-in").addEventListener("click",()=>map.magnify(1.18));
$("zoom-out").addEventListener("click",()=>map.magnify(1/1.18));
$("reset-camera").addEventListener("click",()=>map.reset());
$("open-sources").addEventListener("click",showSources);
$("open-vehicle-model").addEventListener("click",event=>showModels("vehicle",event.currentTarget));
$("open-place-model").addEventListener("click",event=>{
  const stop=state.era.stops[state.stop];
  showModels(stop.landmark==="plaza"?"monument":"stop-"+state.stop,event.currentTarget);
});
const soundButton=$("sound-toggle");
soundButton.hidden=!sound.supported;
soundButton.addEventListener("click",async ()=>{
  await sound.toggle();
  soundButton.setAttribute("aria-pressed",String(sound.enabled));
  soundButton.querySelector("use").setAttribute("href",sound.enabled?"#i-volume":"#i-muted");
  $("announcement").textContent=sound.failed?"No fue posible activar el sonido.":sound.enabled?"Sonido ambiental activado.":"Sonido ambiental desactivado.";
});
document.addEventListener("visibilitychange",()=>sound.sync());
$("dialog-close").addEventListener("click",()=>$("dialog").close());
$("dialog").addEventListener("close",()=>dialogTrigger?.focus());
$("dialog").addEventListener("click",event=>{
  if(event.target===$("dialog")){
    const box=$("dialog").getBoundingClientRect();
    if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)$("dialog").close();
  }
});
$("npc-open").addEventListener("click",()=>{
  const open=$("npc-line").hidden;
  $("npc-line").hidden=!open;
  $("npc-open").setAttribute("aria-expanded",String(open));
  $("npc-open").innerHTML=open?"Cerrar diálogo "+icon("close"):"Conversar "+icon("link");
  if(!open)silence();
});
$("npc-map").addEventListener("click",()=>{
  if($("npc-line").hidden)$("npc-open").click();
  $("npc-open").focus();
});
function bindOrbit(canvas,onOrbit){
  let pointer=null;
  canvas.addEventListener("keydown",event=>{
    const controls={ArrowLeft:[-14,0],ArrowRight:[14,0],ArrowUp:[0,-14],ArrowDown:[0,14]};
    if(controls[event.key]){
      event.preventDefault();
      onOrbit(...controls[event.key]);
    }
  });
  canvas.addEventListener("pointerdown",event=>{
    if(!event.isPrimary || event.button!==0)return;
    canvas.setPointerCapture(event.pointerId);
    canvas.classList.add("dragging");
    pointer={x:event.clientX,y:event.clientY,id:event.pointerId};
  });
  canvas.addEventListener("pointermove",event=>{
    if(pointer?.id!==event.pointerId)return;
    onOrbit(event.clientX-pointer.x,event.clientY-pointer.y);
    pointer.x=event.clientX;
    pointer.y=event.clientY;
  });
  canvas.addEventListener("lostpointercapture",event=>{
    if(pointer?.id!==event.pointerId)return;
    pointer=null;
    canvas.classList.remove("dragging");
  });
}
bindOrbit($("map"),(dx,dy)=>map.orbit(dx,dy));
selectEra(1,false);
requestAnimationFrame(animate);
