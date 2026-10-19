/**
 * Tile Pile Match - Procedural Web Audio API Sound Synthesizer
 * Zero external audio assets, pure browser synthesis.
 */

class TilepileAudio {
  constructor() {
    this.ctx = null;
    this.muted = localStorage.getItem('tilepile_muted') === 'true';
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem('tilepile_muted', this.muted);
    return this.muted;
  }

  isMuted() {
    return this.muted;
  }

  // Soft tone helper with exponential decay
  tone(freq, start, duration, volume = 0.1, type = 'sine') {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(start);
    osc.stop(start + duration);
  }

  // Pleasant crisp tile pick sound (ceramic/wood click)
  playTileTap() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.tone(620, t, 0.05, 0.12, 'triangle');
    this.tone(1240, t + 0.01, 0.04, 0.06, 'sine');
  }

  // Soft thud/clack when tile slots into tray
  playTileLand() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.tone(480, t, 0.06, 0.09, 'triangle');
    this.tone(240, t + 0.01, 0.08, 0.08, 'sine');
  }

  // Sparkling triplet match chord (major triad arpeggio with high shimmer)
  playMatch() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      this.tone(freq, t + idx * 0.04, 0.28, 0.09, 'sine');
      this.tone(freq * 1.5, t + idx * 0.04, 0.18, 0.03, 'triangle');
    });
  }

  // Shuffling tile rattle
  playShuffle() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    for (let i = 0; i < 6; i++) {
      const f = 340 + Math.random() * 220;
      this.tone(f, t + i * 0.045, 0.06, 0.06, 'triangle');
    }
  }

  // Gentle reverse whoosh for undo
  playUndo() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(580, t + 0.12);
    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.14);
  }

  // Gentle bonk when tapping a covered tile or full tray
  playBonk() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(90, t + 0.12);
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.12);
  }

  // Multi-step celebratory victory fanfare
  playWin() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const chords = [
      { delay: 0.00, notes: [523.25, 659.25] },          // C5, E5
      { delay: 0.12, notes: [659.25, 783.99] },          // E5, G5
      { delay: 0.24, notes: [783.99, 1046.50] },         // G5, C6
      { delay: 0.40, notes: [1046.50, 1318.51, 1567.98] }// C6, E6, G6
    ];
    chords.forEach(({ delay, notes }) => {
      notes.forEach(f => {
        this.tone(f, t + delay, 0.45, 0.08, 'sine');
        this.tone(f * 2, t + delay, 0.2, 0.02, 'triangle');
      });
    });
  }
}

window.TilepileAudio = TilepileAudio;
