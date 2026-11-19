const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync('dist/audio.js', 'utf8');
function fixture({support=true, blockedStorage=false, saved=null}={}) {
  const elements = new Map(), events = new Map(), store = new Map();
  if(saved) store.set('orbita-audio-v1',JSON.stringify(saved));
  const doc={hidden:false,getElementById(id){if(!elements.has(id))elements.set(id,{value:'35',events:{},attrs:{},addEventListener(k,fn){this.events[k]=fn;},setAttribute(k,v){this.attrs[k]=v;}});return elements.get(id);},addEventListener(k,fn){events.set(k,fn);}};
  class Param {constructor(){this.value=0;}setTargetAtTime(v){assert(Number.isFinite(v));this.value=v;}setValueAtTime(v){assert(Number.isFinite(v));this.value=v;}linearRampToValueAtTime(v){assert(Number.isFinite(v));this.value=v;}exponentialRampToValueAtTime(v){assert(v>0&&Number.isFinite(v));this.value=v;}}
  class Node {constructor(){this.gain=new Param();this.frequency=new Param();this.detune=new Param();this.threshold=new Param();this.knee=new Param();this.ratio=new Param();}connect(){}disconnect(){}start(){}stop(when){if(when===undefined&&this.onended)this.onended();}}
  let contexts=0;
  class AudioContext {constructor(){contexts++;this.state='suspended';this.currentTime=0;this.sampleRate=8000;this.destination=new Node();}createGain(){return new Node();}createDynamicsCompressor(){return new Node();}createOscillator(){return new Node();}createBufferSource(){return new Node();}createBiquadFilter(){return new Node();}createBuffer(c,n){return {getChannelData:()=>new Float32Array(n)};}resume(){this.state='running';return Promise.resolve();}suspend(){this.state='suspended';return Promise.resolve();}close(){this.state='closed';return Promise.resolve();}}
  const win={addEventListener(k,fn){events.set(k,fn);}};
  if(support)win.AudioContext=AudioContext;
  const localStorage={getItem(k){if(blockedStorage)throw Error();return store.get(k)||null;},setItem(k,v){if(blockedStorage)throw Error();store.set(k,v);}};
  vm.runInNewContext(source,{window:win,document:doc,localStorage,Math,Number,JSON,Set});
  return {a:win.OrbitaAudio,doc,el:id=>doc.getElementById(id),store,events,count:()=>contexts};
}
const f=fixture(),a=f.a;
assert.equal(f.count(),0,'no autoplay / no context before interaction');
f.events.get('pointerdown')(); assert.equal(f.count(),1);assert.equal(a.ctx.state,'running');
a.setFlight(true); assert(a.engineGain.gain.value>0);
a.thrust(40,60,1200);assert(a.power>0);assert(a.engineFilter.frequency.value>220);
for(const kind of ['select','launch','win','loss','tie','impulse'])a.cue(kind);
assert(a.effects.size>0);a.setFlight(true,true);assert.equal(a.effects.size,0);assert.equal(a.engineGain.gain.value,0);assert.equal(a.ambientGain.gain.value,0);
a.setFlight(true,false);assert(a.engineGain.gain.value>0);
f.el('ambienceToggle').events.click();assert.equal(a.ambientGain.gain.value,0);assert(a.engineGain.gain.value>0);
f.el('soundToggle').events.click();assert.equal(a.master.gain.value,0);assert.equal(a.effects.size,0);
f.el('soundVolume').value='0';f.el('soundVolume').events.input();assert.equal(a.master.gain.value,0);
f.el('soundToggle').events.click();assert.equal(a.master.gain.value,0,'0% stays silent after enabling');
f.el('soundVolume').value='62';f.el('soundVolume').events.input();assert.equal(a.master.gain.value,.62);
f.doc.hidden=true;f.events.get('visibilitychange')();assert.equal(a.ctx.state,'suspended');assert.equal(a.engineGain.gain.value,0);
f.doc.hidden=false;f.events.get('visibilitychange')();assert.equal(a.ctx.state,'running');
for(let i=0;i<30;i++){a.setFlight(true);a.cue('launch');a.setFlight(false);a.cue('win');}assert.equal(f.count(),1,'reuse context across retries');
a.setFlight(false);assert.equal(a.engineGain.gain.value,0);assert.equal(a.effects.size,0);
assert.equal(JSON.parse(f.store.get('orbita-audio-v1')).volume,.62);
const muted=fixture({saved:{enabled:false,ambience:false,volume:.1}});muted.a.cue('launch');assert.equal(muted.count(),0);
const unsupported=fixture({support:false});assert.doesNotThrow(()=>unsupported.a.cue('select'));assert(unsupported.a.failed);
const privateMode=fixture({blockedStorage:true});assert.doesNotThrow(()=>{privateMode.a.cue('select');privateMode.el('soundToggle').events.click();});
console.log('PASS: audio gesture, mute, volume zero, ambience, pause/resume, visibility, persistence, retries, unsupported browser, restricted storage.');
