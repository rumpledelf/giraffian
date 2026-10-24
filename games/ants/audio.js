/**
 * Pixel Ants - Procedural Web Audio API Sound Synthesizer
 * Pure vanilla Web Audio, zero external assets.
 */

class AntsAudio {
  constructor() {
    this.ctx = null;
    this.muted = gameStorage.getItem('ants_muted') === 'true';
    this.noteCounter = 0;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    gameStorage.setItem('ants_muted', this.muted);
    return this.muted;
  }

  isMuted() {
    return this.muted;
  }

  // Soft slide/tap when an ant nest is deployed to a staging bay
  playDeploy() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(260, t);
    osc.frequency.exponentialRampToValueAtTime(520, t + 0.12);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.12, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.15);
  }

  // Cute wooden pluck/pop when a bug snatches a matching pixel
  playSnatch(step = 0) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const notes = [440.0, 493.88, 523.25, 587.33, 659.25, 783.99]; // Pentatonic A4 to G5
    const freq = notes[step % notes.length];

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);

    // Quick, rounded bubble-wrap style pluck
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.16, t + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.055);
  }

  // Soft warm kalimba tap when a bug deposits its pixel crumb into the nest
  playDeposit(step = 0) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const notes = [329.63, 392.00, 440.00, 523.25]; // E4, G4, A4, C5
    const freq = notes[step % notes.length];

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.14, t + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.085);
  }

  // Sparkly chime chord when an ant nest completes its quota and packs up
  playNestFull() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6

    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + i * 0.05);

      gain.gain.setValueAtTime(0.001, t + i * 0.05);
      gain.gain.linearRampToValueAtTime(0.15, t + i * 0.05 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.05 + 0.28);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t + i * 0.05);
      osc.stop(t + i * 0.05 + 0.3);
    });
  }

  // Cheerful multi-note arpeggio upon level victory
  playWin() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const arpeggio = [
      { f: 261.63, d: 0.08, delay: 0.00 }, // C4
      { f: 329.63, d: 0.08, delay: 0.09 }, // E4
      { f: 392.00, d: 0.08, delay: 0.18 }, // G4
      { f: 523.25, d: 0.10, delay: 0.27 }, // C5
      { f: 659.25, d: 0.10, delay: 0.36 }, // E5
      { f: 783.99, d: 0.12, delay: 0.45 }, // G5
      { f: 1046.50, d: 0.35, delay: 0.56 }, // C6
    ];

    arpeggio.forEach(note => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note.f, t + note.delay);

      gain.gain.setValueAtTime(0.001, t + note.delay);
      gain.gain.linearRampToValueAtTime(0.18, t + note.delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + note.delay + note.d);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t + note.delay);
      osc.stop(t + note.delay + note.d + 0.02);
    });
  }

  // Gentle muted tap on invalid action
  playInvalid() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(90, t + 0.08);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.06, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.1);
  }
}

window.antsAudio = new AntsAudio();
