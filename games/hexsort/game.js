/**
 * Hex Sort: Place layered hex stacks onto the board.
 * Adjacent stacks with matching top colours flip together; 10+ of a colour clear!
 */

const HEX_COLORS = [
  { id: 0, name: 'Yellow', hex: '#f7e55f', text: '#000000' },
  { id: 1, name: 'Blue',   hex: '#3a7ede', text: '#ffffff' },
  { id: 2, name: 'Green',  hex: '#589a56', text: '#ffffff' },
  { id: 3, name: 'Coral',  hex: '#ec8d6f', text: '#000000' },
  { id: 4, name: 'Purple', hex: '#dcb0ed', text: '#000000' },
  { id: 5, name: 'Aqua',   hex: '#82dee6', text: '#000000' },
  { id: 6, name: 'Grey',   hex: '#bec6ce', text: '#000000' }
];

const HEX_DIRS = [
  [1, 0], [0, 1], [-1, 1],
  [-1, 0], [0, -1], [1, -1]
];

const HEX_POINTS = '40,3 76,19 76,53 40,69 4,53 4,19';
const STACK_STEP = 4; // px between layers in a stack

function hexDist(q, r) {
  return Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r));
}

// Named board layouts so each level has a distinct, recognizable shape
const BOARD_LAYOUTS = {
  honeycomb: {
    name: 'Honeycomb',
    radius: 2,
    filter: (q, r) => hexDist(q, r) <= 2
  },
  blossom: {
    name: 'Blossom',
    radius: 2,
    filter: (q, r) => {
      const d = hexDist(q, r);
      if (d <= 1) return true;
      return (
        (q === 1 && r === -2) ||
        (q === 2 && r === -1) ||
        (q === 1 && r === 1) ||
        (q === -1 && r === 2) ||
        (q === -2 && r === 1) ||
        (q === -1 && r === -1)
      );
    }
  },
  ring: {
    name: 'Honeycomb Ring',
    radius: 2,
    filter: (q, r) => {
      const d = hexDist(q, r);
      return d >= 1 && d <= 2;
    }
  },
  butterfly: {
    name: 'Butterfly',
    radius: 2,
    filter: (q, r) => hexDist(q, r) <= 2 && !(q === 1 && r === -2) && !(q === -1 && r === 2)
  },
  hourglass: {
    name: 'Hourglass',
    radius: 2,
    filter: (q, r) => hexDist(q, r) <= 2 && !(q === -2 && r === 0) && !(q === 2 && r === 0)
  },
  bridges: {
    name: 'Twin Bridges',
    radius: 2,
    filter: (q, r) => hexDist(q, r) <= 2 && !(q === 0 && r === 0) && !(q === 1 && r === -2) && !(q === -1 && r === 2)
  },
  wide: {
    name: 'Wide Hive',
    radius: 3,
    filter: (q, r) => {
      if (hexDist(q, r) <= 2) return true;
      return (
        (q === -2 && r === -1) ||
        (q === 3 && r === -1) ||
        (q === -3 && r === 1) ||
        (q === 2 && r === 1)
      );
    }
  },
  small: {
    name: 'Small Hive',
    radius: 1,
    filter: (q, r) => hexDist(q, r) <= 1
  },
  large: {
    name: 'Grand Hive',
    radius: 3,
    filter: (q, r) => hexDist(q, r) <= 3
  }
};

// Progression rotation when Board Layout is set to "Vary by Level"
const LEVEL_LAYOUT_ROTATION = [
  'honeycomb',
  'blossom',
  'ring',
  'butterfly',
  'hourglass',
  'bridges',
  'wide'
];

class HexSortGame {
  constructor() {
    this.clearThreshold = 10;
    const savedLayout = localStorage.getItem('hexsort_layout') || 'auto';
    this.layoutSetting = (savedLayout === 'auto' || BOARD_LAYOUTS[savedLayout]) ? savedLayout : 'auto';
    const savedTarget = localStorage.getItem('hexsort_target') || 'progressive';
    this.targetSetting = ['60', 'progressive', '150', '250'].includes(savedTarget) ? savedTarget : 'progressive';
    this.mode = localStorage.getItem('hexsort_mode') === 'endless' ? 'endless' : 'levels';
    this.level = Math.max(1, Number(localStorage.getItem('hexsort_level')) || 1);
    this.endlessCleared = Math.max(0, Number(localStorage.getItem('hexsort_endless_cleared')) || 0);

    this.audio = new window.HexSortAudio();
    this.coords = [];
    this.neighbors = [];
    this.cells = [];
    this.tray = [null, null, null];
    this.selectedTray = null;
    this.lastDragEnd = 0;
    this.pendingStarts = []; // cells placed mid-chain, waiting for the running settle
    this.landing = null;     // a mid-chain placement's landing flight
    this.tilesCleared = 0;
    this.stacksCleared = 0;
    this.history = [];
    this.isAnimating = false;
    this.boardVersion = 0;

    this.dom = {};
    for (const id of [
      'hex-board', 'hex-tray', 'level-badge', 'goal-label', 'tiles-cleared',
      'tiles-target', 'target-wrap', 'stacks-cleared', 'progress-track', 'progress-fill',
      'btn-sound', 'sound-icon-on', 'sound-icon-off', 'btn-settings', 'settings-modal',
      'layout-select', 'target-select', 'mode-select', 'btn-close-settings', 'btn-apply-settings',
      'btn-restart', 'btn-undo', 'btn-shuffle', 'btn-new',
      'win-modal', 'win-stats', 'btn-next-level',
      'jam-modal', 'btn-jam-shuffle', 'btn-jam-undo', 'btn-jam-restart'
    ]) {
      this.dom[id] = document.getElementById(id);
    }

    this.bindEvents();
    this.updateSoundIcons();
    this.newGame();
  }

  get activeLayoutKey() {
    if (this.layoutSetting !== 'auto' && BOARD_LAYOUTS[this.layoutSetting]) {
      return this.layoutSetting;
    }
    return LEVEL_LAYOUT_ROTATION[(this.level - 1) % LEVEL_LAYOUT_ROTATION.length];
  }

  get activeLayout() {
    return BOARD_LAYOUTS[this.activeLayoutKey];
  }

  get targetTiles() {
    if (this.targetSetting === 'progressive') {
      return 80 + (this.level - 1) * 20;
    }
    return Number(this.targetSetting) || 100;
  }

  get activeColorCount() {
    if (this.mode === 'endless') return 6;
    return Math.min(HEX_COLORS.length, 4 + Math.floor((this.level - 1) / 2));
  }

  bindEvents() {
    this.dom['btn-restart'].addEventListener('click', () => this.restartGame());
    this.dom['btn-undo'].addEventListener('click', () => this.undoMove());
    this.dom['btn-shuffle'].addEventListener('click', () => this.shuffleTray(false));
    this.dom['btn-new'].addEventListener('click', () => this.newGame());
    this.dom['btn-next-level'].addEventListener('click', () => this.nextLevel());

    this.dom['btn-jam-shuffle'].addEventListener('click', () => this.shuffleTray(true));
    this.dom['btn-jam-undo'].addEventListener('click', () => {
      this.dom['jam-modal'].classList.add('hidden');
      this.undoMove();
    });
    this.dom['btn-jam-restart'].addEventListener('click', () => this.restartGame());

    this.dom['btn-sound'].addEventListener('click', () => {
      this.audio.toggleMute();
      this.updateSoundIcons();
    });

    this.dom['btn-settings'].addEventListener('click', () => {
      this.dom['layout-select'].value = this.layoutSetting;
      this.dom['target-select'].value = this.targetSetting;
      this.dom['mode-select'].value = this.mode;
      this.dom['settings-modal'].classList.remove('hidden');
    });

    this.dom['btn-close-settings'].addEventListener('click', () => {
      this.dom['settings-modal'].classList.add('hidden');
    });

    this.dom['btn-apply-settings'].addEventListener('click', () => {
      this.layoutSetting = this.dom['layout-select'].value;
      this.targetSetting = this.dom['target-select'].value;
      this.mode = this.dom['mode-select'].value;
      localStorage.setItem('hexsort_layout', this.layoutSetting);
      localStorage.setItem('hexsort_target', this.targetSetting);
      localStorage.setItem('hexsort_mode', this.mode);
      this.dom['settings-modal'].classList.add('hidden');
      this.newGame();
    });

    this.dom['settings-modal'].addEventListener('click', e => {
      if (e.target === this.dom['settings-modal']) {
        this.dom['settings-modal'].classList.add('hidden');
      }
    });

    window.addEventListener('resize', () => {
      if (!this.isAnimating) this.render();
    });

    window.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        this.dom['settings-modal'].classList.add('hidden');
        this.selectedTray = null;
        this.refreshSelection();
        return;
      }
      if (e.target.closest('input, select, textarea, button') || e.ctrlKey || e.metaKey || e.altKey) return;
      if (!this.dom['settings-modal'].classList.contains('hidden')) return;
      const k = e.key.toLowerCase();
      if (k === 'u') this.undoMove();
      if (k === 'r') this.restartGame();
      if (k === 's') this.shuffleTray(false);
      if (k === 'n') this.newGame();
      if (k === '1' || k === '2' || k === '3') {
        const idx = Number(k) - 1;
        if (this.tray[idx]) this.handleTrayTap(idx);
      }
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

  buildGridTopology() {
    const layout = this.activeLayout;
    const R = layout.radius;
    this.coords = [];
    const coordMap = new Map();
    for (let r = -R; r <= R; r++) {
      for (let q = -R; q <= R; q++) {
        if (layout.filter(q, r)) {
          const idx = this.coords.length;
          this.coords.push({ q, r });
          coordMap.set(`${q},${r}`, idx);
        }
      }
    }
    this.neighbors = this.coords.map(({ q, r }) => {
      const list = [];
      for (const [dq, dr] of HEX_DIRS) {
        const nb = coordMap.get(`${q + dq},${r + dr}`);
        if (nb !== undefined) list.push(nb);
      }
      return list;
    });
  }

  snapshot() {
    return {
      cells: this.cells.map(s => [...s]),
      tray: this.tray.map(s => (s ? [...s] : null)),
      tilesCleared: this.tilesCleared,
      stacksCleared: this.stacksCleared,
      endlessCleared: this.endlessCleared
    };
  }

  restore(state) {
    this.cells = state.cells.map(s => [...s]);
    this.tray = state.tray.map(s => (s ? [...s] : null));
    this.tilesCleared = state.tilesCleared;
    this.stacksCleared = state.stacksCleared;
    this.endlessCleared = state.endlessCleared;
    if (this.mode === 'endless') {
      localStorage.setItem('hexsort_endless_cleared', String(this.endlessCleared));
    }
  }

  cancelAnimation() {
    this.boardVersion++;
    this.isAnimating = false;
    this.pendingStarts = [];
    this.landing = null;
    this.cleanupDrag();
    document.querySelectorAll('.hex-tile.flying, .puff-particle, .drag-ghost').forEach(el => el.remove());
  }

  // Generate a stack of 3..6 tiles grouped into 1..3 colour layers
  generateStack(preferredColors = []) {
    const numColors = this.activeColorCount;
    const layers = Math.random() < 0.28 ? 1 : (Math.random() < 0.78 ? 2 : 3);
    const totalTiles = 3 + Math.floor(Math.random() * 4); // 3 to 6 tiles
    const layerColors = [];

    for (let l = 0; l < layers; l++) {
      let c;
      const isTopLayer = l === layers - 1;
      if (isTopLayer && preferredColors.length > 0 && Math.random() < 0.65) {
        c = preferredColors[Math.floor(Math.random() * preferredColors.length)];
      } else {
        c = Math.floor(Math.random() * numColors);
      }
      if (layerColors.length > 0 && c === layerColors[layerColors.length - 1]) {
        c = (c + 1) % numColors;
      }
      layerColors.push(c);
    }

    const counts = Array(layers).fill(1);
    let rem = totalTiles - layers;
    while (rem > 0) {
      counts[Math.floor(Math.random() * layers)]++;
      rem--;
    }

    const stack = [];
    for (let l = 0; l < layers; l++) {
      for (let k = 0; k < counts[l]; k++) {
        stack.push(layerColors[l]);
      }
    }
    return stack;
  }

  getBoardTopColors() {
    const tops = [];
    for (const s of this.cells) {
      if (s.length > 0) tops.push(s[s.length - 1]);
    }
    return tops;
  }

  dealTrayStacks() {
    const tops = this.getBoardTopColors();
    this.tray = [
      this.generateStack(tops),
      this.generateStack(tops),
      this.generateStack(tops)
    ];
    this.selectedTray = null;
  }

  seedInitialBoard() {
    const totalCells = this.coords.length;
    const count = totalCells <= 8 ? 2 : (totalCells <= 24 ? 4 : 6);
    const indices = this.coords.map((_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    const chosen = [];
    for (const idx of indices) {
      if (chosen.length >= count) break;
      const stack = this.generateStack();
      const top = stack[stack.length - 1];
      const clashes = this.neighbors[idx].some(nb => {
        const nbStack = this.cells[nb];
        return nbStack && nbStack.length > 0 && nbStack[nbStack.length - 1] === top;
      });
      if (!clashes) {
        this.cells[idx] = stack;
        chosen.push(idx);
      }
    }
  }

  newGame() {
    this.cancelAnimation();
    this.buildGridTopology();
    this.cells = Array.from({ length: this.coords.length }, () => []);
    this.tilesCleared = 0;
    this.stacksCleared = 0;
    this.seedInitialBoard();
    this.dealTrayStacks();
    this.initialState = this.snapshot();
    this.history = [];
    this.hideModals();
    this.render();
  }

  restartGame() {
    this.cancelAnimation();
    this.restore(this.initialState);
    this.history = [];
    this.selectedTray = null;
    this.hideModals();
    this.render();
  }

  nextLevel() {
    this.level++;
    localStorage.setItem('hexsort_level', String(this.level));
    this.newGame();
  }

  hideModals() {
    this.dom['win-modal'].classList.add('hidden');
    this.dom['jam-modal'].classList.add('hidden');
  }

  undoMove() {
    if (this.isAnimating || !this.history.length) return;
    this.restore(this.history.pop());
    this.selectedTray = null;
    this.audio.playUndo();
    this.render();
    // A move made mid-chain was saved mid-chain, so let the board finish settling.
    this.isAnimating = true;
    this.settle();
  }

  topColor(cellIdx) {
    const s = this.cells[cellIdx];
    return s.length ? s[s.length - 1] : null;
  }

  topRun(stack) {
    let n = 0;
    while (n < stack.length && stack[stack.length - 1 - n] === stack[stack.length - 1]) {
      n++;
    }
    return n;
  }

  createHexTileElement(colorId, offsetY = 0, topRunCount = null) {
    const info = HEX_COLORS[colorId] || HEX_COLORS[0];
    const tile = document.createElement('div');
    tile.className = 'hex-tile';
    tile.style.setProperty('--tile-color', info.hex);
    tile.style.setProperty('--tile-text', info.text);
    tile.style.setProperty('--offset-y', `${offsetY}px`);

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 80 72');
    const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    poly.setAttribute('points', HEX_POINTS);
    poly.setAttribute('class', 'hex-tile-poly');
    svg.appendChild(poly);
    tile.appendChild(svg);

    if (topRunCount !== null) {
      const badge = document.createElement('div');
      badge.className = 'hex-tile-count';
      badge.textContent = String(topRunCount);
      tile.appendChild(badge);
    }
    return tile;
  }

  // Every layer is the same whole-pixel thickness, so stacks never squash
  // as they grow and all stacks read alike.
  renderStackElements(container, stack) {
    const run = this.topRun(stack);
    stack.forEach((colorId, idx) => {
      const isTop = idx === stack.length - 1;
      const offsetY = -idx * STACK_STEP;
      const tile = this.createHexTileElement(colorId, offsetY, isTop ? run : null);
      container.appendChild(tile);
    });
  }

  computeCellMetrics() {
    const vw = Math.min(window.innerWidth - 64, 660);
    const xs = this.coords.map(({ q, r }) => q + r * 0.5);
    const spanX = Math.max(...xs) - Math.min(...xs) + 1;
    const baseW = spanX <= 3 ? 82 : (spanX <= 5 ? 68 : (spanX <= 6 ? 60 : 54));
    const maxW = Math.floor((vw - (spanX - 1) * 6) / spanX);
    const hexW = Math.max(42, Math.min(baseW, maxW));
    const hexH = Math.round(hexW * 0.9);
    const gapX = spanX >= 6 ? 5 : 7;
    const gapY = spanX >= 6 ? 11 : 14;
    const stepX = hexW + gapX;
    const stepY = Math.round(hexH * 0.78) + gapY;
    return { hexW, hexH, stepX, stepY };
  }

  render() {
    this.renderBoard();
    this.renderTray();
    this.updateStats();
  }

  renderBoard() {
    const board = this.dom['hex-board'];
    board.replaceChildren();

    const { hexW, hexH, stepX, stepY } = this.computeCellMetrics();
    const headroom = 32;

    const rawPositions = this.coords.map(({ q, r }) => ({
      x: (q + r * 0.5) * stepX,
      y: r * stepY
    }));

    const minX = Math.min(...rawPositions.map(p => p.x));
    const maxX = Math.max(...rawPositions.map(p => p.x));
    const minY = Math.min(...rawPositions.map(p => p.y));
    const maxY = Math.max(...rawPositions.map(p => p.y));

    const boardW = (maxX - minX) + hexW;
    const boardH = (maxY - minY) + hexH + headroom;
    board.style.width = `${boardW}px`;
    board.style.height = `${boardH}px`;

    const hasSelectedTray = this.selectedTray !== null && this.tray[this.selectedTray] !== null;

    this.cells.forEach((stack, i) => {
      const cell = document.createElement('div');
      cell.className = 'hex-cell';
      cell.dataset.index = String(i);
      if (stack.length > 0) {
        cell.classList.add('occupied');
      } else if (hasSelectedTray) {
        cell.classList.add('can-drop');
      }

      const left = rawPositions[i].x - minX;
      const top = rawPositions[i].y - minY + headroom;
      cell.style.left = `${left}px`;
      cell.style.top = `${top}px`;
      cell.style.width = `${hexW}px`;
      cell.style.height = `${hexH}px`;
      cell.tabIndex = 0;
      cell.setAttribute('role', 'button');

      if (stack.length > 0) {
        const topCol = HEX_COLORS[stack[stack.length - 1]].name;
        cell.setAttribute('aria-label', `Hex ${i + 1}: ${stack.length} tiles, ${this.topRun(stack)} ${topCol} on top`);
      } else {
        cell.setAttribute('aria-label', `Hex ${i + 1}: empty`);
      }

      const baseSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      baseSvg.setAttribute('viewBox', '0 0 80 72');
      baseSvg.setAttribute('class', 'hex-base-svg');
      const basePoly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      basePoly.setAttribute('points', HEX_POINTS);
      basePoly.setAttribute('class', 'hex-base-poly');
      baseSvg.appendChild(basePoly);
      cell.appendChild(baseSvg);

      const stackWrap = document.createElement('div');
      stackWrap.className = 'hex-stack';
      if (stack.length > 0) {
        this.renderStackElements(stackWrap, stack);
      }
      cell.appendChild(stackWrap);

      cell.addEventListener('click', () => this.handleCellTap(i));
      cell.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.handleCellTap(i);
        }
      });

      board.appendChild(cell);
    });
  }

  renderTray() {
    const trayEl = this.dom['hex-tray'];
    trayEl.replaceChildren();

    // Fixed 3-slot indices [slot0, slot1, slot2] - never shift or collapse
    this.tray.forEach((stack, slotIdx) => {
      const slot = document.createElement('div');
      slot.className = 'tray-slot';
      slot.dataset.slot = String(slotIdx);

      if (!stack || stack.length === 0) {
        slot.classList.add('empty');
        slot.setAttribute('aria-label', `Tray slot ${slotIdx + 1}: empty`);
      } else {
        if (this.selectedTray === slotIdx) {
          slot.classList.add('selected');
        }
        slot.tabIndex = 0;
        slot.setAttribute('role', 'button');
        const topCol = HEX_COLORS[stack[stack.length - 1]].name;
        slot.setAttribute('aria-label', `Tray slot ${slotIdx + 1}: ${stack.length} tiles, ${this.topRun(stack)} ${topCol} on top`);

        const wrap = document.createElement('div');
        wrap.className = 'tray-stack-wrap';
        this.renderStackElements(wrap, stack);
        slot.appendChild(wrap);

        slot.addEventListener('click', () => {
          // A drag already handled this press; don't let its click toggle it off.
          if (performance.now() - this.lastDragEnd < 400) return;
          this.handleTrayTap(slotIdx);
        });
        slot.addEventListener('keydown', e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this.handleTrayTap(slotIdx);
          }
        });
        this.attachDragHandlers(slot, slotIdx);
      }

      trayEl.appendChild(slot);
    });
  }

  updateStats() {
    const endless = this.mode === 'endless';
    const layoutName = this.activeLayout.name;
    if (endless) {
      this.dom['level-badge'].textContent = `Endless: ${layoutName}`;
      this.dom['tiles-cleared'].textContent = String(this.endlessCleared);
      this.dom['target-wrap'].classList.add('hidden');
      this.dom['progress-track'].classList.add('hidden');
    } else {
      this.dom['level-badge'].textContent = `Level ${this.level}: ${layoutName}`;
      this.dom['tiles-cleared'].textContent = String(this.tilesCleared);
      this.dom['tiles-target'].textContent = String(this.targetTiles);
      this.dom['target-wrap'].classList.remove('hidden');
      this.dom['progress-track'].classList.remove('hidden');
      const pct = Math.min(100, Math.round((this.tilesCleared / this.targetTiles) * 100));
      this.dom['progress-fill'].style.width = `${pct}%`;
    }
    this.dom['stacks-cleared'].textContent = String(this.stacksCleared);
    this.dom['btn-undo'].disabled = this.isAnimating || this.history.length === 0;
    this.dom['btn-shuffle'].disabled = this.isAnimating;
  }

  // Selecting is allowed mid-animation (only placing waits), so a tap during
  // a flip chain is never silently dropped.
  handleTrayTap(slotIdx) {
    if (!this.tray[slotIdx]) return;
    if (this.selectedTray === slotIdx) {
      this.selectedTray = null;
    } else {
      this.selectedTray = slotIdx;
      this.audio.playPick();
    }
    this.refreshSelection();
  }

  // Redraw just the tray and the board's drop hints, leaving any animating
  // stacks on the board untouched.
  refreshSelection() {
    this.renderTray();
    const hasSelectedTray = this.selectedTray !== null && this.tray[this.selectedTray] !== null;
    [...this.dom['hex-board'].children].forEach((cell, i) => {
      cell.classList.toggle('can-drop', hasSelectedTray && this.cells[i].length === 0);
    });
  }

  attachDragHandlers(slotEl, slotIdx) {
    slotEl.addEventListener('pointerdown', e => {
      if (!this.tray[slotIdx] || e.button !== 0) return;
      const startX = e.clientX;
      const startY = e.clientY;
      let dragging = false;
      let ghost = null;
      let hoveredCell = null;

      const onMove = moveEvt => {
        const dx = moveEvt.clientX - startX;
        const dy = moveEvt.clientY - startY;
        if (!dragging && Math.hypot(dx, dy) > 8) {
          dragging = true;
          this.selectedTray = slotIdx;
          this.audio.playPick();
          ghost = document.createElement('div');
          ghost.className = 'drag-ghost';
          this.renderStackElements(ghost, this.tray[slotIdx]);
          document.body.appendChild(ghost);
        }
        if (dragging && ghost) {
          ghost.style.left = `${moveEvt.clientX}px`;
          ghost.style.top = `${moveEvt.clientY}px`;
          const target = this.findEmptyCellAtPoint(moveEvt.clientX, moveEvt.clientY);
          if (hoveredCell !== target) {
            if (hoveredCell !== null) this.cellElement(hoveredCell)?.classList.remove('drag-over');
            hoveredCell = target;
            if (hoveredCell !== null) this.cellElement(hoveredCell)?.classList.add('drag-over');
          }
        }
      };

      const onUp = upEvt => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onUp);
        if (hoveredCell !== null) {
          this.cellElement(hoveredCell)?.classList.remove('drag-over');
        }
        if (ghost) ghost.remove();
        if (dragging) {
          this.lastDragEnd = performance.now();
          const dropCell = this.findEmptyCellAtPoint(upEvt.clientX, upEvt.clientY);
          if (dropCell !== null) {
            this.placeTrayStack(slotIdx, dropCell);
          } else {
            // A wobbly tap or a drop off the board keeps the stack picked up.
            this.refreshSelection();
          }
        }
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
    });
  }

  cleanupDrag() {
    document.querySelectorAll('.hex-cell.drag-over').forEach(el => el.classList.remove('drag-over'));
  }

  findEmptyCellAtPoint(clientX, clientY) {
    let bestIdx = null;
    let bestDist = Infinity;
    const children = this.dom['hex-board'].children;
    for (let i = 0; i < children.length; i++) {
      if (this.cells[i].length > 0) continue;
      const rect = children[i].getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dist = Math.hypot(clientX - cx, clientY - cy);
      if (dist <= rect.width * 0.55 && dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }
    return bestIdx;
  }

  cellElement(i) {
    return this.dom['hex-board'].children[i];
  }

  traySlotElement(i) {
    return this.dom['hex-tray'].children[i];
  }

  async handleCellTap(cellIdx) {
    const slotIdx = this.selectedTray;
    if (this.cells[cellIdx].length > 0 || slotIdx === null || !this.tray[slotIdx]) {
      const el = this.cellElement(cellIdx);
      el.classList.add('bonk');
      this.audio.playBonk();
      setTimeout(() => el.classList.remove('bonk'), 280);
      return;
    }

    await this.placeTrayStack(slotIdx, cellIdx);
  }

  async placeTrayStack(slotIdx, cellIdx) {
    if (!this.tray[slotIdx] || this.cells[cellIdx].length > 0) return;

    const stack = [...this.tray[slotIdx]];
    const slotEl = this.traySlotElement(slotIdx);
    const fromRect = slotEl ? slotEl.getBoundingClientRect() : null;

    this.history.push(this.snapshot());
    this.tray[slotIdx] = null;
    this.cells[cellIdx] = stack;
    this.selectedTray = null;

    if (this.isAnimating) {
      this.joinRunningChain(cellIdx, stack, fromRect);
      return;
    }

    this.isAnimating = true;
    this.render();
    this.audio.playDrop();

    if (fromRect) {
      const targetCell = this.cellElement(cellIdx);
      const stackTiles = [...targetCell.querySelector('.hex-stack').children];
      const flights = stackTiles.map((to, k) => ({
        from: fromRect,
        to,
        sourceEl: null,
        colorId: stack[k],
        flip: false
      }));
      if (!(await this.flyTiles(flights, 380, 35))) return;
      // Pause a beat after placing so the player sees the landed stack before flips start
      await this.sleep(220);
      if (this.boardVersion === 0) return;
    }

    await this.settle(cellIdx);
  }

  // Placed while a chain is still running: land it without re-rendering the
  // board (that would break the flights in progress) and hand the cell to
  // the running settle, which waits for this landing before its next step.
  joinRunningChain(cellIdx, stack, fromRect) {
    const cellEl = this.cellElement(cellIdx);
    const stackEl = cellEl.querySelector('.hex-stack');
    cellEl.classList.add('occupied');
    stackEl.replaceChildren();
    this.renderStackElements(stackEl, stack);
    this.refreshSelection();
    this.updateStats();
    this.audio.playDrop();
    this.pendingStarts.push(cellIdx);

    if (!fromRect) return;
    const flights = [...stackEl.children].map((to, k) => ({
      from: fromRect,
      to,
      sourceEl: null,
      colorId: stack[k],
      flip: false
    }));
    const landing = this.flyTiles(flights, 380, 35).then(() => this.sleep(220));
    this.landing = landing;
    landing.then(() => {
      if (this.landing === landing) this.landing = null;
    });
  }

  // Animate flying/flipping hex tiles from source rects onto target tile elements.
  // If `sourceEl` is provided, it stays visible on the source stack until its stagger delay starts!
  async flyTiles(flights, duration = 460, stagger = 95) {
    const version = this.boardVersion;
    const animations = flights.map(({ from, to, sourceEl, colorId, flip }, i) => {
      const target = to.getBoundingClientRect();
      const delay = i * stagger;
      to.style.visibility = 'hidden';

      return new Promise(resolve => {
        setTimeout(() => {
          if (version !== this.boardVersion) {
            resolve();
            return;
          }
          if (sourceEl) {
            sourceEl.style.visibility = 'hidden';
          }

          const clone = this.createHexTileElement(colorId, 0, null);
          clone.classList.add('flying');
          Object.assign(clone.style, {
            left: `${target.left}px`,
            top: `${target.top}px`,
            width: `${target.width}px`,
            height: `${target.height}px`
          });
          document.body.appendChild(clone);

          const dx = (from.left + from.width / 2) - (target.left + target.width / 2);
          const dy = (from.top + from.height / 2) - (target.top + target.height / 2);
          const keyframes = flip
            ? [
                { transform: `translate(${dx}px, ${dy}px) scale(1)` },
                { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 28}px) scale(1.08, 0.22)`, offset: 0.5 },
                { transform: 'translate(0, 0) scale(1)' }
              ]
            : [
                { transform: `translate(${dx}px, ${dy}px)` },
                { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 18}px)`, offset: 0.5 },
                { transform: 'translate(0, 0)' }
              ];

          const anim = clone.animate(keyframes, {
            duration,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
            fill: 'backwards'
          });

          anim.finished.then(() => {
            clone.remove();
            to.style.visibility = '';
            resolve();
          });
        }, delay);
      });
    });

    await Promise.all(animations);
    return version === this.boardVersion;
  }

  // Chain-reaction loop: pull matching top runs toward active cells, clear 10+ runs, and chain uncovered colours
  async settle(startCellIdx = null) {
    const version = this.boardVersion;
    const queue = startCellIdx !== null ? [startCellIdx] : [];
    let chainStep = 0;

    for (;;) {
      if (this.landing) await this.landing;
      if (version !== this.boardVersion) return;

      // A stack placed mid-chain gets the next turn, as if just placed.
      if (queue.length === 0 && this.pendingStarts.length) {
        queue.push(this.pendingStarts.shift());
      }

      if (queue.length === 0) {
        let foundPair = false;
        for (let idx = 0; idx < this.cells.length; idx++) {
          if (!this.cells[idx].length) continue;
          const col = this.topColor(idx);
          const matchingNb = this.neighbors[idx].find(
            nb => this.cells[nb].length > 0 && this.topColor(nb) === col
          );
          if (matchingNb !== undefined) {
            queue.push(idx);
            foundPair = true;
            break;
          }
        }
        if (!foundPair) {
          const clearIdx = this.cells.findIndex(
            s => s.length >= this.clearThreshold && this.topRun(s) >= this.clearThreshold
          );
          if (clearIdx >= 0) {
            queue.push(clearIdx);
          } else {
            break;
          }
        }
      }

      const curr = queue[0];
      const stack = this.cells[curr];
      if (!stack || stack.length === 0) {
        queue.shift();
        continue;
      }

      const currColor = this.topColor(curr);
      const matchingNeighbors = this.neighbors[curr].filter(
        nb => this.cells[nb].length > 0 && this.topColor(nb) === currColor
      );

      // Pull matching top runs from neighbours onto `curr`, peeling one tile at a time
      if (matchingNeighbors.length > 0) {
        const nb = matchingNeighbors[0];
        const nbStack = this.cells[nb];
        const runCount = this.topRun(nbStack);
        const nbCellEl = this.cellElement(nb);
        const sourceTileEls = [...nbCellEl.querySelector('.hex-stack').children].slice(-runCount).reverse();
        const fromRects = sourceTileEls.map(el => el.getBoundingClientRect());

        // Add the landing tiles to `curr`'s DOM stack (initially hidden) while keeping `nb`'s DOM tiles intact
        // so the player sees each tile peel off `nb` one by one as it flips across!
        const movedTiles = nbStack.splice(nbStack.length - runCount, runCount);
        stack.push(...movedTiles);

        const currStackEl = this.cellElement(curr).querySelector('.hex-stack');
        currStackEl.replaceChildren();
        this.renderStackElements(currStackEl, stack);
        const landedEls = [...currStackEl.children].slice(-runCount);

        this.audio.playFlip(runCount, chainStep);
        chainStep++;

        const flights = landedEls.map((to, k) => ({
          from: fromRects[k] || fromRects[0],
          to,
          sourceEl: sourceTileEls[k] || null,
          colorId: currColor,
          flip: true
        }));

        if (!(await this.flyTiles(flights, 460, 95))) return;

        // Re-render cleanly once all tiles in this run have landed, then pause a calm beat
        if (this.landing) await this.landing;
        if (version !== this.boardVersion) return;
        this.renderBoard();
        await this.sleep(240);
        if (version !== this.boardVersion) return;

        if (this.cells[nb].length > 0 && !queue.includes(nb)) {
          queue.push(nb);
        }
        continue;
      }

      // Check if `curr`'s top run reached 10+: pop tiles off one by one from the top!
      const topCount = this.topRun(stack);
      if (topCount >= this.clearThreshold) {
        // Pause a beat so the player clearly sees the completed 10+ stack before it starts popping off
        await this.sleep(240);
        if (version !== this.boardVersion) return;

        const cellEl = this.cellElement(curr);
        const currStackEl = cellEl.querySelector('.hex-stack');

        for (let k = 0; k < topCount; k++) {
          if (version !== this.boardVersion) return;
          const topEl = currStackEl.lastElementChild;
          if (topEl) {
            const tileRect = topEl.getBoundingClientRect();
            const popClone = this.createHexTileElement(currColor, 0, null);
            popClone.classList.add('flying', 'poofing');
            Object.assign(popClone.style, {
              left: `${tileRect.left}px`,
              top: `${tileRect.top}px`,
              width: `${tileRect.width}px`,
              height: `${tileRect.height}px`
            });
            document.body.appendChild(popClone);
            setTimeout(() => popClone.remove(), 250);
          }

          stack.pop();
          this.tilesCleared += 1;
          if (this.mode === 'endless') {
            this.endlessCleared += 1;
            localStorage.setItem('hexsort_endless_cleared', String(this.endlessCleared));
          }

          currStackEl.replaceChildren();
          if (stack.length > 0) {
            this.renderStackElements(currStackEl, stack);
          }
          this.updateStats();
          this.audio.playTilePop(k, topCount, chainStep);

          await this.sleep(68);
        }

        if (version !== this.boardVersion) return;

        const rect = cellEl.getBoundingClientRect();
        this.spawnPuffParticles(rect.left + rect.width / 2, rect.top + rect.height * 0.45);
        this.audio.playClear(chainStep);
        chainStep++;

        this.stacksCleared += 1;
        if (this.landing) await this.landing;
        if (version !== this.boardVersion) return;
        this.render();
        await this.sleep(240);
        if (version !== this.boardVersion) return;

        if (stack.length === 0) {
          queue.shift();
        }
        continue;
      }

      queue.shift();
    }

    if (this.tray.every(s => s === null)) {
      this.dealTrayStacks();
      this.audio.playDeal();
      this.render();
    }

    this.isAnimating = false;
    this.updateStats();

    if (this.mode === 'levels' && this.tilesCleared >= this.targetTiles) {
      setTimeout(() => {
        if (version !== this.boardVersion) return;
        this.dom['win-stats'].textContent = `${this.tilesCleared} tiles cleared · ${this.stacksCleared} stacks`;
        this.audio.playWin();
        this.dom['win-modal'].classList.remove('hidden');
      }, 280);
      this.isAnimating = true;
      return;
    }

    if (this.cells.every(s => s.length > 0)) {
      this.dom['jam-modal'].classList.remove('hidden');
    }
  }

  async shuffleTray(fromJam = false) {
    if (this.isAnimating && !fromJam) return;
    this.dom['jam-modal'].classList.add('hidden');
    this.history.push(this.snapshot());

    if (fromJam || this.cells.every(s => s.length > 0)) {
      const counts = Array(HEX_COLORS.length).fill(0);
      for (const stack of this.cells) {
        for (const colorId of stack) counts[colorId]++;
      }
      const chunks = [];
      for (let c = 0; c < HEX_COLORS.length; c++) {
        let left = counts[c];
        while (left > 0) {
          const take = Math.min(left, this.clearThreshold);
          chunks.push(Array(take).fill(c));
          left -= take;
        }
      }
      this.cells = Array.from({ length: this.coords.length }, () => []);
      chunks.forEach((chunk, idx) => {
        if (idx < this.cells.length) {
          this.cells[idx] = chunk;
        }
      });
    }

    this.dealTrayStacks();
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
      const angle = ((Math.PI * 2) / 8) * i + Math.random() * 0.4;
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

window.addEventListener('DOMContentLoaded', () => {
  window.hexSortGame = new HexSortGame();
});
