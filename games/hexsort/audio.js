/**
 * Hex Sort - Procedural Web Audio API Sound Synthesizer
 * Reuses the gentle synth feel of Boxes of 3 and Coin Sort.
 */

class HexSortAudio {
  constructor() {
    this.ctx = null;
    this.muted = localStorage.getItem('hexsort_muted') === 'true';
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
    localStorage.setItem('hexsort_muted', this.muted);
    return this.muted;
  }

  isMuted() {
    return this.muted;
  }

  blip(from, to, start, length, volume, type = 'sine') {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, start);
    osc.frequency.exponentialRampToValueAtTime(to, start + length * 0.85);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + length);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(start);
    osc.stop(start + length);
  }

  // Rising blip when an offered stack is selected
  playPick() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    this.blip(360, 540, this.ctx.currentTime, 0.08, 0.12);
  }

  // Soft thud when a stack is placed onto the hex board
  playDrop() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    this.blip(440, 220, this.ctx.currentTime, 0.09, 0.14, 'triangle');
  }

  // Stepped fluttering blips as hex tiles flip across to a neighbour
  playFlip(count = 1, chainStep = 0) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const pitchLift = Math.pow(2, Math.min(chainStep, 6) / 12);
    const n = Math.min(count, 8);
    for (let i = 0; i < n; i++) {
      const base = (360 + i * 26) * pitchLift;
      this.blip(base, base * 1.32, t + i * 0.095, 0.11, 0.11, 'triangle');
    }
  }

  // Patter of drops as 3 new stacks are dealt into the tray
  playDeal() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    [0, 0.065, 0.13].forEach((delay, i) => {
      this.blip(380 + i * 45, 230, t + delay, 0.085, 0.1, 'triangle');
    });
  }

  // Ascending blip for each individual tile popping off the top of a 10+ stack
  playTilePop(index = 0, total = 10, chainStep = 0) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const chainLift = Math.pow(2, Math.min(chainStep, 6) / 12);
    const stepLift = Math.pow(2, (index / Math.max(1, total)) * 0.75);
    const freq = 420 * chainLift * stepLift;
    this.blip(freq, freq * 1.35, t, 0.08, 0.1, 'sine');
  }

  // Sparkly D-major chord when the last tile of a 10+ stack finishes clearing
  playClear(chainStep = 0) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const lift = Math.pow(2, Math.min(chainStep, 6) / 12);
    [587.33, 739.99, 880].forEach((freq, i) => {
      this.blip(freq * lift, freq * lift * 1.25, t + i * 0.04, 0.35, 0.11, 'sine');
    });
  }

  // Soft wooden bonk for an invalid tap
  playBonk() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    this.blip(145, 85, t, 0.09, 0.16, 'sine');
  }

  // Soft reverse zip when undoing
  playUndo() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    this.blip(500, 250, t, 0.15, 0.1, 'triangle');
  }

  // G-major pentatonic fanfare on level completion
  playWin() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    [392, 493.88, 587.33, 783.99, 987.77].forEach((freq, i) => {
      this.blip(freq, freq, t + i * 0.09, 0.55, 0.14, 'sine');
    });
  }
}

window.HexSortAudio = HexSortAudio;
