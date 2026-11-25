/**
 * hollow-tide-survival-horror: Web Audio API espacial y procedural
 * Genera goteos de agua salina, crujidos de vigas metálicas, pasos en agua/metal,
 * respiración/rugido sordo de La Resaca y tensión musical dinámica según proximidad.
 */

export class SpatialAudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.ambienceGain = null;
    this.isMuted = false;
    this.isInitialized = false;

    // Ambient loop timer
    this.ambienceInterval = null;
    this.tensionLevel = 0.0; // 0.0 (calma) to 1.0 (persecución agresiva)

    // Listener orientation & position cache
    this.listenerPos = { x: 0, y: 0, z: 0 };
  }

  init() {
    if (this.isInitialized) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContextClass();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.85, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(0.75, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      this.ambienceGain = this.ctx.createGain();
      this.ambienceGain.gain.setValueAtTime(0.5, this.ctx.currentTime);
      this.ambienceGain.connect(this.masterGain);

      this.isInitialized = true;
      this.startAbyssalDrone();
      this.startDynamicAmbience();
    } catch (err) {
      console.warn('Web Audio API no soportado o bloqueado:', err);
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    if (!this.masterGain) return false;
    this.isMuted = !this.isMuted;
    this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.85, this.ctx.currentTime);
    return this.isMuted;
  }

  setListenerPosition(x, y, z) {
    this.listenerPos = { x, y, z };
    if (!this.ctx || !this.ctx.listener) return;
    if (this.ctx.listener.positionX) {
      this.ctx.listener.positionX.setValueAtTime(x, this.ctx.currentTime);
      this.ctx.listener.positionY.setValueAtTime(y, this.ctx.currentTime);
      this.ctx.listener.positionZ.setValueAtTime(z, this.ctx.currentTime);
    } else {
      this.ctx.listener.setPosition(x, y, z);
    }
  }

  createPanner(x, y, z) {
    if (!this.ctx) return null;
    const panner = this.ctx.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.refDistance = 3;
    panner.maxDistance = 60;
    panner.rolloffFactor = 1.4;
    panner.coneInnerAngle = 360;

    if (panner.positionX) {
      panner.positionX.setValueAtTime(x, this.ctx.currentTime);
      panner.positionY.setValueAtTime(y, this.ctx.currentTime);
      panner.positionZ.setValueAtTime(z, this.ctx.currentTime);
    } else {
      panner.setPosition(x, y, z);
    }
    return panner;
  }

  /** Drone armónico abisal con modulador binaural */
  startAbyssalDrone() {
    if (!this.ctx) return;
    // Oscilador bajo (55 Hz - La subgrave)
    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(55, this.ctx.currentTime);

    // Filtro pasa-bajos oscuro
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(140, this.ctx.currentTime);
    filter.Q.setValueAtTime(4, this.ctx.currentTime);

    // LFO que modula el filtro como si fuera marea que respira
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.12, this.ctx.currentTime); // Ciclo lento de 8 segundos

    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(60, this.ctx.currentTime);

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    osc1.connect(filter);
    filter.connect(this.ambienceGain);

    osc1.start();
    lfo.start();
  }

  /** Ciclo aleatorio de efectos ambientales diegéticos: goteo de agua, crujido de metal */
  startDynamicAmbience() {
    this.ambienceInterval = setInterval(() => {
      if (!this.ctx || this.isMuted) return;
      const rand = Math.random();
      if (rand < 0.45) {
        this.playWaterDrip();
      } else if (rand < 0.75) {
        this.playMetalGroan();
      }
    }, 3500);
  }

  playWaterDrip() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    // Goteo de tono descendente rápido
    const freq = 1200 + Math.random() * 800;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.4, this.ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.18);

    // Posición estocástica alrededor del oyente
    const angle = Math.random() * Math.PI * 2;
    const dist = 4 + Math.random() * 12;
    const panner = this.createPanner(
      this.listenerPos.x + Math.cos(angle) * dist,
      this.listenerPos.y + 1,
      this.listenerPos.z + Math.sin(angle) * dist
    );

    osc.connect(gain);
    if (panner) {
      gain.connect(panner);
      panner.connect(this.sfxGain);
    } else {
      gain.connect(this.sfxGain);
    }

    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);
  }

  playMetalGroan() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(70 + Math.random() * 30, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(60, this.ctx.currentTime + 1.2);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(220, this.ctx.currentTime);
    filter.Q.setValueAtTime(6, this.ctx.currentTime);

    gain.gain.setValueAtTime(0.001, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.2, this.ctx.currentTime + 0.4);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.4);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ambienceGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 1.5);
  }

  /** Sonido de paso del operador (en seco o con chapoteo de agua según marea) */
  playFootstep(inWater = false, isRunning = false) {
    if (!this.ctx) return;
    const duration = inWater ? 0.22 : 0.12;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.28));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = inWater ? 'bandpass' : 'lowpass';
    filter.frequency.setValueAtTime(inWater ? 650 : 380, this.ctx.currentTime);
    filter.Q.setValueAtTime(inWater ? 2.5 : 1.0, this.ctx.currentTime);

    const gain = this.ctx.createGain();
    const vol = isRunning ? (inWater ? 0.55 : 0.35) : (inWater ? 0.35 : 0.2);
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    noise.start();
  }

  /** Sonido espacial de La Resaca (rugido hidroacústico cuando acecha o persigue) */
  playStalkerScream(x, y, z, isHunting = false) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = isHunting ? 'sawtooth' : 'triangle';
    const startFreq = isHunting ? 340 : 180;
    osc.frequency.setValueAtTime(startFreq, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(70, this.ctx.currentTime + 1.8);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(isHunting ? 800 : 400, this.ctx.currentTime);

    gain.gain.setValueAtTime(isHunting ? 0.7 : 0.35, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.9);

    const panner = this.createPanner(x, y, z);

    osc.connect(filter);
    filter.connect(gain);
    if (panner) {
      gain.connect(panner);
      panner.connect(this.sfxGain);
    } else {
      gain.connect(this.sfxGain);
    }

    osc.start();
    osc.stop(this.ctx.currentTime + 2.0);
  }

  /** Modulación de la música de tensión en función del estado de alerta (0.0 a 1.0) */
  setTension(level) {
    this.tensionLevel = Math.max(0, Math.min(1, level));
    if (!this.musicGain || !this.ctx) return;
    // Aumenta el volumen musical y la opresión sonora
    const targetVol = 0.2 + this.tensionLevel * 0.6;
    this.musicGain.gain.setTargetAtTime(targetVol, this.ctx.currentTime, 0.5);
  }

  /** Efecto al interactuar con interruptores, boyas o válvulas */
  playMechanicalClank() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(140, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.25);
  }

  playDamageSting() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(80, this.ctx.currentTime + 0.3);

    gain.gain.setValueAtTime(0.65, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.45);
  }
}
