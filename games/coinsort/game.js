/** Coin Sort: stack matching coins; ten of a colour merge into the next colour up. */
class CoinSortGame {
  constructor() {
    this.capacity = 10;
    this.tiers = 8; // one per --coin-N colour, lowest to highest
    this.slotOptions = [6, 8, 10];
    const slots = Number(localStorage.getItem('coinsort_slots')) || 8;
    this.slotCount = this.slotOptions.includes(slots) ? slots : 8;
    this.mode = localStorage.getItem('coinsort_mode') === 'endless' ? 'endless' : 'levels';
    this.level = Math.max(1, Number(localStorage.getItem('coinsort_level')) || 1);
    this.audio = new window.CoinsortAudio();
    this.slots = [];
    this.best = 1;
    this.banked = 0;
    this.history = [];
    this.selected = null;
    this.isAnimating = false;
    this.boardVersion = 0;
    this.dom = {};
    for (const id of ['coin-board', 'level-badge', 'goal-label', 'goal-coin', 'best-coin',
      'btn-sound', 'sound-icon-on', 'sound-icon-off', 'btn-settings', 'settings-modal',
      'slots-select', 'mode-select', 'btn-close-settings', 'btn-apply-settings', 'btn-restart',
      'btn-undo', 'btn-new', 'btn-deal', 'win-modal', 'win-stats', 'btn-next-level',
      'win-coin', 'jam-modal', 'btn-jam-tidy', 'btn-jam-undo', 'btn-jam-restart']) {
      this.dom[id] = document.getElementById(id);
    }
    this.bindEvents();
    this.updateSoundIcons();
    this.newGame();
  }

  get goalTier() {
    return Math.min(2 + this.level, this.tiers - 1);
  }

  // Deals draw from the three colours up to the best one made so far
  get dealRange() {
    return { lo: Math.max(0, this.best - 2), hi: this.best };
  }

  bindEvents() {
    this.dom['btn-deal'].addEventListener('click', () => this.deal());
    this.dom['btn-new'].addEventListener('click', () => this.newGame());
    this.dom['btn-next-level'].addEventListener('click', () => this.nextLevel());
    this.dom['btn-restart'].addEventListener('click', () => this.restartGame());
    this.dom['btn-undo'].addEventListener('click', () => this.undoMove());
    this.dom['btn-jam-tidy'].addEventListener('click', () => this.tidyUp());
    this.dom['btn-jam-undo'].addEventListener('click', () => { this.dom['jam-modal'].classList.add('hidden'); this.undoMove(); });
    this.dom['btn-jam-restart'].addEventListener('click', () => this.restartGame());
    this.dom['btn-sound'].addEventListener('click', () => { this.audio.toggleMute(); this.updateSoundIcons(); });
    this.dom['btn-settings'].addEventListener('click', () => {
      this.dom['slots-select'].value = String(this.slotCount);
      this.dom['mode-select'].value = this.mode;
      this.dom['settings-modal'].classList.remove('hidden');
    });
    this.dom['btn-close-settings'].addEventListener('click', () => this.dom['settings-modal'].classList.add('hidden'));
    this.dom['btn-apply-settings'].addEventListener('click', () => {
      this.slotCount = Number(this.dom['slots-select'].value);
      this.mode = this.dom['mode-select'].value;
      localStorage.setItem('coinsort_slots', String(this.slotCount));
      localStorage.setItem('coinsort_mode', this.mode);
      this.dom['settings-modal'].classList.add('hidden');
      this.newGame();
    });
    this.dom['settings-modal'].addEventListener('click', e => {
      if (e.target === this.dom['settings-modal']) this.dom['settings-modal'].classList.add('hidden');
    });
    window.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        this.dom['settings-modal'].classList.add('hidden');
        this.selected = null;
        this.render();
        return;
      }
      if (e.target.closest('input, select, textarea, button') || e.ctrlKey || e.metaKey || e.altKey) return;
      if (!this.dom['settings-modal'].classList.contains('hidden')) return;
      if (e.key.toLowerCase() === 'd') this.deal();
      if (e.key.toLowerCase() === 'u') this.undoMove();
      if (e.key.toLowerCase() === 'r') this.restartGame();
    });
  }

  updateSoundIcons() {
    const muted = this.audio.isMuted();
    this.dom['sound-icon-on'].classList.toggle('hidden', muted);
    this.dom['sound-icon-off'].classList.toggle('hidden', !muted);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  snapshot() {
    return { slots: this.slots.map(s => [...s]), best: this.best, banked: this.banked };
  }

  restore(state) {
    this.slots = state.slots.map(s => [...s]);
    this.best = state.best;
    this.banked = state.banked;
  }

  // Pick up to `count` coin drops into random slots with room; returns [{slot, tier, n}]
  planDeal(count) {
    const { lo, hi } = this.dealRange;
    const open = this.slots.map((s, i) => i).filter(i => this.slots[i].length < this.capacity);
    for (let i = open.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [open[i], open[j]] = [open[j], open[i]];
    }
    return open.slice(0, count).map(slot => {
      const room = this.capacity - this.slots[slot].length;
      const tier = lo + Math.floor(Math.random() * (hi - lo + 1));
      return { slot, tier, n: Math.min(room, 1 + Math.floor(Math.random() * 3)) };
    });
  }

  cancelAnimation() {
    this.boardVersion++;
    this.isAnimating = false;
    document.querySelectorAll('.coin.flying, .puff-particle').forEach(el => el.remove());
  }

  newGame() {
    this.cancelAnimation();
    this.slots = Array.from({ length: this.slotCount }, () => []);
    this.best = 1;
    this.banked = 0;
    for (let i = 0; i < 3; i++) {
      for (const drop of this.planDeal(3)) this.slots[drop.slot].push(...Array(drop.n).fill(drop.tier));
    }
    this.initialState = this.snapshot();
    this.history = [];
    this.selected = null;
    this.hideModals();
    this.render();
  }

  restartGame() {
    this.cancelAnimation();
    this.restore(this.initialState);
    this.history = [];
    this.selected = null;
    this.hideModals();
    this.render();
  }

  nextLevel() {
    this.level++;
    localStorage.setItem('coinsort_level', String(this.level));
    this.newGame();
  }

  hideModals() {
    for (const id of ['win-modal', 'jam-modal']) this.dom[id].classList.add('hidden');
  }

  undoMove() {
    if (this.isAnimating || !this.history.length) return;
    this.restore(this.history.pop());
    this.selected = null;
    this.audio.playUndo();
    this.render();
  }

  coinElement(tier) {
    const coin = document.createElement('div');
    coin.className = 'coin';
    this.paintCoin(coin, tier);
    return coin;
  }

  paintCoin(el, tier) {
    el.style.setProperty('--coin-color', `var(--coin-${tier + 1})`);
    el.style.setProperty('--coin-text', [3, 5, 7].includes(tier) ? '#fff' : '#000');
    el.textContent = tier + 1;
  }

  // Count of matching coins on top of a slot
  topRun(slot) {
    const stack = this.slots[slot];
    let n = 0;
    while (n < stack.length && stack[stack.length - 1 - n] === stack[stack.length - 1]) n++;
    return n;
  }

  render() {
    const board = this.dom['coin-board'];
    board.style.setProperty('--columns', this.slotCount / 2);
    board.replaceChildren();
    this.slots.forEach((stack, i) => {
      const slot = document.createElement('div');
      slot.className = 'coin-slot';
      slot.tabIndex = 0;
      slot.setAttribute('role', 'button');
      slot.setAttribute('aria-label', stack.length
        ? `Slot ${i + 1}: ${stack.length} coins, ${this.topRun(i)} of colour ${stack[stack.length - 1] + 1} on top`
        : `Slot ${i + 1}: empty`);
      const picked = this.selected === i ? this.topRun(i) : 0;
      slot.classList.toggle('selected', this.selected === i);
      stack.forEach((tier, j) => {
        const coin = this.coinElement(tier);
        if (j >= stack.length - picked) coin.classList.add('picked');
        slot.appendChild(coin);
      });
      slot.addEventListener('click', () => this.handleSlotTap(i));
      slot.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.handleSlotTap(i); }
      });
      board.appendChild(slot);
    });
    this.updateStats();
  }

  updateStats() {
    const endless = this.mode === 'endless';
    this.dom['level-badge'].textContent = endless ? `Endless${this.banked ? `: ${this.banked} banked` : ''}` : `Level ${this.level}`;
    this.dom['goal-label'].classList.toggle('hidden', endless);
    this.paintCoin(this.dom['goal-coin'], this.goalTier);
    this.paintCoin(this.dom['best-coin'], this.best);
    this.dom['btn-undo'].disabled = this.history.length === 0;
    this.dom['btn-deal'].disabled = this.isAnimating;
  }

  slotElement(i) {
    return this.dom['coin-board'].children[i];
  }

  // Animate fixed-position coin clones from source rects onto freshly rendered coins
  async fly(flights) {
    const version = this.boardVersion;
    const animations = flights.map(({ from, to, tier }, i) => {
      const target = to.getBoundingClientRect();
      const clone = this.coinElement(tier);
      clone.classList.add('flying');
      Object.assign(clone.style, { left: `${target.left}px`, top: `${target.top}px`, width: `${target.width}px`, maxWidth: 'none' });
      document.body.appendChild(clone);
      to.style.visibility = 'hidden';
      const dx = from.left + from.width / 2 - (target.left + target.width / 2);
      const dy = from.top + from.height / 2 - (target.top + target.height / 2);
      const animation = clone.animate([
        { transform: `translate(${dx}px, ${dy}px)` },
        { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 24}px)`, offset: 0.5 },
        { transform: 'translate(0, 0)' }
      ], { duration: 320, delay: i * 45, easing: 'ease-in-out', fill: 'backwards' });
      return animation.finished.then(() => {
        clone.remove();
        to.style.visibility = '';
      });
    });
    await Promise.all(animations);
    return version === this.boardVersion;
  }

  async handleSlotTap(i) {
    if (this.isAnimating) return;
    if (this.selected === null) {
      if (!this.slots[i].length) return;
      this.selected = i;
      this.audio.playPick();
      this.render();
      return;
    }
    const from = this.selected;
    if (from === i) {
      this.selected = null;
      this.render();
      return;
    }
    const source = this.slots[from];
    const target = this.slots[i];
    const tier = source[source.length - 1];
    const room = this.capacity - target.length;
    if (!room || (target.length && target[target.length - 1] !== tier)) {
      if (target.length) {
        this.selected = i;
        this.render();
      }
      const el = this.slotElement(i);
      el.classList.add('bonk');
      this.audio.playBonk();
      setTimeout(() => el.classList.remove('bonk'), 280);
      return;
    }

    const n = Math.min(this.topRun(from), room);
    const sourceCoins = [...this.slotElement(from).children].slice(-n).reverse();
    const fromRects = sourceCoins.map(el => el.getBoundingClientRect());
    this.history.push(this.snapshot());
    target.push(...source.splice(source.length - n, n));
    this.selected = null;
    this.isAnimating = true;
    this.render();
    const landed = [...this.slotElement(i).children].slice(-n);
    this.audio.playDrop(n);
    if (!await this.fly(landed.map((to, k) => ({ from: fromRects[k], to, tier })))) return;
    await this.settle();
  }

  async deal() {
    if (this.isAnimating || !this.dom['win-modal'].classList.contains('hidden')) return;
    const drops = this.planDeal(2 + Math.floor(Math.random() * 2));
    if (!drops.length) { this.showJam(); return; }
    const from = this.dom['btn-deal'].getBoundingClientRect();
    this.history.push(this.snapshot());
    for (const drop of drops) this.slots[drop.slot].push(...Array(drop.n).fill(drop.tier));
    this.selected = null;
    this.isAnimating = true;
    this.render();
    this.audio.playDeal();
    const flights = drops.flatMap(drop => [...this.slotElement(drop.slot).children].slice(-drop.n)
      .map(to => ({ from, to, tier: drop.tier })));
    if (!await this.fly(flights)) return;
    await this.settle();
  }

  // Merge any full single-colour slots, then check for a win or a jam
  async settle() {
    const version = this.boardVersion;
    for (;;) {
      const i = this.slots.findIndex(s => s.length === this.capacity && s.every(t => t === s[0]));
      if (i < 0) break;
      const tier = this.slots[i][0];
      const el = this.slotElement(i);
      [...el.children].forEach(coin => coin.classList.add('poofing'));
      const rect = el.getBoundingClientRect();
      this.spawnPuffParticles(rect.left + rect.width / 2, rect.bottom - rect.height * 0.35);
      this.audio.playMerge(tier);
      await this.sleep(420);
      if (version !== this.boardVersion) return;

      // The top colour has nowhere higher to go, so it is banked instead
      if (tier + 1 < this.tiers) {
        this.slots[i] = [tier + 1];
        this.best = Math.max(this.best, tier + 1);
      } else {
        this.slots[i] = [];
        this.banked++;
      }
      this.render();
      this.slotElement(i).firstElementChild?.classList.add('popping');
      await this.sleep(200);
      if (version !== this.boardVersion) return;
    }
    this.isAnimating = false;
    this.updateStats();

    if (this.mode === 'levels' && this.best >= this.goalTier) {
      setTimeout(() => {
        if (version !== this.boardVersion) return;
        this.paintCoin(this.dom['win-coin'], this.best);
        const steps = this.history.length;
        this.dom['win-stats'].textContent = `${steps} ${steps === 1 ? 'move' : 'moves'}`;
        this.audio.playWin();
        this.dom['win-modal'].classList.remove('hidden');
      }, 300);
      this.isAnimating = true; // board stays still behind the modal
      return;
    }
    if (this.slots.every(s => s.length === this.capacity)) this.showJam();
  }

  showJam() {
    this.dom['jam-modal'].classList.remove('hidden');
  }

  // Free rescue: sweep coins below the deal range, then regroup the rest by colour
  async tidyUp() {
    this.dom['jam-modal'].classList.add('hidden');
    this.history.push(this.snapshot());
    const { lo } = this.dealRange;
    const counts = Array(this.tiers).fill(0);
    for (const stack of this.slots) for (const tier of stack) if (tier >= lo) counts[tier]++;

    const chunks = [];
    for (let tier = this.tiers - 1; tier >= 0; tier--) {
      for (let left = counts[tier]; left > 0; left -= this.capacity) chunks.push(Array(Math.min(left, this.capacity)).fill(tier));
    }
    this.slots = Array.from({ length: this.slotCount }, () => []);
    chunks.forEach((chunk, k) => {
      if (k < this.slotCount) { this.slots[k] = chunk; return; }
      for (const tier of chunk) this.slots.find(s => s.length < this.capacity)?.push(tier);
    });
    this.selected = null;
    this.isAnimating = true;
    this.render();
    this.audio.playDeal();
    await this.settle();
  }

  spawnPuffParticles(x, y) {
    const sparkles = ['✨', '⭐', '💨', '✨'];
    for (let i = 0; i < 8; i++) {
      const p = document.createElement('div');
      p.className = 'puff-particle';
      p.textContent = sparkles[Math.floor(Math.random() * sparkles.length)];
      const angle = (Math.PI * 2 / 8) * i + (Math.random() * 0.4);
      const dist = 50 + Math.random() * 40;
      p.style.left = `${x}px`;
      p.style.top = `${y}px`;
      p.style.setProperty('--tx', `${Math.cos(angle) * dist}px`);
      p.style.setProperty('--ty', `${Math.sin(angle) * dist}px`);
      document.body.appendChild(p);
      setTimeout(() => p.remove(), 650);
    }
  }
}

window.addEventListener('DOMContentLoaded', () => { window.coinSortGame = new CoinSortGame(); });
