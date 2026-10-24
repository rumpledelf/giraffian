/**
 * Coin Sort - Procedural Web Audio API Sound Synthesizer
 * Zero external audio files, pure browser synthesis.
 */

class CoinsortAudio {
  constructor() {
    this.ctx = null;
    this.muted = gameStorage.getItem('coinsort_muted') === 'true';
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
    gameStorage.setItem('coinsort_muted', this.muted);
    return this.muted;
  }

  isMuted() {
    return this.muted;
  }

  // Soft gliding blip shared by the coin sounds below
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

  // Rising blip when a stack is picked up
  playPick() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    this.blip(360, 540, this.ctx.currentTime, 0.08, 0.12);
  }

  // Falling blip per coin landing, stepped like a little pour
  playDrop(count = 1) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    for (let i = 0; i < Math.min(count, 5); i++) {
      this.blip(440, 220, t + i * 0.045, 0.09, 0.12, 'triangle');
    }
  }

  // Patter of drops as new coins are dealt
  playDeal() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    [0, 0.07, 0.14].forEach((delay, i) => this.blip(400 + i * 40, 220, t + delay, 0.09, 0.1, 'triangle'));
  }

  // Stepped ascending blip as each coin pops off in a merge countdown
  playCoinPop(index, total = 10) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const stepLift = Math.pow(2, (index / Math.max(1, total)) * 0.8);
    const freq = 440 * stepLift;
    this.blip(freq, freq * 1.3, t, 0.07, 0.11, 'sine');
  }

  // Sparkly sweeping chord for a merge; higher coins ring higher
  playMerge(tier) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const lift = Math.pow(2, Math.min(tier, 7) / 12);
    [587.33, 739.99, 880].forEach((freq, i) => {
      this.blip(freq * lift, freq * lift * 1.25, t + i * 0.04, 0.35, 0.1);
    });
  }

  // Soft wooden bonk for a move that doesn't fit
  playBonk() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.08);

    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.1);
  }

  // Soft reverse zip when undoing
  playUndo() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(500, t);
    osc.frequency.exponentialRampToValueAtTime(250, t + 0.15);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.1, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.18);
  }

  // Victory run
  playWin() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    [392, 493.88, 587.33, 783.99, 987.77].forEach((freq, i) => this.blip(freq, freq, t + i * 0.09, 0.55, 0.14)); // G major pentatonic
  }
}

window.CoinsortAudio = CoinsortAudio;
