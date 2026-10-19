/**
 * Tile Pile Match - Procedural Triplet Tile Match Puzzle
 * Vanilla ES6, zero external dependencies, responsive 2px design system.
 */

class TilePileGame {
  constructor() {
    this.audio = new window.TilepileAudio();
    this.maxTraySlots = 7;
    this.history = [];
    this.isAnimating = false;
    this.level = Math.max(1, Number(localStorage.getItem('tilepile_level')) || 1);
    this.mode = localStorage.getItem('tilepile_mode') === 'endless' ? 'endless' : 'levels';
    this.themeKey = localStorage.getItem('tilepile_theme') || 'pantry';

    this.themes = {
      pantry: {
        name: 'Pantry',
        icon: '🍯',
        items: ['🍯', '🍓', '🍋', '🍇', '🍄', '🥐', '🧀', '🧁', '🥑', '🍉']
      },
      nature: {
        name: 'Nature',
        icon: '🌸',
        items: ['🌸', '🦋', '🐝', '🐢', '🐞', '🌿', '🌻', '🦊', '🦉', '🌰']
      },
      seaside: {
        name: 'Seaside',
        icon: '⛵',
        items: ['⛵', '🦀', '🐬', '🐚', '🌴', '🐠', '🪁', '🍉', '🍦', '🏖️']
      },
      crystals: {
        name: 'Crystals',
        icon: '💎',
        items: ['💎', '⭐', '🌙', '🔮', '✨', '⚡', '🪐', '🔷', '🔶', '👑']
      }
    };

    this.tiles = [];       // { id, gx, gy, layer, symbol, collected }
    this.tray = [];        // array of tile objects in the 7-slot tray
    this.matchesCleared = 0;
    this.movesCount = 0;

    this.dom = {
      pileStage: document.getElementById('pile-stage'),
      tileTray: document.getElementById('tile-tray'),
      levelBadge: document.getElementById('level-badge'),
      tilesLeft: document.getElementById('tiles-left'),
      matchesCleared: document.getElementById('matches-cleared'),
      themeIcon: document.getElementById('theme-icon'),
      themeToggleBtn: document.getElementById('btn-theme-toggle'),
      btnSound: document.getElementById('btn-sound'),
      soundIconOn: document.getElementById('sound-icon-on'),
      soundIconOff: document.getElementById('sound-icon-off'),
      btnSettings: document.getElementById('btn-settings'),
      settingsModal: document.getElementById('settings-modal'),
      themeSelect: document.getElementById('theme-select'),
      modeSelect: document.getElementById('mode-select'),
      btnCloseSettings: document.getElementById('btn-close-settings'),
      btnApplySettings: document.getElementById('btn-apply-settings'),
      btnRestart: document.getElementById('btn-restart'),
      btnUndo: document.getElementById('btn-undo'),
      btnShuffle: document.getElementById('btn-shuffle'),
      btnNew: document.getElementById('btn-new'),
      winModal: document.getElementById('win-modal'),
      winStats: document.getElementById('win-stats'),
      btnNextLevel: document.getElementById('btn-next-level'),
      jamModal: document.getElementById('jam-modal'),
      btnJamTidy: document.getElementById('btn-jam-tidy'),
      btnJamShuffle: document.getElementById('btn-jam-shuffle'),
      btnJamUndo: document.getElementById('btn-jam-undo'),
      btnJamRestart: document.getElementById('btn-jam-restart')
    };

    this.bindEvents();
    this.updateSoundIcons();
    this.updateThemeUI();
    this.newGame();
  }

  get currentTheme() {
    return this.themes[this.themeKey] || this.themes.pantry;
  }

  bindEvents() {
    this.dom.themeToggleBtn.addEventListener('click', () => this.cycleTheme());
    this.dom.btnSound.addEventListener('click', () => {
      this.audio.toggleMute();
      this.updateSoundIcons();
    });

    this.dom.btnRestart.addEventListener('click', () => this.restartGame());
    this.dom.btnUndo.addEventListener('click', () => this.undoMove());
    this.dom.btnShuffle.addEventListener('click', () => this.shuffleFreeTiles());
    this.dom.btnNew.addEventListener('click', () => this.newGame());
    this.dom.btnNextLevel.addEventListener('click', () => this.nextLevel());

    // Jam modal actions
    this.dom.btnJamTidy.addEventListener('click', () => {
      this.dom.jamModal.classList.add('hidden');
      this.tidyUpTray();
    });
    this.dom.btnJamShuffle.addEventListener('click', () => {
      this.dom.jamModal.classList.add('hidden');
      this.shuffleFreeTiles();
    });
    this.dom.btnJamUndo.addEventListener('click', () => {
      this.dom.jamModal.classList.add('hidden');
      this.undoMove();
    });
    this.dom.btnJamRestart.addEventListener('click', () => {
      this.dom.jamModal.classList.add('hidden');
      this.restartGame();
    });

    // Settings modal
    this.dom.btnSettings.addEventListener('click', () => {
      this.dom.themeSelect.value = this.themeKey;
      this.dom.modeSelect.value = this.mode;
      this.dom.settingsModal.classList.remove('hidden');
    });
    this.dom.btnCloseSettings.addEventListener('click', () => {
      this.dom.settingsModal.classList.add('hidden');
    });
    this.dom.btnApplySettings.addEventListener('click', () => {
      this.themeKey = this.dom.themeSelect.value;
      this.mode = this.dom.modeSelect.value;
      localStorage.setItem('tilepile_theme', this.themeKey);
      localStorage.setItem('tilepile_mode', this.mode);
      this.dom.settingsModal.classList.add('hidden');
      this.updateThemeUI();
      this.newGame();
    });

    // Keyboard shortcuts
    window.addEventListener('keydown', e => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
      if (e.key === 'u' || e.key === 'U') this.undoMove();
      if (e.key === 's' || e.key === 'S') this.shuffleFreeTiles();
      if (e.key === 'r' || e.key === 'R') this.restartGame();
      if (e.key === 'n' || e.key === 'N') this.newGame();
    });

    window.addEventListener('resize', () => this.renderPile());
  }

  updateSoundIcons() {
    const muted = this.audio.isMuted();
    this.dom.soundIconOn.classList.toggle('hidden', muted);
    this.dom.soundIconOff.classList.toggle('hidden', !muted);
  }

  cycleTheme() {
    const keys = Object.keys(this.themes);
    const idx = keys.indexOf(this.themeKey);
    this.themeKey = keys[(idx + 1) % keys.length];
    localStorage.setItem('tilepile_theme', this.themeKey);
    this.updateThemeUI();
    this.applyThemeSymbols();
    this.render();
  }

  updateThemeUI() {
    this.dom.themeIcon.textContent = this.currentTheme.icon;
  }

  hideModals() {
    this.dom.winModal.classList.add('hidden');
    this.dom.jamModal.classList.add('hidden');
  }

  nextLevel() {
    this.level++;
    localStorage.setItem('tilepile_level', String(this.level));
    this.newGame();
  }

  // Generate layered pile layout where:
  // - Tiles within the SAME layer line up edge-to-edge (separated by standard gap)
  // - Higher layers sit at half-steps (50% offset), exposing the layer below cleanly
  generatePile(level) {
    const layoutIdx = (level - 1) % 4;
    let slots = [];

    if (layoutIdx === 0) {
      // Level 1: 18 tiles (6 triplets) - Diamond Wings
      // Layer 0: 12 tiles edge-to-edge
      const layer0 = [
        // Row 0
        { gx: 2, gy: 0, layer: 0 }, { gx: 4, gy: 0, layer: 0 }, { gx: 6, gy: 0, layer: 0 }, { gx: 8, gy: 0, layer: 0 },
        // Row 1 (with free wings at gx=0 and gx=10)
        { gx: 0, gy: 2, layer: 0 }, { gx: 4, gy: 2, layer: 0 }, { gx: 6, gy: 2, layer: 0 }, { gx: 10, gy: 2, layer: 0 },
        // Row 2
        { gx: 2, gy: 4, layer: 0 }, { gx: 4, gy: 4, layer: 0 }, { gx: 6, gy: 4, layer: 0 }, { gx: 8, gy: 4, layer: 0 }
      ];
      // Layer 1: 6 tiles centered on half-steps
      const layer1 = [
        { gx: 3, gy: 1, layer: 1 }, { gx: 5, gy: 1, layer: 1 }, { gx: 7, gy: 1, layer: 1 },
        { gx: 3, gy: 3, layer: 1 }, { gx: 5, gy: 3, layer: 1 }, { gx: 7, gy: 3, layer: 1 }
      ];
      slots = [...layer0, ...layer1];
    } else if (layoutIdx === 1) {
      // Level 2: 24 tiles (8 triplets) - Stepped Pyramid
      // Layer 0: 14 tiles
      const layer0 = [
        { gx: 2, gy: 0, layer: 0 }, { gx: 4, gy: 0, layer: 0 }, { gx: 6, gy: 0, layer: 0 }, { gx: 8, gy: 0, layer: 0 },
        { gx: 0, gy: 2, layer: 0 }, { gx: 2, gy: 2, layer: 0 }, { gx: 4, gy: 2, layer: 0 }, { gx: 6, gy: 2, layer: 0 }, { gx: 8, gy: 2, layer: 0 }, { gx: 10, gy: 2, layer: 0 },
        { gx: 2, gy: 4, layer: 0 }, { gx: 4, gy: 4, layer: 0 }, { gx: 6, gy: 4, layer: 0 }, { gx: 8, gy: 4, layer: 0 }
      ];
      // Layer 1: 8 tiles
      const layer1 = [
        { gx: 3, gy: 1, layer: 1 }, { gx: 5, gy: 1, layer: 1 }, { gx: 7, gy: 1, layer: 1 },
        { gx: 1, gy: 2, layer: 1 }, { gx: 9, gy: 2, layer: 1 },
        { gx: 3, gy: 3, layer: 1 }, { gx: 5, gy: 3, layer: 1 }, { gx: 7, gy: 3, layer: 1 }
      ];
      // Layer 2: 2 apex tiles
      const layer2 = [
        { gx: 4, gy: 2, layer: 2 }, { gx: 6, gy: 2, layer: 2 }
      ];
      slots = [...layer0, ...layer1, ...layer2];
    } else if (layoutIdx === 2) {
      // Level 3: 30 tiles (10 triplets) - Fortress Sanctuary
      // Layer 0: 16 tiles
      const layer0 = [
        { gx: 2, gy: 0, layer: 0 }, { gx: 4, gy: 0, layer: 0 }, { gx: 6, gy: 0, layer: 0 }, { gx: 8, gy: 0, layer: 0 }, { gx: 10, gy: 0, layer: 0 },
        { gx: 0, gy: 2, layer: 0 }, { gx: 2, gy: 2, layer: 0 }, { gx: 4, gy: 2, layer: 0 }, { gx: 8, gy: 2, layer: 0 }, { gx: 10, gy: 2, layer: 0 }, { gx: 12, gy: 2, layer: 0 },
        { gx: 2, gy: 4, layer: 0 }, { gx: 4, gy: 4, layer: 0 }, { gx: 6, gy: 4, layer: 0 }, { gx: 8, gy: 4, layer: 0 }, { gx: 10, gy: 4, layer: 0 }
      ];
      // Layer 1: 10 tiles
      const layer1 = [
        { gx: 3, gy: 1, layer: 1 }, { gx: 5, gy: 1, layer: 1 }, { gx: 7, gy: 1, layer: 1 }, { gx: 9, gy: 1, layer: 1 },
        { gx: 1, gy: 2, layer: 1 }, { gx: 11, gy: 2, layer: 1 },
        { gx: 3, gy: 3, layer: 1 }, { gx: 5, gy: 3, layer: 1 }, { gx: 7, gy: 3, layer: 1 }, { gx: 9, gy: 3, layer: 1 }
      ];
      // Layer 2: 4 apex tiles
      const layer2 = [
        { gx: 5, gy: 1, layer: 2 }, { gx: 7, gy: 1, layer: 2 },
        { gx: 5, gy: 3, layer: 2 }, { gx: 7, gy: 3, layer: 2 }
      ];
      slots = [...layer0, ...layer1, ...layer2];
    } else {
      // Level 4: 36 tiles (12 triplets) - Twin Wings & Central Dome
      // Layer 0: 20 tiles
      const layer0 = [
        { gx: 2, gy: 0, layer: 0 }, { gx: 4, gy: 0, layer: 0 }, { gx: 6, gy: 0, layer: 0 }, { gx: 8, gy: 0, layer: 0 }, { gx: 10, gy: 0, layer: 0 }, { gx: 12, gy: 0, layer: 0 },
        { gx: 0, gy: 2, layer: 0 }, { gx: 2, gy: 2, layer: 0 }, { gx: 4, gy: 2, layer: 0 }, { gx: 6, gy: 2, layer: 0 }, { gx: 8, gy: 2, layer: 0 }, { gx: 10, gy: 2, layer: 0 }, { gx: 12, gy: 2, layer: 0 }, { gx: 14, gy: 2, layer: 0 },
        { gx: 2, gy: 4, layer: 0 }, { gx: 4, gy: 4, layer: 0 }, { gx: 6, gy: 4, layer: 0 }, { gx: 8, gy: 4, layer: 0 }, { gx: 10, gy: 4, layer: 0 }, { gx: 12, gy: 4, layer: 0 }
      ];
      // Layer 1: 12 tiles
      const layer1 = [
        { gx: 3, gy: 1, layer: 1 }, { gx: 5, gy: 1, layer: 1 }, { gx: 7, gy: 1, layer: 1 }, { gx: 9, gy: 1, layer: 1 }, { gx: 11, gy: 1, layer: 1 },
        { gx: 1, gy: 2, layer: 1 }, { gx: 13, gy: 2, layer: 1 },
        { gx: 3, gy: 3, layer: 1 }, { gx: 5, gy: 3, layer: 1 }, { gx: 7, gy: 3, layer: 1 }, { gx: 9, gy: 3, layer: 1 }, { gx: 11, gy: 3, layer: 1 }
      ];
      // Layer 2: 4 apex tiles
      const layer2 = [
        { gx: 5, gy: 2, layer: 2 }, { gx: 7, gy: 2, layer: 2 }, { gx: 9, gy: 2, layer: 2 },
        { gx: 7, gy: 1, layer: 2 }
      ];
      slots = [...layer0, ...layer1, ...layer2];
    }

    const tripletCount = Math.floor(slots.length / 3);
    const uniqueItemCount = Math.min(4 + Math.floor((level - 1) * 0.8), this.currentTheme.items.length);

    // Assign symbols with guaranteed solvable reverse simulation
    this.assignSolvableSymbols(slots, tripletCount, uniqueItemCount);

    return slots.map((slot, idx) => ({
      id: idx,
      gx: slot.gx,
      gy: slot.gy,
      layer: slot.layer,
      symbol: slot.symbol,
      collected: false
    }));
  }

  // Assign symbols in triplets via reverse-play simulation to guarantee solvability
  assignSolvableSymbols(slots, tripletCount, uniqueItemCount) {
    const chosenItems = [...this.currentTheme.items];
    for (let i = chosenItems.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [chosenItems[i], chosenItems[j]] = [chosenItems[j], chosenItems[i]];
    }
    const themePool = chosenItems.slice(0, uniqueItemCount);

    // Build list of symbols needed for triplets
    const tripletSymbols = [];
    for (let t = 0; t < tripletCount; t++) {
      tripletSymbols.push(themePool[t % themePool.length]);
    }
    for (let i = tripletSymbols.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [tripletSymbols[i], tripletSymbols[j]] = [tripletSymbols[j], tripletSymbols[i]];
    }

    // Helper: does slot B cover slot A?
    const covers = (b, a) => (
      b.layer > a.layer &&
      Math.abs(b.gx - a.gx) < 2 &&
      Math.abs(b.gy - a.gy) < 2
    );

    let remaining = [...slots];
    const assignments = new Map();

    for (let t = 0; t < tripletCount; t++) {
      const symbol = tripletSymbols[t];

      // Slots that currently have NO remaining slot covering them
      let freeSlots = remaining.filter(slot =>
        !remaining.some(other => covers(other, slot))
      );

      // If fewer than 3 free slots, supplement with highest-layer available
      if (freeSlots.length < 3) {
        remaining.sort((a, b) => b.layer - a.layer);
        freeSlots = remaining.slice(0, 3);
      } else {
        // Randomize order of candidate free slots
        for (let i = freeSlots.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [freeSlots[i], freeSlots[j]] = [freeSlots[j], freeSlots[i]];
        }
      }

      const picked = freeSlots.slice(0, 3);
      picked.forEach(slot => {
        assignments.set(slot, symbol);
        const idx = remaining.indexOf(slot);
        if (idx !== -1) remaining.splice(idx, 1);
      });
    }

    // Fallback for any leftover slots
    if (remaining.length > 0) {
      remaining.forEach((slot, i) => {
        assignments.set(slot, themePool[i % themePool.length]);
      });
    }

    slots.forEach(slot => {
      slot.symbol = assignments.get(slot) || themePool[0];
    });
  }

  newGame() {
    this.cancelAnimation();
    this.hideModals();
    this.tiles = this.generatePile(this.level);
    this.initialState = this.snapshot();
    this.history = [];
    this.tray = [];
    this.matchesCleared = 0;
    this.movesCount = 0;
    this.render();
  }

  restartGame() {
    this.cancelAnimation();
    this.hideModals();
    this.restore(this.initialState);
    this.history = [];
    this.render();
  }

  snapshot() {
    return {
      tiles: this.tiles.map(t => ({ ...t })),
      tray: this.tray.map(t => ({ ...t })),
      matchesCleared: this.matchesCleared,
      movesCount: this.movesCount
    };
  }

  restore(state) {
    this.tiles = state.tiles.map(t => ({ ...t }));
    this.tray = state.tray.map(t => ({ ...t }));
    this.matchesCleared = state.matchesCleared;
    this.movesCount = state.movesCount;
  }

  applyThemeSymbols() {
    const currentItems = this.currentTheme.items;
    const uniqueOld = [...new Set(this.tiles.map(t => t.symbol))];
    const mapping = {};
    uniqueOld.forEach((sym, idx) => {
      mapping[sym] = currentItems[idx % currentItems.length];
    });

    this.tiles.forEach(t => {
      if (mapping[t.symbol]) t.symbol = mapping[t.symbol];
    });
    this.tray.forEach(t => {
      if (mapping[t.symbol]) t.symbol = mapping[t.symbol];
    });
  }

  cancelAnimation() {
    this.isAnimating = false;
    document.querySelectorAll('.flying-tile, .puff-particle').forEach(el => el.remove());
  }

  render() {
    this.renderHeader();
    this.renderPile();
    this.renderTray();
    this.updateStats();
  }

  renderHeader() {
    const isEndless = this.mode === 'endless';
    this.dom.levelBadge.textContent = isEndless ? 'Endless' : `Level ${this.level}`;
  }

  // A tile is free to pick if NO uncollected tile on a higher layer overlaps it
  isTileFree(tile) {
    if (tile.collected) return false;
    return !this.tiles.some(other =>
      !other.collected &&
      other.layer > tile.layer &&
      Math.abs(other.gx - tile.gx) < 2 &&
      Math.abs(other.gy - tile.gy) < 2
    );
  }

  renderPile() {
    const stage = this.dom.pileStage;
    stage.replaceChildren();

    const activeTiles = this.tiles.filter(t => !t.collected);
    if (activeTiles.length === 0) return;

    // Determine bounding box across all tiles (to keep stage centered consistently)
    let minGx = Infinity, maxGx = -Infinity;
    let minGy = Infinity, maxGy = -Infinity;
    this.tiles.forEach(t => {
      if (t.gx < minGx) minGx = t.gx;
      if (t.gx + 2 > maxGx) maxGx = t.gx + 2;
      if (t.gy < minGy) minGy = t.gy;
      if (t.gy + 2 > maxGy) maxGy = t.gy + 2;
    });

    const isMobile = window.innerWidth <= 540;
    const stepPx = isMobile ? 24 : 28;

    const pileWidth = (maxGx - minGx) * stepPx;
    const pileHeight = (maxGy - minGy) * stepPx;

    const stageWidth = stage.clientWidth || 540;
    const stageHeight = stage.clientHeight || 260;

    const offsetX = Math.max(8, Math.round((stageWidth - pileWidth) / 2));
    const offsetY = Math.max(8, Math.round((stageHeight - pileHeight) / 2));

    // Sort by layer asc, then gy asc, then gx asc so DOM order matches z-index
    const sortedTiles = [...this.tiles].sort((a, b) => {
      if (a.layer !== b.layer) return a.layer - b.layer;
      if (a.gy !== b.gy) return a.gy - b.gy;
      return a.gx - b.gx;
    });

    sortedTiles.forEach(tile => {
      if (tile.collected) return;

      const isFree = this.isTileFree(tile);
      const left = offsetX + (tile.gx - minGx) * stepPx;
      const top = offsetY + (tile.gy - minGy) * stepPx;
      const zIndex = tile.layer * 20 + tile.gy;

      const el = document.createElement('div');
      el.id = `pile-tile-${tile.id}`;
      el.className = `pile-tile ${isFree ? 'free' : 'blocked'}`;
      el.textContent = tile.symbol;
      el.style.left = `${left}px`;
      el.style.top = `${top}px`;
      el.style.zIndex = zIndex;
      el.tabIndex = isFree ? 0 : -1;
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', `${tile.symbol} tile, ${isFree ? 'free to pick' : 'covered by layer above'}`);

      el.addEventListener('click', () => this.handleTileClick(tile, el));
      el.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.handleTileClick(tile, el);
        }
      });

      stage.appendChild(el);
    });
  }

  renderTray() {
    const tray = this.dom.tileTray;
    tray.replaceChildren();

    for (let i = 0; i < this.maxTraySlots; i++) {
      const slot = document.createElement('div');
      slot.className = 'tray-slot';
      slot.id = `tray-slot-${i}`;

      const tile = this.tray[i];
      if (tile) {
        slot.classList.add('has-tile');
        slot.textContent = tile.symbol;
        slot.setAttribute('aria-label', `Tray slot ${i + 1}: ${tile.symbol}`);
      } else {
        slot.setAttribute('aria-label', `Tray slot ${i + 1}: empty`);
      }
      tray.appendChild(slot);
    }
  }

  updateStats() {
    const remaining = this.tiles.filter(t => !t.collected).length;
    this.dom.tilesLeft.textContent = remaining;
    this.dom.matchesCleared.textContent = this.matchesCleared;
    this.dom.btnUndo.disabled = this.history.length === 0 || this.isAnimating;
  }

  async handleTileClick(tile, tileEl) {
    if (this.isAnimating) return;

    // Blocked tile: gentle bonk and shake feedback
    if (!this.isTileFree(tile)) {
      this.audio.playBonk();
      tileEl.classList.remove('shake');
      void tileEl.offsetWidth; // force css reflow to replay shake
      tileEl.classList.add('shake');
      return;
    }

    if (this.tray.length >= this.maxTraySlots) {
      this.audio.playBonk();
      this.dom.jamModal.classList.remove('hidden');
      return;
    }

    this.isAnimating = true;
    this.history.push(this.snapshot());
    this.movesCount++;
    this.audio.playTileTap();

    // Determine target index in tray (cluster matching symbols together)
    let targetIdx = this.tray.length;
    const existingIdx = this.tray.map((t, idx) => ({ t, idx })).filter(item => item.t.symbol === tile.symbol);
    if (existingIdx.length > 0) {
      targetIdx = existingIdx[existingIdx.length - 1].idx + 1;
    }

    tile.collected = true;
    this.tray.splice(targetIdx, 0, tile);

    // Flying tile animation from board to tray
    const startRect = tileEl.getBoundingClientRect();
    tileEl.style.visibility = 'hidden';

    const clone = document.createElement('div');
    clone.className = 'flying-tile';
    clone.textContent = tile.symbol;
    clone.style.left = `${startRect.left}px`;
    clone.style.top = `${startRect.top}px`;
    document.body.appendChild(clone);

    this.renderTray();
    const targetSlotEl = document.getElementById(`tray-slot-${targetIdx}`);
    const endRect = targetSlotEl.getBoundingClientRect();
    targetSlotEl.style.visibility = 'hidden';

    const anim = clone.animate([
      { transform: 'translate(0, 0) scale(1)' },
      { transform: `translate(${(endRect.left - startRect.left) * 0.5}px, ${(endRect.top - startRect.top) * 0.5 - 20}px) scale(1.08)`, offset: 0.5 },
      { transform: `translate(${endRect.left - startRect.left}px, ${endRect.top - startRect.top}px) scale(1)` }
    ], {
      duration: 250,
      easing: 'cubic-bezier(0.2, 0.9, 0.3, 1)'
    });

    await anim.finished;
    clone.remove();
    targetSlotEl.style.visibility = '';
    this.audio.playTileLand();

    // Re-render pile: uncovered tiles immediately transition to free (.free)
    this.renderPile();
    this.updateStats();

    await this.checkMatch();

    this.isAnimating = false;
  }

  async checkMatch() {
    // Check if any symbol in tray has 3 matching tiles
    const counts = {};
    this.tray.forEach(t => counts[t.symbol] = (counts[t.symbol] || 0) + 1);

    const matchSymbol = Object.keys(counts).find(sym => counts[sym] >= 3);
    if (matchSymbol) {
      // Find matching indices in tray
      const matchIndices = [];
      this.tray.forEach((t, i) => {
        if (t.symbol === matchSymbol && matchIndices.length < 3) {
          matchIndices.push(i);
        }
      });

      // Highlight matching slots
      matchIndices.forEach(idx => {
        const slotEl = document.getElementById(`tray-slot-${idx}`);
        if (slotEl) slotEl.classList.add('matching');
      });

      this.audio.playMatch();
      await new Promise(r => setTimeout(r, 260));

      // Trigger poof particles
      matchIndices.forEach(idx => {
        const slotEl = document.getElementById(`tray-slot-${idx}`);
        if (slotEl) {
          slotEl.classList.remove('matching');
          slotEl.classList.add('poofing');
          this.spawnPoofParticles(slotEl);
        }
      });

      await new Promise(r => setTimeout(r, 280));

      // Remove the 3 matched tiles from tray
      this.tray = this.tray.filter((t, i) => !matchIndices.includes(i));
      this.matchesCleared++;
      this.renderTray();
      this.updateStats();

      // Check for victory
      const allCollected = this.tiles.every(t => t.collected);
      if (allCollected && this.tray.length === 0) {
        await new Promise(r => setTimeout(r, 250));
        this.handleVictory();
        return;
      }
    }

    // Check for jammed tray
    if (this.tray.length >= this.maxTraySlots) {
      await new Promise(r => setTimeout(r, 300));
      this.audio.playBonk();
      this.dom.jamModal.classList.remove('hidden');
    }
  }

  spawnPoofParticles(targetEl) {
    const rect = targetEl.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const particles = ['✨', '⭐', '💫', '🌸', '✨'];

    particles.forEach((char, i) => {
      const p = document.createElement('span');
      p.className = 'puff-particle';
      p.textContent = char;
      p.style.left = `${cx}px`;
      p.style.top = `${cy}px`;

      const angle = (i / particles.length) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const dist = 32 + Math.random() * 24;
      p.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
      p.style.setProperty('--dy', `${Math.sin(angle) * dist}px`);

      document.body.appendChild(p);
      setTimeout(() => p.remove(), 700);
    });
  }

  undoMove() {
    if (this.isAnimating || !this.history.length) return;
    this.restore(this.history.pop());
    this.audio.playUndo();
    this.hideModals();
    this.render();
  }

  tidyUpTray() {
    // Return up to 3 tiles from tray back to the board
    if (this.tray.length === 0) return;
    this.history.push(this.snapshot());

    const returnCount = Math.min(3, this.tray.length);
    const returned = this.tray.splice(this.tray.length - returnCount, returnCount);
    returned.forEach(t => t.collected = false);

    this.audio.playUndo();
    this.render();
  }

  shuffleFreeTiles() {
    if (this.isAnimating) return;
    const uncollected = this.tiles.filter(t => !t.collected);
    if (uncollected.length <= 1) return;

    this.history.push(this.snapshot());

    // Shuffle symbols among uncollected tiles
    const symbols = uncollected.map(t => t.symbol);
    for (let i = symbols.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [symbols[i], symbols[j]] = [symbols[j], symbols[i]];
    }

    uncollected.forEach((t, idx) => {
      t.symbol = symbols[idx];
    });

    this.audio.playShuffle();
    this.renderPile();
  }

  handleVictory() {
    this.audio.playWin();
    this.dom.winStats.innerHTML = `
      <div>Sets Cleared: <strong>${this.matchesCleared}</strong></div>
      <div>Total Moves: <strong>${this.movesCount}</strong></div>
    `;
    this.dom.winModal.classList.remove('hidden');
  }
}

// Initialise when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.tilePileGame = new TilePileGame();
});
