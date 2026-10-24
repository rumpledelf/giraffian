/**
 * Color Chutes - Main Game Engine
 * 
 * Features:
 * - 4-color sorting puzzle featuring the Giraffian logo red (#ad4242), blue, green, and yellow
 * - 15-puzzle sliding dynamics that start at peak bottleneck (1 empty cell) and open up
 *   into a breezy avalanche as tiles evacuate through matching perimeter chutes
 * - 100% guaranteed solvable levels constructed by reverse-insertion & scrambling
 * - Chute mouths narrow as levels rise, so fewer edge cells lead out
 * - Full Undo/Redo, Hint system, Procedural Web Audio API sound
 * - Responsive layout, touch/mouse drag + tap controls, and BrowserCheckpoint persistence
 */

const PALETTE = {
  red: {
    id: 'red',
    name: 'Red',
    hex: '#ad4242',
    border: '#7f2828',
    textHex: '#ffffff',
    edge: 'top',
    dir: 'up',
    arrow: '↑'
  },
  blue: {
    id: 'blue',
    name: 'Blue',
    hex: '#3a7ede',
    border: '#235aa8',
    textHex: '#ffffff',
    edge: 'bottom',
    dir: 'down',
    arrow: '↓'
  },
  green: {
    id: 'green',
    name: 'Green',
    hex: '#529c52',
    border: '#366d36',
    textHex: '#ffffff',
    edge: 'left',
    dir: 'left',
    arrow: '←'
  },
  yellow: {
    id: 'yellow',
    name: 'Yellow',
    hex: '#f7e752',
    border: '#bfae24',
    textHex: '#333333',
    edge: 'right',
    dir: 'right',
    arrow: '→'
  }
};
window.PALETTE = PALETTE;

class ColorChutesGame {
  constructor() {
    this.audio = new window.ColorChutesAudio();
    const urlParams = new URLSearchParams(window.location.search);
    this.gridSize = parseInt(urlParams.get('size') || gameStorage.getItem('colorchutes_grid_size') || '4', 10);
    this.level = parseInt(gameStorage.getItem('colorchutes_level') || '1', 10);

    this.grid = []; // gridSize x gridSize, holds tileId or null
    this.tiles = new Map(); // id -> { id, color, r, c, evacuated: boolean }
    this.undoStack = [];
    this.moveCount = 0;
    this.isAnimating = false;
    this.animWatchdog = null;
    this.boardVersion = 0;
    this.nextTileId = 1;
    this.initialState = null;
    this.exits = null; // color -> { start, width } cells along its home edge

    this.dom = {
      app: document.getElementById('game-app'),
      boardFrame: document.getElementById('board-frame'),
      boardGrid: document.getElementById('board-grid'),
      tilesRemaining: document.getElementById('tiles-remaining-count'),
      spacesOpen: document.getElementById('spaces-open-count'),
      movesCount: document.getElementById('moves-count'),
      levelBadge: document.getElementById('level-badge'),
      btnSound: document.getElementById('btn-sound'),
      soundOnIcon: document.getElementById('sound-icon-on'),
      soundOffIcon: document.getElementById('sound-icon-off'),
      btnSettings: document.getElementById('btn-settings'),
      settingsModal: document.getElementById('settings-modal'),
      sizeSelect: document.getElementById('size-select'),
      btnCloseSettings: document.getElementById('btn-close-settings'),
      btnApplySettings: document.getElementById('btn-apply-settings'),
      btnRestart: document.getElementById('btn-restart'),
      btnUndo: document.getElementById('btn-undo'),
      btnHint: document.getElementById('btn-hint'),
      btnNew: document.getElementById('btn-new'),
      winModal: document.getElementById('win-modal'),
      winStats: document.getElementById('win-stats'),
      btnNextLevel: document.getElementById('btn-next-level'),
      // Chute counter badges
      countTop: document.getElementById('chute-count-top'),
      countBottom: document.getElementById('chute-count-bottom'),
      countLeft: document.getElementById('chute-count-left'),
      countRight: document.getElementById('chute-count-right'),
    };

    this.init();
  }

  init() {
    this.updateSoundIcons();
    this.bindEvents();
    this.setupCheckpoint();
    if (!this.restoredFromCheckpoint) {
      this.newGame();
    }
  }

  setAnimating(val) {
    this.isAnimating = val;
    if (typeof clearTimeout !== 'undefined') clearTimeout(this.animWatchdog);
    if (val && typeof setTimeout !== 'undefined') {
      // Failsafe watchdog timer: auto-unlock if an animation ever exceeds 450ms
      this.animWatchdog = setTimeout(() => {
        this.isAnimating = false;
      }, 450);
    }
  }

  cancelAnimation() {
    this.boardVersion++;
    this.isAnimating = false;
    if (typeof clearTimeout !== 'undefined') clearTimeout(this.animWatchdog);
  }

  updateSoundIcons() {
    const muted = this.audio.isMuted();
    if (this.dom.soundOnIcon && this.dom.soundOffIcon) {
      this.dom.soundOnIcon.classList.toggle('hidden', muted);
      this.dom.soundOffIcon.classList.toggle('hidden', !muted);
    }
  }

  bindEvents() {
    this.dom.btnSound.addEventListener('click', () => {
      this.audio.toggleMute();
      this.updateSoundIcons();
    });

    this.dom.btnSettings.addEventListener('click', () => {
      this.dom.sizeSelect.value = String(this.gridSize);
      this.dom.settingsModal.classList.remove('hidden');
    });

    this.dom.btnCloseSettings.addEventListener('click', () => {
      this.dom.settingsModal.classList.add('hidden');
    });

    this.dom.btnApplySettings.addEventListener('click', () => {
      const newSize = parseInt(this.dom.sizeSelect.value, 10);
      gameStorage.setItem('colorchutes_grid_size', newSize);
      this.gridSize = newSize;
      this.dom.settingsModal.classList.add('hidden');
      this.newGame();
    });

    this.dom.btnRestart.addEventListener('click', () => this.restartGame());
    this.dom.btnUndo.addEventListener('click', () => this.undo());
    this.dom.btnHint.addEventListener('click', () => this.showHint());
    this.dom.btnNew.addEventListener('click', () => this.newGame());
    this.dom.btnNextLevel.addEventListener('click', () => this.nextLevel());

    // Keyboard controls
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
      if (this.isAnimating) return;
      if (e.key === 'u' || e.key === 'U') {
        this.undo();
      } else if (e.key === 'h' || e.key === 'H') {
        this.showHint();
      } else if (e.key === 'r' || e.key === 'R') {
        this.restartGame();
      } else if (e.key === 'n' || e.key === 'N') {
        this.newGame();
      } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 's', 'a', 'd'].includes(e.key)) {
        this.handleDirectionKey(e.key);
      }
    });

    // Touch and pointer interaction on grid
    this.setupPointerEvents();
  }

  setupPointerEvents() {
    // A press either taps (arrow step), flicks (one step), or drags the tile
    // cell by cell through empty space, out through its chute mouth if it reaches one.
    let drag = null;

    this.dom.boardGrid.addEventListener('pointerdown', (e) => {
      if (this.isAnimating || drag) return;
      const tileEl = e.target.closest('.chute-tile');
      if (!tileEl) return;
      const tile = this.tiles.get(parseInt(tileEl.dataset.id, 10));
      if (!tile || tile.evacuated) return;

      drag = { tile, startX: e.clientX, startY: e.clientY, moved: false, stepped: false };
      tileEl.classList.add('dragging');
      // Keep receiving moves when the finger leaves the tile or the board
      try { this.dom.boardGrid.setPointerCapture(e.pointerId); } catch (error) { /* Older browsers */ }
    });

    this.dom.boardGrid.addEventListener('pointermove', (e) => {
      if (!drag) return;
      if (Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) > 14) drag.moved = true;
      if (!drag.moved || drag.tile.evacuated) return;

      const rect = this.dom.boardGrid.getBoundingClientRect();
      const cell = rect.width / this.gridSize;
      const targetR = Math.floor((e.clientY - rect.top) / cell);
      const targetC = Math.floor((e.clientX - rect.left) / cell);
      if (this.dragTileToward(drag.tile, targetR, targetC, !drag.stepped)) drag.stepped = true;
    });

    const finishPointer = (e) => {
      if (!drag) return;
      const { tile, startX, startY, moved, stepped } = drag;
      drag = null;
      tile.el?.classList.remove('dragging');
      if (e.type !== 'pointerup' || tile.evacuated || this.isAnimating) return;

      if (!moved) {
        this.handleTileTap(tile);
      } else if (!stepped) {
        // Short flick that never reached another cell
        const dx = e.clientX - startX, dy = e.clientY - startY;
        const swipeDir = Math.abs(dx) > Math.abs(dy)
          ? (dx > 0 ? 'right' : 'left')
          : (dy > 0 ? 'down' : 'up');
        this.handleTileSwipe(tile, swipeDir);
      }
    };

    this.dom.boardGrid.addEventListener('pointerup', finishPointer);
    this.dom.boardGrid.addEventListener('pointercancel', finishPointer);
  }

  // Step a dragged tile through empty cells toward (targetR, targetC), which may lie
  // off the board when the pointer has left it. The whole drag is one undoable move.
  dragTileToward(tile, targetR, targetC, firstStep) {
    let stepped = false;
    for (let guard = 0; guard < this.gridSize * 2 && !tile.evacuated; guard++) {
      const diffR = targetR - tile.r, diffC = targetC - tile.c;
      if (diffR === 0 && diffC === 0) break;

      const steps = [];
      const rowStep = { dr: Math.sign(diffR), dc: 0 }, colStep = { dr: 0, dc: Math.sign(diffC) };
      if (Math.abs(diffR) >= Math.abs(diffC)) steps.push(rowStep, colStep);
      else steps.push(colStep, rowStep);

      const step = steps.find(({ dr, dc }) => {
        if (dr === 0 && dc === 0) return false;
        const r = tile.r + dr, c = tile.c + dc;
        if (this.isValidCell(r, c)) return this.grid[r][c] === null;
        return this.isAtHomeChute(tile) && this.dirOf(dr, dc) === PALETTE[tile.color].dir;
      });
      if (!step) break;

      if (firstStep && !stepped) {
        this.recordUndoState();
        this.moveCount++;
        this.dom.movesCount.textContent = this.moveCount;
      }
      stepped = true;

      const r = tile.r + step.dr, c = tile.c + step.dc;
      if (!this.isValidCell(r, c)) {
        // Dragged out through the chute mouth
        this.justSlid = true;
        this.evacuateTile(tile);
        this.justSlid = false;
        break;
      }
      this.dragStepTile(tile, r, c);
    }
    return stepped;
  }

  dirOf(dr, dc) {
    if (dr < 0) return 'up';
    if (dr > 0) return 'down';
    return dc < 0 ? 'left' : 'right';
  }

  dragStepTile(tile, r, c) {
    this.grid[tile.r][tile.c] = null;
    this.grid[r][c] = tile.id;
    tile.r = r;
    tile.c = c;
    if (tile.el) {
      const cellPercent = 100 / this.gridSize;
      tile.el.style.transition = 'top 0.08s ease-out, left 0.08s ease-out';
      tile.el.style.top = `${r * cellPercent}%`;
      tile.el.style.left = `${c * cellPercent}%`;
    }
    this.audio.playSlide();
  }

  handleDirectionKey(key) {
    if (this.isAnimating) return;
    let dir;
    if (key === 'ArrowUp' || key === 'w') dir = 'up';
    else if (key === 'ArrowDown' || key === 's') dir = 'down';
    else if (key === 'ArrowLeft' || key === 'a') dir = 'left';
    else if (key === 'ArrowRight' || key === 'd') dir = 'right';

    // Find the first empty space and see which adjacent tile can move into it
    for (let r = 0; r < this.gridSize; r++) {
      for (let c = 0; c < this.gridSize; c++) {
        if (this.grid[r][c] === null) {
          let tr = r, tc = c;
          if (dir === 'up') tr++;
          else if (dir === 'down') tr--;
          else if (dir === 'left') tc++;
          else if (dir === 'right') tc--;

          if (this.isValidCell(tr, tc) && this.grid[tr][tc] !== null) {
            const tile = this.tiles.get(this.grid[tr][tc]);
            if (tile && !tile.evacuated) {
              this.slideTileToEmpty(tile, r, c);
              return;
            }
          }
        }
      }
    }
  }

  isValidCell(r, c) {
    return r >= 0 && r < this.gridSize && c >= 0 && c < this.gridSize;
  }

  // Tapping a tile: ALWAYS attempts to move ONE move in the direction on its arrow!
  handleTileTap(tile) {
    if (this.isAnimating || tile.evacuated) return;

    // 1. If at matching home chute exit slot facing out, tap immediately evacuates!
    if (this.isAtHomeChute(tile)) {
      this.evacuateTile(tile);
      return;
    }

    // 2. Try to move ONE step in the direction on its arrow
    const pal = PALETTE[tile.color];
    let dr = 0, dc = 0;
    if (pal.dir === 'up') dr = -1;
    else if (pal.dir === 'down') dr = 1;
    else if (pal.dir === 'left') dc = -1;
    else if (pal.dir === 'right') dc = 1;

    const targetR = tile.r + dr;
    const targetC = tile.c + dc;

    if (this.isValidCell(targetR, targetC) && this.grid[targetR][targetC] === null) {
      this.slideTileToEmpty(tile, targetR, targetC);
      return;
    }

    // 3. Blocked! Audio cue and directional nudge in arrow direction
    this.audio.playBlocked();
    this.nudgeTileBlocked(tile, pal.dir);
  }

  // Flick that didn't reach another cell: one step in the flick direction (if empty)
  handleTileSwipe(tile, swipeDir) {
    if (this.isAnimating || tile.evacuated) return;

    const pal = PALETTE[tile.color];

    // Swiping outward into home chute exit slot
    if (pal && pal.dir === swipeDir && this.isAtHomeChute(tile)) {
      this.evacuateTile(tile);
      return;
    }

    let tr = tile.r, tc = tile.c;
    if (swipeDir === 'up') tr--;
    else if (swipeDir === 'down') tr++;
    else if (swipeDir === 'left') tc--;
    else if (swipeDir === 'right') tc++;

    if (this.isValidCell(tr, tc) && this.grid[tr][tc] === null) {
      this.slideTileToEmpty(tile, tr, tc);
    } else {
      this.audio.playBlocked();
      this.nudgeTileBlocked(tile, swipeDir);
    }
  }

  isAtHomeChute(tile) {
    return this.getExitCells(tile.color).some(cell => cell.r === tile.r && cell.c === tile.c);
  }

  // Mouth width narrows as levels rise: full sides at first, down to two cells.
  exitWidthForLevel(size, level) {
    return Math.max(Math.min(2, size), Math.min(size, size - Math.floor((level - 1) / 2)));
  }

  createExits() {
    const size = this.gridSize;
    const width = this.exitWidthForLevel(size, this.level);
    const exits = {};
    for (const color of Object.keys(PALETTE)) {
      exits[color] = { start: Math.floor(Math.random() * (size - width + 1)), width };
    }
    return exits;
  }

  // Board cells along a color's home edge that open into its chute
  getExitCells(color) {
    const pal = PALETTE[color];
    if (!pal) return [];
    const size = this.gridSize;
    const exit = this.exits?.[color] || { start: 0, width: size };
    const cells = [];
    for (let i = exit.start; i < exit.start + exit.width; i++) {
      if (pal.edge === 'top') cells.push({ r: 0, c: i });
      else if (pal.edge === 'bottom') cells.push({ r: size - 1, c: i });
      else if (pal.edge === 'left') cells.push({ r: i, c: 0 });
      else if (pal.edge === 'right') cells.push({ r: i, c: size - 1 });
    }
    return cells;
  }

  slideTileToEmpty(tile, targetR, targetC, onComplete) {
    this.setAnimating(true);
    this.boardVersion = (this.boardVersion || 0) + 1;
    const version = this.boardVersion;

    this.recordUndoState();
    this.moveCount++;
    if (this.dom.movesCount) this.dom.movesCount.textContent = this.moveCount;

    const fromR = tile.r, fromC = tile.c;
    this.grid[fromR][fromC] = null;
    this.grid[targetR][targetC] = tile.id;
    tile.r = targetR;
    tile.c = targetC;

    this.audio.playSlide();
    this.animateTileSlide(tile, fromR, fromC, targetR, targetC, () => {
      if (this.boardVersion !== version) return;

      // Auto-evacuate if this step reaches the tile's home chute gate
      if (this.isAtHomeChute(tile)) {
        this.justSlid = true;
        this.evacuateTile(tile, () => {
          this.setAnimating(false);
          if (onComplete) onComplete();
        });
        this.justSlid = false;
      } else {
        this.setAnimating(false);
        if (onComplete) onComplete();
      }
    });
  }

  animateTileSlide(tile, fromR, fromC, toR, toC, onDone) {
    const el = tile.el;
    if (!el) {
      if (onDone) onDone();
      return;
    }

    const cellPercent = 100 / this.gridSize;
    el.style.transition = 'top 0.16s cubic-bezier(0.2, 0.9, 0.3, 1), left 0.16s cubic-bezier(0.2, 0.9, 0.3, 1)';
    el.style.top = `${toR * cellPercent}%`;
    el.style.left = `${toC * cellPercent}%`;

    setTimeout(() => {
      if (onDone) onDone();
    }, 170);
  }

  nudgeTileBlocked(tile, dir) {
    const el = tile.el;
    if (!el) return;
    const cls = `blocked-nudge-${dir || 'up'}`;
    el.classList.add(cls);
    setTimeout(() => el.classList.remove(cls), 220);
  }

  evacuateTile(tile, onComplete) {
    if (tile.evacuated) {
      if (onComplete) onComplete();
      return;
    }
    this.setAnimating(true);
    this.boardVersion = (this.boardVersion || 0) + 1;
    const version = this.boardVersion;

    if (!this.justSlid) {
      this.recordUndoState();
      this.moveCount++;
      if (this.dom.movesCount) this.dom.movesCount.textContent = this.moveCount;
    }

    tile.evacuated = true;
    this.grid[tile.r][tile.c] = null; // Open up new empty cell

    const combo = this.tiles.size - this.getActiveTiles().length;
    this.audio.playChuteExit(combo);

    const el = tile.el;
    const pal = PALETTE[tile.color];

    if (!el) {
      this.updateChuteTrays();
      this.updateStats();
      this.setAnimating(false);
      if (onComplete) onComplete();
      if (this.getActiveTiles().length === 0) {
        this.handleWin();
      }
      return;
    }

    let deltaX = 0, deltaY = 0;
    if (pal.dir === 'up') deltaY = -120;
    else if (pal.dir === 'down') deltaY = 120;
    else if (pal.dir === 'left') deltaX = -120;
    else if (pal.dir === 'right') deltaX = 120;

    el.classList.add('evacuating');
    el.style.zIndex = '50';

    requestAnimationFrame(() => {
      if (this.boardVersion !== version) return;
      el.style.transition = 'transform 0.34s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease-in, filter 0.32s ease-out';
      el.style.transform = `translate(${deltaX}%, ${deltaY}%) scale(0.92)`;
      el.style.filter = 'brightness(1.25) drop-shadow(0 6px 16px rgba(0,0,0,0.3))';

      setTimeout(() => {
        if (this.boardVersion !== version) return;
        el.remove();
        tile.el = null;

        this.updateChuteTrays();
        this.updateStats();
        this.setAnimating(false);

        if (onComplete) onComplete();

        if (this.getActiveTiles().length === 0) {
          this.handleWin();
        }
      }, 340);
    });
  }

  getActiveTiles() {
    return Array.from(this.tiles.values()).filter(t => !t.evacuated);
  }

  updateChuteTrays() {
    const evacuatedCounts = { red: 0, blue: 0, green: 0, yellow: 0 };
    for (const t of this.tiles.values()) {
      if (t.evacuated && evacuatedCounts[t.color] !== undefined) {
        evacuatedCounts[t.color]++;
      }
    }

    if (this.dom.countTop) this.dom.countTop.textContent = evacuatedCounts.red;
    if (this.dom.countBottom) this.dom.countBottom.textContent = evacuatedCounts.blue;
    if (this.dom.countLeft) this.dom.countLeft.textContent = evacuatedCounts.green;
    if (this.dom.countRight) this.dom.countRight.textContent = evacuatedCounts.yellow;
  }

  updateStats() {
    const remaining = this.getActiveTiles().length;
    const openSpaces = (this.gridSize * this.gridSize) - remaining;
    this.dom.tilesRemaining.textContent = remaining;
    this.dom.spacesOpen.textContent = openSpaces;
    this.dom.movesCount.textContent = this.moveCount;
  }

  /**
   * Guaranteed Solvable Board Generation
   * Play the game backwards from an empty board: each tile enters through its own
   * chute mouth, and every other change is a legal slide. Reversed, that is a
   * solution, so the dealt board can always be cleared.
   */
  generateSolvableBoard() {
    const size = this.gridSize;
    const totalCells = size * size;
    const totalTiles = totalCells - 1; // Exactly 1 empty space at start

    // Distribute colors across tiles
    const colorKeys = ['red', 'blue', 'green', 'yellow'];
    // For smaller boards or levels, we can vary palette count
    const activeColors = this.level === 1 ? ['red', 'blue', 'green'] : colorKeys;

    const colorList = [];
    for (let i = 0; i < totalTiles; i++) {
      colorList.push(activeColors[i % activeColors.length]);
    }

    // Shuffle color order
    for (let i = colorList.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [colorList[i], colorList[j]] = [colorList[j], colorList[i]];
    }

    // Initialize blank grid
    this.grid = Array.from({ length: size }, () => Array(size).fill(null));
    this.tiles = new Map();
    this.nextTileId = 1;
    this.exits = this.createExits();

    // Reverse Insertion: each tile enters through one of its chute mouth cells
    for (let i = 0; i < totalTiles; i++) {
      const color = colorList[i];
      const id = this.nextTileId++;
      const mouth = this.getExitCells(color);

      let entrySlots = mouth.filter(cell => this.grid[cell.r][cell.c] === null);
      if (entrySlots.length === 0) {
        // Mouth jammed: slide tiles along a path to pull an empty cell into it
        this.pullEmptyInto(mouth[Math.floor(Math.random() * mouth.length)]);
        entrySlots = mouth.filter(cell => this.grid[cell.r][cell.c] === null);
      }
      const spawnPos = entrySlots[Math.floor(Math.random() * entrySlots.length)];

      this.grid[spawnPos.r][spawnPos.c] = id;
      const tile = { id, color, r: spawnPos.r, c: spawnPos.c, evacuated: false, el: null };
      this.tiles.set(id, tile);

      // Scramble existing tiles a few steps
      this.scrambleStep(5);
    }

    // Extensive final scramble to thoroughly shuffle tiles while preserving solvability
    const scrambleCount = Math.min(220, 50 + this.level * 15);
    this.scrambleStep(scrambleCount);

    // Save initial snapshot for restart
    this.initialState = this.captureState();
  }

  // Shortest path from target to the nearest empty cell, then slide each tile
  // on it one step toward that empty cell. Every step is a legal reversible slide.
  pullEmptyInto(target) {
    const size = this.gridSize;
    const key = (r, c) => r * size + c;
    const prev = new Map([[key(target.r, target.c), null]]);
    const queue = [target];
    let found = null;
    while (queue.length && !found) {
      const cur = queue.shift();
      for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const r = cur.r + dr, c = cur.c + dc;
        if (!this.isValidCell(r, c) || prev.has(key(r, c))) continue;
        prev.set(key(r, c), cur);
        if (this.grid[r][c] === null) { found = { r, c }; break; }
        queue.push({ r, c });
      }
    }
    if (!found) return;

    let empty = found;
    let from = prev.get(key(found.r, found.c));
    while (from) {
      const tile = this.tiles.get(this.grid[from.r][from.c]);
      this.grid[empty.r][empty.c] = tile.id;
      this.grid[from.r][from.c] = null;
      tile.r = empty.r;
      tile.c = empty.c;
      empty = from;
      from = prev.get(key(from.r, from.c));
    }
  }

  scrambleStep(steps) {
    const size = this.gridSize;
    for (let s = 0; s < steps; s++) {
      // Pick a random empty cell
      const empties = [];
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (this.grid[r][c] === null) empties.push({ r, c });
        }
      }
      if (empties.length === 0) break;
      const emptyPos = empties[Math.floor(Math.random() * empties.length)];

      // Pick random valid adjacent neighbor to slide into the empty cell
      const neighbors = [
        { r: emptyPos.r - 1, c: emptyPos.c },
        { r: emptyPos.r + 1, c: emptyPos.c },
        { r: emptyPos.r, c: emptyPos.c - 1 },
        { r: emptyPos.r, c: emptyPos.c + 1 }
      ].filter(n => this.isValidCell(n.r, n.c) && this.grid[n.r][n.c] !== null);

      if (neighbors.length === 0) continue;
      const pick = neighbors[Math.floor(Math.random() * neighbors.length)];
      const tileId = this.grid[pick.r][pick.c];
      const tile = this.tiles.get(tileId);

      this.grid[emptyPos.r][emptyPos.c] = tileId;
      this.grid[pick.r][pick.c] = null;
      tile.r = emptyPos.r;
      tile.c = emptyPos.c;
    }
  }

  renderBoard() {
    this.dom.boardGrid.innerHTML = '';
    const size = this.gridSize;
    const cellPercent = 100 / size;

    // Create background grid slots
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const slot = document.createElement('div');
        slot.className = 'grid-slot';
        slot.style.width = `${cellPercent}%`;
        slot.style.height = `${cellPercent}%`;
        slot.style.top = `${r * cellPercent}%`;
        slot.style.left = `${c * cellPercent}%`;
        this.dom.boardGrid.appendChild(slot);
      }
    }

    // Create tile DOM elements
    for (const tile of this.tiles.values()) {
      if (tile.evacuated) continue;
      const el = document.createElement('div');
      el.className = `chute-tile tile-${tile.color}`;
      el.dataset.id = tile.id;
      el.style.width = `calc(${cellPercent}% - 8px)`;
      el.style.height = `calc(${cellPercent}% - 8px)`;
      el.style.top = `${tile.r * cellPercent}%`;
      el.style.left = `${tile.c * cellPercent}%`;
      el.style.backgroundColor = PALETTE[tile.color].hex;
      el.style.borderColor = PALETTE[tile.color].border;
      el.style.color = PALETTE[tile.color].textHex;

      // Inner chevron pointing toward home chute
      const chevron = document.createElement('span');
      chevron.className = 'tile-chevron';
      chevron.textContent = PALETTE[tile.color].arrow;
      el.appendChild(chevron);

      this.dom.boardGrid.appendChild(el);
      tile.el = el;
    }

    this.updateChuteTrays();
    this.updateChuteIndicators();
    this.updateStats();
    this.dom.levelBadge.textContent = `Level ${this.level}: ${size}×${size}`;
  }

  updateChuteIndicators() {
    if (typeof document === 'undefined' || typeof document.querySelector !== 'function') return;
    const size = this.gridSize;
    for (const color of Object.keys(PALETTE)) {
      const pal = PALETTE[color];
      const mouth = document.querySelector(`.chute-${pal.edge} .chute-mouth`);
      if (!mouth) continue;
      const exit = this.exits?.[color] || { start: 0, width: size };
      const horizontal = pal.edge === 'top' || pal.edge === 'bottom';
      mouth.style.setProperty('--mouth-start', `${(exit.start / size) * 100}%`);
      mouth.style.setProperty('--mouth-size', `${(exit.width / size) * 100}%`);
      const arrows = mouth.querySelector('.chute-arrows');
      if (arrows) {
        const arrow = { up: '▲', down: '▼', left: '◀', right: '▶' }[pal.dir];
        arrows.innerHTML = Array(Math.min(exit.width, 3)).fill(arrow).join(horizontal ? ' ' : '<br>');
      }
    }
  }

  newGame() {
    this.cancelAnimation();
    this.undoStack = [];
    this.moveCount = 0;
    this.generateSolvableBoard();
    this.renderBoard();
  }

  restartGame() {
    this.cancelAnimation();
    if (this.initialState) {
      this.restoreState(this.initialState);
    }
    this.undoStack = [];
    this.moveCount = 0;
    if (this.dom.movesCount) this.dom.movesCount.textContent = '0';
    this.renderBoard();
  }

  recordUndoState() {
    this.undoStack.push(this.captureState());
    if (this.undoStack.length > 50) this.undoStack.shift();
  }

  undo() {
    if (this.isAnimating || this.undoStack.length === 0) return;
    const prev = this.undoStack.pop();
    this.restoreState(prev);
    this.audio.playUndo();
    this.renderBoard();
  }

  showHint() {
    if (this.isAnimating) return;

    // 1. First priority: any tile currently at its home chute ready to evacuate!
    for (const tile of this.tiles.values()) {
      if (!tile.evacuated && this.isAtHomeChute(tile)) {
        this.flashTileHint(tile);
        return;
      }
    }

    // 2. Second priority: any tile 1 move away from home chute
    for (const tile of this.tiles.values()) {
      if (tile.evacuated) continue;
      const pal = PALETTE[tile.color];
      // Check if moving in pal.dir brings it to home chute
      let tr = tile.r, tc = tile.c;
      if (pal.dir === 'up') tr--;
      else if (pal.dir === 'down') tr++;
      else if (pal.dir === 'left') tc--;
      else if (pal.dir === 'right') tc++;

      if (this.isValidCell(tr, tc) && this.grid[tr][tc] === null) {
        this.flashTileHint(tile);
        return;
      }
    }

    // 3. Any movable tile
    for (const tile of this.tiles.values()) {
      if (tile.evacuated) continue;
      const neighbors = [
        { r: tile.r - 1, c: tile.c },
        { r: tile.r + 1, c: tile.c },
        { r: tile.r, c: tile.c - 1 },
        { r: tile.r, c: tile.c + 1 },
      ];
      if (neighbors.some(n => this.isValidCell(n.r, n.c) && this.grid[n.r][n.c] === null)) {
        this.flashTileHint(tile);
        return;
      }
    }
  }

  flashTileHint(tile) {
    if (!tile.el) return;
    tile.el.classList.add('hint-pulse');
    setTimeout(() => tile.el?.classList.remove('hint-pulse'), 1400);
  }

  handleWin() {
    this.audio.playWin();
    this.dom.winStats.innerHTML = `
      <div>Moves: <strong>${this.moveCount}</strong></div>
      <div>Grid Size: <strong>${this.gridSize}×${this.gridSize}</strong></div>
      <div>Level: <strong>${this.level}</strong></div>
    `;
    this.dom.winModal.classList.remove('hidden');
  }

  nextLevel() {
    this.dom.winModal.classList.add('hidden');
    this.level++;
    gameStorage.setItem('colorchutes_level', this.level);

    // Difficulty growth: expand grid size every 3 levels if setting checked
    const growEnabled = gameStorage.getItem('colorchutes_grow') !== 'false';
    if (growEnabled && this.level % 3 === 1 && this.gridSize < 6) {
      this.gridSize++;
      gameStorage.setItem('colorchutes_grid_size', this.gridSize);
    }

    this.newGame();
  }

  captureState() {
    return {
      gridSize: this.gridSize,
      level: this.level,
      moveCount: this.moveCount,
      grid: this.grid.map(row => [...row]),
      exits: this.exits,
      tiles: Array.from(this.tiles.values()).map(t => ({
        id: t.id,
        color: t.color,
        r: t.r,
        c: t.c,
        evacuated: t.evacuated
      }))
    };
  }

  restoreState(state) {
    this.gridSize = state.gridSize;
    this.level = state.level;
    this.moveCount = state.moveCount;
    this.grid = state.grid.map(row => [...row]);
    this.exits = state.exits || null; // Older saves had full-width chutes
    this.tiles = new Map();
    for (const t of state.tiles) {
      this.tiles.set(t.id, { ...t, el: null });
    }
  }

  setupCheckpoint() {
    this.checkpoint = new BrowserCheckpoint(this, {
      id: 'colorchutes',
      levelKey: 'colorchutes_level',
      fields: 'gridSize level moveCount',
      actions: 'slideTileToEmpty dragStepTile evacuateTile undo restartGame nextLevel',
      capture: (game, state) => {
        state.board = game.captureState();
        state.initialState = game.initialState;
        state.undoStack = game.undoStack.map(s => JSON.stringify(s));
      }
    });
  }
}

window.ColorChutesGame = ColorChutesGame;

/**
 * Standard Giraffian Checkpoint Persistence
 */
class BrowserCheckpoint {
  constructor(game, options) {
    this.game = game;
    this.options = options;
    this.key = 'giraffian_' + options.id + '_save_v1';
    this.pending = 0;
    this.restoring = false;

    try {
      const raw = localStorage.getItem(this.key);
      if (raw) {
        if (raw.length > 4000000) throw new Error('Checkpoint too large');
        const saved = JSON.parse(raw);
        if (saved.version === 1 && saved.state && saved.state.board) {
          game.restoreState(saved.state.board);
          game.initialState = saved.state.initialState || saved.state.board;
          if (Array.isArray(saved.state.undoStack)) {
            game.undoStack = saved.state.undoStack.map(s => JSON.parse(s));
          }
          game.restoredFromCheckpoint = true;
          game.renderBoard();
        }
      }
    } catch (e) {
      // Clean fallback if save corrupted
    }

    for (const name of options.actions.split(' ')) {
      if (typeof game[name] !== 'function') continue;
      const original = game[name].bind(game);
      game[name] = (...args) => {
        this.save();
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

    const grow = document.getElementById('grow-difficulty');
    if (grow) {
      grow.checked = gameStorage.getItem(options.id + '_grow') !== 'false';
      document.getElementById('btn-settings').addEventListener('click', () => {
        grow.checked = gameStorage.getItem(options.id + '_grow') !== 'false';
      });
      document.getElementById('btn-apply-settings').addEventListener('click', () => {
        try { localStorage.setItem(options.id + '_grow', String(grow.checked)); }
        catch (error) { this.status('Browser saving is unavailable.'); }
      }, true);
    }

    const resetBtn = document.getElementById('btn-reset-progress');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (!confirm('Reset this game to level 1 and discard its saved board? Your other games are kept.')) return;
        this.suspended = true;
        try {
          localStorage.removeItem(this.key);
          localStorage.setItem(options.levelKey, '1');
        } catch (error) { return; }
        location.reload();
      });
    }

    document.addEventListener('visibilitychange', () => { if (document.hidden) this.save(); });
    window.addEventListener('pagehide', () => this.save());
    setInterval(() => this.save(), 1000);
    this.save();
  }

  encode() {
    const state = {};
    for (const field of this.options.fields.split(' ')) state[field] = this.game[field];
    if (this.options.capture) this.options.capture(this.game, state);
    return JSON.stringify({ version: 1, state });
  }

  save() {
    if (this.suspended) return;
    try {
      localStorage.setItem(this.key, this.encode());
    } catch (e) {}
  }

  status(msg) {
    const el = document.getElementById('save-status');
    if (el) el.textContent = msg;
  }
}

// Bootstrap
window.addEventListener('DOMContentLoaded', () => {
  window.game = new ColorChutesGame();
});
