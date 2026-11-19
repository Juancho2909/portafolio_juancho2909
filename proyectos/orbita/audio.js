'use strict';
// Sonido sintetizado localmente con Web Audio: no requiere descargas ni archivos externos.
(() => {
  class SpaceAudio {
    constructor() {
      this.ctx = null;
      this.effects = new Set();
      this.flight = false;
      this.paused = false;
      this.power = 0;
      this.failed = false;
      let saved = {};
      try { saved = JSON.parse(localStorage.getItem('orbita-audio-v1') || '{}') || {}; } catch (_) {}
      this.enabled = saved.enabled !== false;
      this.ambience = saved.ambience !== false;
      this.volume = Number.isFinite(saved.volume) ? Math.max(0, Math.min(1, saved.volume)) : .35;
      this.bindControls();
      // Los navegadores habilitan audio únicamente después de una interacción real.
      document.addEventListener('pointerdown', () => this.unlock(), {capture: true});
      document.addEventListener('keydown', e => {
        if (['Enter', ' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) this.unlock();
      }, {capture: true});
      document.addEventListener('visibilitychange', () => this.visibility());
      window.addEventListener('pagehide', () => { this.stopEffects(); if (this.ctx) this.ctx.suspend().catch(() => {}); });
      window.addEventListener('pageshow', () => this.visibility());
    }
    save() {
      try { localStorage.setItem('orbita-audio-v1', JSON.stringify({enabled:this.enabled, ambience:this.ambience, volume:this.volume})); } catch (_) {}
    }
    bindControls() {
      const toggle = document.getElementById('soundToggle');
      const ambience = document.getElementById('ambienceToggle');
      const volume = document.getElementById('soundVolume');
      toggle.addEventListener('click', () => {
        this.enabled = !this.enabled;
        this.save();
        if (this.enabled) { this.unlock(); this.cue('select'); } else this.stopEffects();
        this.sync();
      });
      ambience.addEventListener('click', () => {
        this.ambience = !this.ambience;
        this.save(); this.unlock(); this.sync();
      });
      volume.value = Math.round(this.volume * 100);
      volume.addEventListener('input', () => {
        this.volume = Number(volume.value) / 100;
        this.save(); this.unlock(); this.sync();
      });
      this.sync();
    }
    sync() {
      const toggle = document.getElementById('soundToggle');
      toggle.textContent = this.failed ? 'Audio no disponible' : this.enabled ? 'Sonido activado' : 'Sonido silenciado';
      toggle.setAttribute('aria-pressed', String(this.enabled && !this.failed));
      toggle.setAttribute('aria-label', this.enabled ? 'Silenciar sonido' : 'Activar sonido');
      const ambient = document.getElementById('ambienceToggle');
      ambient.setAttribute('aria-pressed', String(this.ambience));
      document.getElementById('volumeValue').textContent = Math.round(this.volume * 100) + '%';
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      this.master.gain.setTargetAtTime(this.enabled && !document.hidden ? this.volume : 0, now, .035);
      this.ambientGain.gain.setTargetAtTime(this.enabled && this.ambience && !document.hidden && !this.paused ? .075 : 0, now, .2);
      this.engineGain.gain.setTargetAtTime(this.enabled && this.flight && !this.paused && !document.hidden ? .13 + this.power * .08 : 0, now, .06);
    }
    unlock() {
      if (!this.enabled || this.failed || document.hidden) return;
      try {
        if (!this.ctx) this.build();
        if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
        this.sync();
      } catch (_) {
        this.failed = true;
        if (this.ctx) this.ctx.close().catch(() => {});
        this.ctx = null;
        this.sync();
      }
    }
    build() {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) throw new Error('Web Audio no disponible');
      const ctx = this.ctx = new Audio();
      this.master = ctx.createGain(); this.master.gain.value = 0;
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -18; limiter.knee.value = 14; limiter.ratio.value = 8;
      this.master.connect(limiter); limiter.connect(ctx.destination);
      this.ambientGain = ctx.createGain(); this.ambientGain.gain.value = 0; this.ambientGain.connect(this.master);
      // Acorde espacial tenue, con modulación lenta y sin bucles de temporizadores.
      [110, 164.81, 220, 277.18].forEach((freq, i) => {
        const osc = ctx.createOscillator(), voice = ctx.createGain();
        osc.type = 'sine'; osc.frequency.value = freq; osc.detune.value = i * 2 - 3;
        voice.gain.value = .20; osc.connect(voice); voice.connect(this.ambientGain);
        const lfo = ctx.createOscillator(), depth = ctx.createGain();
        lfo.frequency.value = .07 + i * .027; depth.gain.value = .045;
        lfo.connect(depth); depth.connect(voice.gain); osc.start(); lfo.start();
      });
      this.engineGain = ctx.createGain(); this.engineGain.gain.value = 0; this.engineGain.connect(this.master);
      const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let smooth = 0;
      for (let i=0; i<data.length; i++) { smooth = .96*smooth + .04*(Math.random()*2-1); data[i] = smooth * 3; }
      const noise = ctx.createBufferSource(); noise.buffer = buffer; noise.loop = true;
      this.engineFilter = ctx.createBiquadFilter(); this.engineFilter.type = 'lowpass'; this.engineFilter.frequency.value = 280;
      noise.connect(this.engineFilter); this.engineFilter.connect(this.engineGain); noise.start();
      this.rumble = ctx.createOscillator(); this.rumble.type = 'triangle'; this.rumble.frequency.value = 46;
      const rumbleGain = ctx.createGain(); rumbleGain.gain.value = .20;
      this.rumble.connect(rumbleGain); rumbleGain.connect(this.engineGain); this.rumble.start();
    }
    note(freq, offset=0, duration=.12, level=.08, type='sine', endFreq=freq) {
      if (!this.ctx || !this.enabled || document.hidden || this.failed) return;
      const ctx=this.ctx, start=ctx.currentTime+offset, osc=ctx.createOscillator(), gain=ctx.createGain();
      osc.type=type; osc.frequency.setValueAtTime(freq,start); osc.frequency.exponentialRampToValueAtTime(Math.max(1,endFreq),start+duration);
      gain.gain.setValueAtTime(0,start); gain.gain.linearRampToValueAtTime(level,start+.015); gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
      osc.connect(gain); gain.connect(this.master); this.effects.add(osc);
      osc.onended=()=>{osc.disconnect();gain.disconnect();this.effects.delete(osc);};
      osc.start(start); osc.stop(start+duration+.03);
    }
    cue(kind) {
      this.unlock();
      if (!this.ctx || !this.enabled || this.failed || document.hidden) return;
      if (kind==='launch') { this.stopEffects(); this.note(65,0,.9,.18,'triangle',180); this.note(330,.08,.16,.07); this.note(660,.25,.25,.07); }
      else if (kind==='win') [523.25,659.25,783.99,1046.5].forEach((f,i)=>this.note(f,i*.15,.4,.10,'triangle'));
      else if (kind==='loss') [392,329.63,261.63].forEach((f,i)=>this.note(f,i*.20,.36,.09,'sine'));
      else if (kind==='tie') [523.25,659.25,523.25].forEach((f,i)=>this.note(f,i*.18,.32,.09));
      else if (kind==='pause') this.note(330,0,.14,.06,'sine',220);
      else if (kind==='resume') this.note(220,0,.16,.06,'sine',440);
      else if (kind==='impulse') this.note(180+this.power*360,0,.075,.025,'sine',260+this.power*420);
      else { this.note(580,0,.085,.055); this.note(870,.045,.10,.035); }
    }
    stopEffects() { for (const osc of this.effects) { try { osc.stop(); } catch (_) {} } this.effects.clear(); }
    setFlight(active, paused=false) { this.flight=active; this.paused=paused; if(!active||paused) this.stopEffects(); this.sync(); }
    thrust(a,b,goal) {
      this.power=Math.max(0,Math.min(1,Math.log1p((a+b)/goal*10)/Math.log(11)));
      if(this.ctx) { const now=this.ctx.currentTime; this.engineFilter.frequency.setTargetAtTime(220+this.power*650,now,.1); this.rumble.frequency.setTargetAtTime(42+this.power*35,now,.1); }
      this.sync(); this.cue('impulse');
    }
    visibility() {
      if (!this.ctx) return;
      this.stopEffects(); this.sync();
      if (document.hidden) this.ctx.suspend().catch(()=>{});
      else if (this.enabled) this.ctx.resume().catch(()=>{});
    }
  }
  window.OrbitaAudio = new SpaceAudio();
})();
