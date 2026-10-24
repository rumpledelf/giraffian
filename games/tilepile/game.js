// Tile drawing: a square face with its thickness extruded down-right, so the
// bottom and right sides both show (light bottom, darker right).
const TILE_DEPTH = 0.16; // slab thickness as a fraction of the face size

const TILE_BODY_SVG = (() => {
  const box = 100;
  const d = box * TILE_DEPTH / (1 + TILE_DEPTH);
  const f = box - d; // face size
  const r = f * 0.2;
  const k = r / Math.SQRT2;
  const n = v => +v.toFixed(2);
  const arc = (x, y) => `A${n(r)} ${n(r)} 0 0 1 ${n(x)} ${n(y)}`;
  // Outline of the face swept along the diagonal (the slab's silhouette).
  const slab = [
    `M${n(r)} 0`, `H${n(f - r)}`,
    arc(f - r + k, r - k),
    `L${n(f - r + k + d)} ${n(r - k + d)}`,
    arc(box, r + d),
    `V${n(box - r)}`,
    arc(box - r, box),
    `H${n(r + d)}`,
    arc(r + d - k, box - r + k),
    `L${n(r - k)} ${n(f - r + k)}`,
    arc(0, f - r),
    `V${n(r)}`,
    arc(r, 0), 'Z'
  ].join(' ');
  const c = f - r + k;
  return `<svg class="tile-body" viewBox="0 0 ${box} ${box}" aria-hidden="true">` +
    `<path class="tile-slab" d="${slab}"/>` +
    `<path class="tile-edge" d="M${n(c)} ${n(c)} L${n(c + d)} ${n(c + d)}"/>` +
    `<rect class="tile-top" width="${n(f)}" height="${n(f)}" rx="${n(r)}"/>` +
    `</svg>`;
})();

// Hard-split gradients for the two visible sides, shared by every tile.
document.body.insertAdjacentHTML('afterbegin', `
  <svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
    <linearGradient id="tile-side-free" gradientUnits="userSpaceOnUse" x1="0" y1="100" x2="100" y2="0">
      <stop offset="50%" stop-color="#dde3e8"/><stop offset="50%" stop-color="#c3cbd3"/>
    </linearGradient>
  </defs></svg>`);

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
    this.pendingTaps = []; // tile ids tapped while a move was animating
    this.boardVersion = 0;
    this.level = Math.max(1, Number(gameStorage.getItem('tilepile_level')) || 1);
    this.mode = gameStorage.getItem('tilepile_mode') === 'endless' ? 'endless' : 'levels';
    this.themeKey = gameStorage.getItem('tilepile_theme') || 'pantry';
    const urlParams = new URLSearchParams(window.location.search);
    const requestedSize = urlParams.get('size') || gameStorage.getItem('tilepile_size') || 'standard';
    this.pileSize = ['teacup', 'standard', 'bucket', 'mountain'].includes(requestedSize) ? requestedSize : 'standard';

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
      sizeSelect: document.getElementById('size-select'),
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
      if (this.dom.sizeSelect) this.dom.sizeSelect.value = this.pileSize;
      this.dom.themeSelect.value = this.themeKey;
      this.dom.modeSelect.value = this.mode;
      this.dom.settingsModal.classList.remove('hidden');
    });
    this.dom.btnCloseSettings.addEventListener('click', () => {
      this.dom.settingsModal.classList.add('hidden');
    });
    this.dom.btnApplySettings.addEventListener('click', () => {
      if (this.dom.sizeSelect) {
        this.pileSize = this.dom.sizeSelect.value;
        gameStorage.setItem('tilepile_size', this.pileSize);
      }
      this.themeKey = this.dom.themeSelect.value;
      this.mode = this.dom.modeSelect.value;
      gameStorage.setItem('tilepile_theme', this.themeKey);
      gameStorage.setItem('tilepile_mode', this.mode);
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
    gameStorage.setItem('tilepile_theme', this.themeKey);
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
    gameStorage.setItem('tilepile_level', String(this.level));
    this.newGame();
  }

  // Generate layered pile layout where:
  // - Tiles within the SAME layer line up edge-to-edge (separated by standard gap)
  // - Higher layers sit at half-steps (50% offset), exposing the layer below cleanly
  // - Configurable pile size: teacup (small), standard (balanced), bucket (deep pile), mountain (mega pile)
  generatePile(level) {
    const size = this.pileSize || 'standard';
    let slots = [];

    if (size === 'teacup') {
      const layoutIdx = (level - 1) % 2;
      if (layoutIdx === 0) {
        // 18 tiles (6 triplets)
        const layer0 = [
          { gx: 2, gy: 0, layer: 0 }, { gx: 4, gy: 0, layer: 0 }, { gx: 6, gy: 0, layer: 0 }, { gx: 8, gy: 0, layer: 0 },
          { gx: 0, gy: 2, layer: 0 }, { gx: 4, gy: 2, layer: 0 }, { gx: 6, gy: 2, layer: 0 }, { gx: 10, gy: 2, layer: 0 },
          { gx: 2, gy: 4, layer: 0 }, { gx: 4, gy: 4, layer: 0 }, { gx: 6, gy: 4, layer: 0 }, { gx: 8, gy: 4, layer: 0 }
        ];
        const layer1 = [
          { gx: 3, gy: 1, layer: 1 }, { gx: 5, gy: 1, layer: 1 }, { gx: 7, gy: 1, layer: 1 },
          { gx: 3, gy: 3, layer: 1 }, { gx: 5, gy: 3, layer: 1 }, { gx: 7, gy: 3, layer: 1 }
        ];
        slots = [...layer0, ...layer1];
      } else {
        // 24 tiles (8 triplets)
        const layer0 = [
          { gx: 2, gy: 0, layer: 0 }, { gx: 4, gy: 0, layer: 0 }, { gx: 6, gy: 0, layer: 0 }, { gx: 8, gy: 0, layer: 0 },
          { gx: 0, gy: 2, layer: 0 }, { gx: 2, gy: 2, layer: 0 }, { gx: 4, gy: 2, layer: 0 }, { gx: 6, gy: 2, layer: 0 }, { gx: 8, gy: 2, layer: 0 }, { gx: 10, gy: 2, layer: 0 },
          { gx: 2, gy: 4, layer: 0 }, { gx: 4, gy: 4, layer: 0 }, { gx: 6, gy: 4, layer: 0 }, { gx: 8, gy: 4, layer: 0 }
        ];
        const layer1 = [
          { gx: 3, gy: 1, layer: 1 }, { gx: 5, gy: 1, layer: 1 }, { gx: 7, gy: 1, layer: 1 },
          { gx: 1, gy: 2, layer: 1 }, { gx: 9, gy: 2, layer: 1 },
          { gx: 3, gy: 3, layer: 1 }, { gx: 5, gy: 3, layer: 1 }, { gx: 7, gy: 3, layer: 1 }
        ];
        const layer2 = [
          { gx: 4, gy: 2, layer: 2 }, { gx: 6, gy: 2, layer: 2 }
        ];
        slots = [...layer0, ...layer1, ...layer2];
      }
    } else if (size === 'bucket') {
      // 54 to 72 tiles (18 to 24 triplets) - Deep bucket of tiles to sift through
      // Layer 0: 20 tiles
      for (let gy = 0; gy <= 6; gy += 2) {
        for (let gx = 1; gx <= 11; gx += 2) {
          if ((gy === 0 || gy === 6) && (gx === 1 || gx === 11)) continue;
          slots.push({ gx, gy, layer: 0 });
        }
      }
      // Layer 1: 15 tiles
      for (let gy = 1; gy <= 5; gy += 2) {
        for (let gx = 2; gx <= 10; gx += 2) {
          slots.push({ gx, gy, layer: 1 });
        }
      }
      // Layer 2: 10 tiles
      for (let gy = 2; gy <= 4; gy += 2) {
        for (let gx = 2; gx <= 10; gx += 2) {
          slots.push({ gx, gy, layer: 2 });
        }
      }
      // Layer 3: 6 tiles
      for (let gy = 2; gy <= 4; gy += 2) {
        for (let gx = 4; gx <= 8; gx += 2) {
          slots.push({ gx, gy, layer: 3 });
        }
      }
      // Layer 4: 3 apex tiles
      for (let gx = 4; gx <= 8; gx += 2) {
        slots.push({ gx, gy: 3, layer: 4 });
      }
      // Extra layers scale with level progression (adds 6 tiles per level tier up to 72 tiles)
      const extra = Math.min(3, Math.floor((level - 1) / 3));
      for (let l = 1; l <= extra; l++) {
        for (let gy of [2, 4]) {
          for (let gx of [4, 6, 8]) {
            slots.push({ gx, gy, layer: 4 + l });
          }
        }
      }
    } else if (size === 'mountain') {
      // 84 to 108 tiles (28 to 36 triplets) - Epic mountain of tiles to dig through
      // Layer 0: 30 tiles (6 cols x 5 rows)
      for (let gy = 0; gy <= 8; gy += 2) {
        for (let gx = 1; gx <= 11; gx += 2) {
          slots.push({ gx, gy, layer: 0 });
        }
      }
      // Layer 1: 20 tiles (5 cols x 4 rows)
      for (let gy = 1; gy <= 7; gy += 2) {
        for (let gx = 2; gx <= 10; gx += 2) {
          slots.push({ gx, gy, layer: 1 });
        }
      }
      // Layer 2: 15 tiles (5 cols x 3 rows)
      for (let gy = 2; gy <= 6; gy += 2) {
        for (let gx = 2; gx <= 10; gx += 2) {
          slots.push({ gx, gy, layer: 2 });
        }
      }
      // Layer 3: 8 tiles (4 cols x 2 rows)
      for (let gy = 3; gy <= 5; gy += 2) {
        for (let gx = 3; gx <= 9; gx += 2) {
          slots.push({ gx, gy, layer: 3 });
        }
      }
      // Layer 4: 6 tiles (3 cols x 2 rows)
      for (let gy = 3; gy <= 5; gy += 2) {
        for (let gx = 4; gx <= 8; gx += 2) {
          slots.push({ gx, gy, layer: 4 });
        }
      }
      // Layer 5: 5 apex tiles
      slots.push({ gx: 4, gy: 4, layer: 5 }, { gx: 6, gy: 4, layer: 5 }, { gx: 8, gy: 4, layer: 5 });
      slots.push({ gx: 5, gy: 3, layer: 5 }, { gx: 7, gy: 3, layer: 5 });
      // Extra layers scale with level progression (adds 6 tiles per level tier up to 108 tiles)
      const extra = Math.min(4, Math.floor((level - 1) / 3));
      for (let l = 1; l <= extra; l++) {
        for (let gy of [3, 5]) {
          for (let gx of [5, 6, 7]) {
            slots.push({ gx, gy, layer: 5 + l });
          }
        }
      }
    } else {
      // Standard: 30 to 48 tiles - Original classic layouts
      const layoutIdx = (level - 1) % 4;

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

      // Each four-layout cycle adds another six-tile layer of dependencies.
      const extraLayers = Math.min(4, Math.floor((level - 1) / 4));
      const topLayer = Math.max(...slots.map(s => s.layer));
      for (let layer = 1; layer <= extraLayers; layer++) {
        for (const gy of [1, 3]) for (const gx of [3, 5, 7]) {
          slots.push({ gx, gy, layer: topLayer + layer });
        }
      }
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
    const pool = [...this.currentTheme.items];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const symbols = pool.slice(0, uniqueItemCount);

    // First find an actual legal removal order, including tiles uncovered mid-set.
    const remaining = [...slots];
    const order = [];
    while (remaining.length) {
      const free = remaining.filter(tile => !remaining.some(other => this.tileCovers(other, tile)));
      const tile = free[Math.floor(Math.random() * free.length)];
      order.push(tile);
      remaining.splice(remaining.indexOf(tile), 1);
    }

    // Later levels interleave up to three sets: ABC ABC ABC. Following the
    // removal order needs at most seven tray slots and always clears every set.
    // Matches are no longer all handed to the player as three exposed neighbours.
    const width = Math.min(3, 1 + Math.floor((this.level - 1) / 2));
    let offset = 0, set = 0;
    while (set < tripletCount) {
      const count = Math.min(width, tripletCount - set);
      for (let repeat = 0; repeat < 3; repeat++) {
        for (let i = 0; i < count; i++) order[offset++].symbol = symbols[(set + i) % symbols.length];
      }
      set += count;
    }
  }

  newGame() {
    this.cancelAnimation();
    this.hideModals();
    this.tiles = this.generatePile(this.level);
    this.history = [];
    this.tray = [];
    this.matchesCleared = 0;
    this.movesCount = 0;
    this.initialState = this.snapshot();
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
    const tilesById = new Map(this.tiles.map(t => [t.id, t]));
    this.tray = state.tray.map(t => tilesById.get(t.id));
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
  }

  cancelAnimation() {
    this.boardVersion++;
    this.isAnimating = false;
    this.pendingTaps = [];
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
    const size = this.pileSize || 'standard';
    const sizeName = size.charAt(0).toUpperCase() + size.slice(1);
    this.dom.levelBadge.textContent = isEndless
      ? (size === 'standard' ? 'Endless' : `Endless • ${sizeName}`)
      : (size === 'standard' ? `Level ${this.level}` : `Level ${this.level} • ${sizeName}`);
  }

  // Match the layer/row/column order used to draw overlapping tiles.
  tileCovers(top, bottom) {
    const above = top.layer > bottom.layer ||
      (top.layer === bottom.layer && (top.gy > bottom.gy ||
        (top.gy === bottom.gy && top.gx > bottom.gx)));
    return above && Math.abs(top.gx - bottom.gx) < 2 &&
      Math.abs(top.gy - bottom.gy) < 2;
  }

  // A tile is free only when no remaining tile is drawn over it.
  isTileFree(tile) {
    if (tile.collected) return false;
    return !this.tiles.some(other =>
      !other.collected &&
      this.tileCovers(other, tile)
    );
  }

  // Tiles are updated in place rather than rebuilt: replacing a tile's element
  // between press and release swallows the click.
  renderPile() {
    const stage = this.dom.pileStage;
    const existing = new Map([...stage.children].map(el => [el.id, el]));

    const activeTiles = this.tiles.filter(t => !t.collected);
    if (activeTiles.length === 0) {
      stage.replaceChildren();
      return;
    }

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
    const stageWidth = stage.clientWidth || 540;
    const baseStep = isMobile ? 24 : 28;
    const baseTileSize = isMobile ? 44 : 50;
    const maxLayer = Math.max(...this.tiles.map(t => t.layer));
    const baseWidth = (maxGx - minGx - 2) * baseStep + baseTileSize * (1 + TILE_DEPTH * (maxLayer + 1));
    const baseHeight = (maxGy - minGy - 2) * baseStep + baseTileSize * (1 + TILE_DEPTH * (maxLayer + 1));

    // Responsive scaling based on width and max vertical allowance
    const maxAllowedHeight = isMobile ? 380 : 440;
    const scaleY = maxAllowedHeight > 200 ? maxAllowedHeight / baseHeight : 1;
    const scale = Math.min(1, Math.max(1, stageWidth - 16) / baseWidth, scaleY);

    const stepPx = baseStep * scale;
    const tileSize = baseTileSize * scale;
    stage.style.setProperty('--pile-font-size', `${(isMobile ? 1.55 : 1.85) * scale}rem`);

    // Each tile is a square face plus a slab pushed down-right; every layer
    // sits one slab higher (up-left) than the one beneath it.
    const depth = Math.round(tileSize * TILE_DEPTH);

    const pileWidth = (maxGx - minGx - 2) * stepPx + tileSize + depth * (maxLayer + 1);
    const pileHeight = (maxGy - minGy - 2) * stepPx + tileSize + depth * (maxLayer + 1);

    const targetStageHeight = Math.max(isMobile ? 260 : 310, Math.ceil(pileHeight + 20));
    stage.style.height = `${targetStageHeight}px`;

    const offsetX = Math.max(8, Math.round((stageWidth - pileWidth) / 2));
    const offsetY = Math.max(8, Math.round((targetStageHeight - pileHeight) / 2));

    // Sort by layer asc, then gy asc, then gx asc; the rank is the z-index
    const sortedTiles = [...this.tiles].sort((a, b) => {
      if (a.layer !== b.layer) return a.layer - b.layer;
      if (a.gy !== b.gy) return a.gy - b.gy;
      return a.gx - b.gx;
    });

    sortedTiles.forEach((tile, rank) => {
      const id = `pile-tile-${tile.id}`;
      let el = existing.get(id);
      existing.delete(id);
      if (tile.collected) {
        if (el) el.remove();
        return;
      }

      const isFree = this.isTileFree(tile);
      const lift = (maxLayer - tile.layer) * depth;
      const left = offsetX + (tile.gx - minGx) * stepPx + lift;
      const top = offsetY + (tile.gy - minGy) * stepPx + lift;

      if (!el) {
        el = this.createPileTile(tile.id);
        stage.appendChild(el);
      }
      el.className = `pile-tile ${isFree ? 'free' : 'blocked'}${tile.layer === 0 ? ' base' : ''}`;
      if (this.pendingTaps.includes(tile.id)) el.classList.add('queued');
      el.style.visibility = '';
      el.querySelector('.tile-symbol').textContent = tile.symbol;
      el.style.width = `${tileSize + depth}px`;
      el.style.height = `${tileSize + depth}px`;
      el.style.left = `${left}px`;
      el.style.top = `${top}px`;
      el.style.zIndex = rank + 1;
      el.tabIndex = isFree ? 0 : -1;
      el.setAttribute('aria-label', `${tile.symbol} tile, ${isFree ? 'free to pick' : 'covered by another tile'}`);
    });

    // Elements left over belong to tiles from a previous board
    existing.forEach(el => el.remove());
  }

  createPileTile(tileId) {
    const el = document.createElement('div');
    el.id = `pile-tile-${tileId}`;
    el.setAttribute('role', 'button');
    this.addTileFace(el, '');
    // Look the tile up on each tap: undo and restart replace the tile objects
    const tap = () => {
      const tile = this.tiles.find(t => t.id === tileId);
      if (tile) this.handleTileClick(tile, el);
    };
    el.addEventListener('click', tap);
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        tap();
      }
    });
    return el;
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
        this.addTileFace(slot, tile.symbol);
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

  addTileFace(el, symbol) {
    el.insertAdjacentHTML('beforeend', TILE_BODY_SVG);
    const face = document.createElement('span');
    face.className = 'tile-symbol';
    face.textContent = symbol;
    el.appendChild(face);
  }

  async handleTileClick(tile, tileEl) {
    // Mid-animation taps on free tiles are queued, not dropped: the tile
    // glows now and flies as soon as the current move finishes.
    if (this.isAnimating) {
      if (!tile.collected && this.isTileFree(tile) && !this.pendingTaps.includes(tile.id)) {
        this.pendingTaps.push(tile.id);
        tileEl.classList.add('queued');
        this.audio.playTileTap();
      }
      return;
    }

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
    const version = this.boardVersion;
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
    this.addTileFace(clone, tile.symbol);
    clone.style.left = `${startRect.left}px`;
    clone.style.top = `${startRect.top}px`;
    clone.style.width = `${startRect.width}px`;
    clone.style.height = `${startRect.height}px`;
    document.body.appendChild(clone);

    this.renderTray();
    const targetSlotEl = document.getElementById(`tray-slot-${targetIdx}`);
    const endRect = targetSlotEl.getBoundingClientRect();
    targetSlotEl.style.visibility = 'hidden';

    const endScale = endRect.width / startRect.width;
    const anim = clone.animate([
      { transform: 'translate(0, 0) scale(1)' },
      { transform: `translate(${(endRect.left - startRect.left) * 0.5}px, ${(endRect.top - startRect.top) * 0.5 - 20}px) scale(1.08)`, offset: 0.5 },
      { transform: `translate(${endRect.left - startRect.left}px, ${endRect.top - startRect.top}px) scale(${endScale})` }
    ], {
      duration: 250,
      easing: 'cubic-bezier(0.2, 0.9, 0.3, 1)'
    });

    await anim.finished;
    clone.remove();
    if (version !== this.boardVersion) return;
    targetSlotEl.style.visibility = '';
    this.audio.playTileLand();

    // Re-render pile: uncovered tiles immediately transition to free (.free)
    this.renderPile();
    this.updateStats();

    await this.checkMatch(version);

    if (version !== this.boardVersion) return;
    this.isAnimating = false;
    this.updateStats();
    this.runPendingTap();
  }

  runPendingTap() {
    // A jam or win ends the move sequence; drop anything still queued
    const stopped = !this.dom.jamModal.classList.contains('hidden') ||
      this.tiles.every(t => t.collected);
    while (this.pendingTaps.length && !stopped) {
      const tileId = this.pendingTaps.shift();
      const tile = this.tiles.find(t => t.id === tileId);
      const el = tile && document.getElementById(`pile-tile-${tile.id}`);
      if (el && !tile.collected && this.isTileFree(tile)) {
        el.classList.remove('queued');
        this.handleTileClick(tile, el);
        return;
      }
    }
    this.pendingTaps = [];
    document.querySelectorAll('.pile-tile.queued').forEach(el => el.classList.remove('queued'));
  }

  async checkMatch(version = this.boardVersion) {
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
      if (version !== this.boardVersion) return;

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
      if (version !== this.boardVersion) return;

      // Remove the 3 matched tiles from tray
      this.tray = this.tray.filter((t, i) => !matchIndices.includes(i));
      this.matchesCleared++;
      this.renderTray();
      this.updateStats();

      // Check for victory
      const allCollected = this.tiles.every(t => t.collected);
      if (allCollected && this.tray.length === 0) {
        await new Promise(r => setTimeout(r, 250));
        if (version !== this.boardVersion) return;
        this.handleVictory();
        return;
      }
    }

    // Check for jammed tray
    if (this.tray.length >= this.maxTraySlots) {
      await new Promise(r => setTimeout(r, 300));
      if (version !== this.boardVersion) return;
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


/** Versioned, per-game browser checkpoint. Never serialize DOM or animation objects. */
class BrowserCheckpoint {
  constructor(game, options) {
    this.game = game;
    this.options = options;
    this.key = 'giraffian_' + options.id + '_save_v1';
    this.pending = 0;
    this.restoring = false;
    const fresh = this.encode();
    try {
      const raw = localStorage.getItem(this.key);
      if (raw) {
        if (raw.length > 4000000) throw new Error('Checkpoint too large');
        const saved = JSON.parse(raw, BrowserCheckpoint.revive);
        if (saved.version !== 1 || !this.valid(saved.state)) throw new Error('Invalid checkpoint');
        this.apply(saved.state);
      }
    } catch (error) {
      this.apply(JSON.parse(fresh, BrowserCheckpoint.revive).state);
    }
    for (const name of options.actions.split(' ')) {
      if (typeof game[name] !== 'function') continue;
      const original = game[name].bind(game);
      game[name] = (...args) => {
        this.save(); // Keep the last complete move if the page dies mid-animation.
        this.pending++;
        let result;
        try { result = original(...args); }
        catch (error) { this.pending--; throw error; }
        if (result && typeof result.then === 'function') {
          return result.finally(() => { this.pending--; this.save(); });
        }
        this.pending--;
        this.save();
        return result;
      };
    }
    document.getElementById('btn-reset-progress').addEventListener('click', () => {
      if (!confirm('Reset this game to level 1 and discard its saved board? Your other games are kept.')) return;
      this.suspended = true;
      // Reload cancels every old animation and timer before starting the fresh board.
      try {
        localStorage.removeItem(this.key);
        localStorage.setItem(options.levelKey, '1');
        if (options.id === 'hexsort') localStorage.removeItem('hexsort_endless_cleared');
      } catch (error) { this.suspended = false; this.status('Browser saving is unavailable.'); return; }
      location.reload();
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.save(); });
    window.addEventListener('pagehide', () => this.save());
    // Also captures continuous play, pause/speed changes and delayed completion dialogs.
    setInterval(() => this.save(), 1000);
    this.save();
  }

  static replace(key, value) {
    if (value instanceof Map) return { checkpointMap: [...value] };
    return value;
  }

  static revive(key, value) {
    if (value && Array.isArray(value.checkpointMap)) return new Map(value.checkpointMap);
    return value;
  }

  encode() {
    const state = {};
    for (const field of this.options.fields.split(' ')) state[field] = this.game[field];
    if (this.options.capture) this.options.capture(this.game, state);
    return JSON.stringify({ version: 1, state }, BrowserCheckpoint.replace);
  }

  valid(state) {
    if (!state || typeof state !== 'object') return false;
    const safe = value => {
      if (value === null || typeof value === 'boolean' || typeof value === 'string') return true;
      if (typeof value === 'number') return Number.isFinite(value);
      if (value instanceof Map) return [...value].every(pair => pair.every(safe));
      if (Array.isArray(value)) return value.length <= 10000 && value.every(safe);
      return typeof value === 'object' && Object.entries(value).every(([key, v]) => !['__proto__', 'constructor', 'prototype'].includes(key) && safe(v));
    };
    if (!safe(state)) return false;
    for (const field of this.options.fields.split(' ')) {
      const value = state[field], example = this.game[field];
      if (value === undefined || typeof value !== typeof example) return false;
      if (typeof value === 'number' && (!Number.isFinite(value) || value < 0)) return false;
      if (Array.isArray(example) && !Array.isArray(value)) return false;
      if (example instanceof Map && !(value instanceof Map)) return false;
    }
    return this.options.validate(state);
  }

  apply(state) {
    this.restoring = true;
    for (const field of this.options.fields.split(' ')) this.game[field] = state[field];
    try { this.options.resume(this.game); }
    finally { this.restoring = false; }
  }

  status(message) {
    document.getElementById('save-status').textContent = message;
  }

  save() {
    if (this.pending || this.restoring || this.suspended) return;
    try {
      const encoded = this.encode();
      if (encoded !== this.lastSaved) {
        localStorage.setItem(this.key, encoded);
        this.lastSaved = encoded;
      }
      this.status('Your board and progress are saved in this browser.');
    } catch (error) {
      this.status('This browser could not save your game. Keep this page open to keep playing.');
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const game = window.tilePileGame;
  game.checkpoint = new BrowserCheckpoint(game, {
    id: 'tilepile', levelKey: 'tilepile_level',
    fields: 'level mode themeKey tiles tray matchesCleared movesCount history initialState',
    actions: 'newGame restartGame nextLevel undoMove handleTileClick checkMatch tidyUpTray shuffleFreeTiles cycleTheme',
    validate: s => s.level >= 1 && s.tiles.length > 0 && s.tray.length <= 7 && s.tiles.every(t => Number.isInteger(t.id) && Number.isFinite(t.gx) && Number.isFinite(t.gy) && typeof t.symbol === 'string') && s.tray.every(t => s.tiles.some(p => p.id === t.id)),
    resume: g => { g.restore(g.snapshot()); g.updateThemeUI(); g.render(); if (g.tiles.every(t => t.collected) && !g.tray.length) g.handleVictory(); else if (g.tray.length >= 7) g.dom.jamModal.classList.remove('hidden'); },
  });
});
