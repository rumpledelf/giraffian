/**
 * Pixel Ants - Scurrying Bug Layer Dismantler
 * Pure Vanilla ES6 JavaScript with HTML5 Canvas Renderer
 */

class AntsGame {
  constructor() {
    this.level = Math.max(1, Number(gameStorage.getItem('ants_level')) || 1);
    this.models = this.initModels();
    this.selectedSize = parseInt(gameStorage.getItem('ants_size') || '12', 10);
    this.difficulty = gameStorage.getItem('ants_difficulty') === 'easy' ? 'easy' : 'challenging';
    this.currentModelId = null;
    this.speedMode = gameStorage.getItem('ants_speed') || 'normal'; // 'slow', 'normal', 'fast'

    this.gridSize = 12;
    this.cellSize = 20;
    this.grid = []; // 2D array of color keys or null
    this.shuttleQueues = [[], [], [], [], []]; // 5 queue lanes
    this.stagingBays = [null, null, null, null, null, null]; // 6 staging slots
    this.activeBugs = []; // Array of active scurrying bug critters
    this.reservedPixels = new Set(); // Set of "r,c" coordinates currently claimed by en-route bugs
    this.lastBayDispatchTime = [0, 0, 0, 0, 0, 0];
    this.nextBugId = 1;
    this.isPaused = false;
    this.undoStack = [];
    this.snatchStreak = 0;
    this.depositStreak = 0;
    this.isComplete = false;

    this.dom = {
      levelBadge: document.getElementById('level-badge'),
      itemsLeft: document.getElementById('items-left-count'),
      stagingBaysGrid: document.getElementById('staging-bays-grid'),
      queuesLanesGrid: document.getElementById('queues-lanes-grid'),
      pixelCanvas: document.getElementById('pixel-canvas'),
      bugCanvas: document.getElementById('bug-canvas'),
      antStage: document.getElementById('ant-stage'),
      orbitRail: document.querySelector('.orbit-rail'),
      boardWrap: document.getElementById('board-and-staging-wrap'),
      btnPause: document.getElementById('btn-pause'),
      iconPause: document.getElementById('icon-pause'),
      iconPlay: document.getElementById('icon-play'),
      btnRestart: document.getElementById('btn-restart'),
      btnUndo: document.getElementById('btn-undo'),
      btnSound: document.getElementById('btn-sound'),
      soundIconOn: document.getElementById('sound-icon-on'),
      soundIconOff: document.getElementById('sound-icon-off'),
      btnSpeed: document.getElementById('btn-speed'),
      btnNew: document.getElementById('btn-new'),
      btnSettings: document.getElementById('btn-settings'),
      winModal: document.getElementById('win-modal'),
      btnNextLevel: document.getElementById('btn-next-level'),
      jamModal: document.getElementById('jam-modal'),
      btnJamUndo: document.getElementById('btn-jam-undo'),
      btnJamRestart: document.getElementById('btn-jam-restart'),
      btnJamRescue: document.getElementById('btn-jam-rescue'),
      settingsModal: document.getElementById('settings-modal'),
      sizeSelect: document.getElementById('size-select'),
      difficultySelect: document.getElementById('difficulty-select'),
      speedSelect: document.getElementById('speed-select'),
      btnCloseSettings: document.getElementById('btn-close-settings'),
      btnApplySettings: document.getElementById('btn-apply-settings'),
    };

    if (this.dom.pixelCanvas) {
      this.ctx = this.dom.pixelCanvas.getContext('2d');
    }
    if (this.dom.bugCanvas) {
      this.bugCtx = this.dom.bugCanvas.getContext('2d');
    }

    this.palette = {
      R: { name: 'Red', hex: '#ec8d6f', border: '#c96a4d' },
      G: { name: 'Green', hex: '#589a56', border: '#467c45' },
      B: { name: 'Blue', hex: '#3a7ede', border: '#2d63ad' },
      Y: { name: 'Yellow', hex: '#f7e55f', border: '#cfbe40' },
      P: { name: 'Purple', hex: '#dcb0ed', border: '#b482c8' },
      D: { name: 'Ink', hex: '#2b2d42', border: '#1c1e2d' },
      W: { name: 'Cream', hex: '#fffdf5', border: '#bec6ce' },
      O: { name: 'Orange', hex: '#efad48', border: '#ba7e27' },
      C: { name: 'Teal', hex: '#39a7a0', border: '#267c77' },
      N: { name: 'Rose', hex: '#db5f96', border: '#ac3f70' },
      V: { name: 'Violet', hex: '#8354ac', border: '#613b83' }
    };

    this.initEvents();
    this.updateSoundIcons();
    this.updateSpeedButton();
    this.loadRandomPictureForSize(this.selectedSize);
    this.startAnimationLoop();
  }

  /* --- 1. Pixel Art Models (from pictures.js) --- */
  initModels() {
    if (!window.pixelPictures) return [];
    return window.pixelPictures.map(model => ({
      ...model,
      colorCount: new Set(model.data.join('').replaceAll('.', '')).size
    }));
  }

  /* --- 2. Event Listeners --- */
  initEvents() {
    this.dom.btnPause.addEventListener('click', () => this.togglePause());
    this.dom.btnRestart.addEventListener('click', () => this.restartLevel());
    this.dom.btnUndo.addEventListener('click', () => this.undoMove());
    this.dom.btnJamRescue.addEventListener('click', () => this.swapParkedNest());
    this.dom.btnSpeed.addEventListener('click', () => this.cycleSpeed());
    this.dom.btnNew.addEventListener('click', () => {
      this.loadRandomPictureForSize(this.selectedSize, true);
    });

    this.dom.btnSound.addEventListener('click', () => {
      window.antsAudio.toggleMute();
      this.updateSoundIcons();
    });

    this.dom.btnNextLevel.addEventListener('click', () => {
      this.dom.winModal.classList.add('hidden');
      this.level++;
      gameStorage.setItem('ants_level', String(this.level));
      this.loadRandomPictureForSize(this.selectedSize);
    });

    this.dom.btnSettings.addEventListener('click', () => {
      this.populateSettings();
      this.dom.settingsModal.classList.remove('hidden');
    });

    this.dom.btnCloseSettings.addEventListener('click', () => {
      this.dom.settingsModal.classList.add('hidden');
    });

    this.dom.btnApplySettings.addEventListener('click', () => {
      this.selectedSize = parseInt(this.dom.sizeSelect.value, 10);
      this.difficulty = this.dom.difficultySelect.value;
      this.speedMode = this.dom.speedSelect.value;
      gameStorage.setItem('ants_size', this.selectedSize);
      gameStorage.setItem('ants_difficulty', this.difficulty);
      gameStorage.setItem('ants_speed', this.speedMode);
      this.updateSpeedButton();
      this.dom.settingsModal.classList.add('hidden');
      this.loadRandomPictureForSize(this.selectedSize);
    });

    if (this.dom.btnJamUndo) {
      this.dom.btnJamUndo.addEventListener('click', () => {
        if (this.dom.jamModal) this.dom.jamModal.classList.add('hidden');
        this.undoMove();
      });
    }

    if (this.dom.btnJamRestart) {
      this.dom.btnJamRestart.addEventListener('click', () => {
        if (this.dom.jamModal) this.dom.jamModal.classList.add('hidden');
        this.restartLevel();
      });
    }

    window.addEventListener('resize', () => this.updateOverlayCanvasSize());
    if (window.ResizeObserver && this.dom.boardWrap) {
      this.resizeObserver = new ResizeObserver(() => this.updateOverlayCanvasSize());
      this.resizeObserver.observe(this.dom.boardWrap);
      if (this.dom.pixelCanvas) {
        this.resizeObserver.observe(this.dom.pixelCanvas);
      }
    }
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    if (this.isPaused) {
      this.dom.iconPause.classList.add('hidden');
      this.dom.iconPlay.classList.remove('hidden');
      this.dom.btnPause.setAttribute('aria-label', 'Resume');
    } else {
      this.dom.iconPause.classList.remove('hidden');
      this.dom.iconPlay.classList.add('hidden');
      this.dom.btnPause.setAttribute('aria-label', 'Pause');
    }
  }

  cycleSpeed() {
    const modes = ['slow', 'normal', 'fast'];
    const nextIdx = (modes.indexOf(this.speedMode) + 1) % modes.length;
    this.speedMode = modes[nextIdx];
    gameStorage.setItem('ants_speed', this.speedMode);
    this.updateSpeedButton();
  }

  updateSpeedButton() {
    const labels = {
      slow: '⚡ Slow',
      normal: '⚡ Normal',
      fast: '⚡ Fast'
    };
    this.dom.btnSpeed.textContent = labels[this.speedMode] || '⚡ Speed';
  }

  updateSoundIcons() {
    const isMuted = window.antsAudio.isMuted();
    if (isMuted) {
      this.dom.soundIconOn.classList.add('hidden');
      this.dom.soundIconOff.classList.remove('hidden');
    } else {
      this.dom.soundIconOn.classList.remove('hidden');
      this.dom.soundIconOff.classList.add('hidden');
    }
  }

  populateSettings() {
    this.dom.difficultySelect.value = this.difficulty;
    if (this.dom.sizeSelect) {
      this.dom.sizeSelect.value = gameStorage.getItem('ants_size') || '12';
    }
    if (this.dom.speedSelect) {
      this.dom.speedSelect.value = this.speedMode;
    }
  }

  /* --- 3. Level Setup & Queue Generation --- */
  loadRandomPictureForSize(size, advanceCurrent = false) {
    const sizes = [12, 20, 28, 48, 100];
    const baseline = Number(gameStorage.getItem('ants_size')) || 12;
    const growth = gameStorage.getItem('ants_grow') === 'false' ? 0 : Math.floor((this.level - 1) / 3);
    this.selectedSize = sizes[Math.min(sizes.length - 1, Math.max(0, sizes.indexOf(baseline)) + growth)];

    let forSize = this.models.filter(m => m.size === this.selectedSize);
    if (forSize.length === 0) forSize = this.models;

    // Keep the actual board choices aligned with the ranges shown in Settings.
    let candidates = forSize.filter(m =>
      this.difficulty === 'easy'
        ? m.colorCount >= 3 && m.colorCount <= 5
        : m.colorCount >= 8 && m.colorCount <= 10
    );
    if (candidates.length === 0) candidates = forSize;

    // Deterministic non-repeating cycle based on level so puzzles cycle smoothly without early repetition
    const idx = (this.level - 1) % candidates.length;
    let pick = candidates[idx] || candidates[0];

    // "New Picture" walks through the full candidate set instead of toggling
    // between the level's default picture and its immediate successor.
    if (advanceCurrent && candidates.length > 1) {
      const currentIdx = candidates.findIndex(model => model.id === this.currentModelId);
      if (currentIdx !== -1) pick = candidates[(currentIdx + 1) % candidates.length];
    } else if (pick.id === this.currentModelId && candidates.length > 1) {
      pick = candidates[(idx + 1) % candidates.length];
    }

    this.loadPicture(pick);
  }

  restartLevel() {
    const model = this.models.find(m => m.id === this.currentModelId) || this.models[0];
    this.loadPicture(model);
  }

  loadPicture(model) {
    this.isComplete = false;
    this.currentModelId = model.id;
    this.gridSize = model.size;
    this.cellSize = { 12: 20, 20: 16, 28: 14, 48: 10, 100: 6 }[model.size] || 6;
    const pictureSize = model.size * this.cellSize;

    this.dom.pixelCanvas.width = pictureSize;
    this.dom.pixelCanvas.height = pictureSize;
    this.dom.antStage.style.setProperty('--picture-size', `${pictureSize}px`);

    this.dom.levelBadge.textContent = `Level ${this.level}: ${model.size}×${model.size} ${model.title}`;
    this.dom.winModal.classList.add('hidden');
    if (this.dom.jamModal) this.dom.jamModal.classList.add('hidden');

    const rawData = model.data;

    // Build grid & color counts
    this.grid = [];
    const colorCounts = {};
    for (let r = 0; r < model.size; r++) {
      const row = [];
      const line = rawData[r] || "";
      for (let c = 0; c < model.size; c++) {
        const ch = line[c] || '.';
        if (ch !== '.' && this.palette[ch]) {
          row.push(ch);
          colorCounts[ch] = (colorCounts[ch] || 0) + 1;
        } else {
          row.push(null);
        }
      }
      this.grid.push(row);
    }

    // Generate shuttle quotas: capped at <= 85 ants per shuttle
    const nests = [];
    let nestIdCounter = 1;
    const maxCapacity = Math.min(85, Math.max(10, Math.round(this.gridSize * 1.5)));

    for (const [color, total] of Object.entries(colorCounts)) {
      let remaining = total;
      while (remaining > 0) {
        let batch;
        if (remaining <= maxCapacity) {
          batch = remaining;
        } else if (remaining <= maxCapacity * 1.8) {
          batch = Math.ceil(remaining / 2);
        } else {
          batch = maxCapacity;
        }
        batch = Math.min(85, Math.max(1, batch));

        nests.push({
          id: nestIdCounter++,
          color: color,
          capacity: batch,
          remaining: batch
        });
        remaining -= batch;
      }
    }

    // Distribute into 5 queues, prioritizing exposed perimeter colors
    this.shuttleQueues = this.generateSolvableQueues(nests);
    this.stagingBays = [null, null, null, null, null, null];
    this.activeBugs = [];
    this.reservedPixels.clear();
    this.lastBayDispatchTime = [0, 0, 0, 0, 0, 0];
    this.undoStack = [];

    this.render();
    setTimeout(() => this.updateOverlayCanvasSize(), 20);
  }

  updateOverlayCanvasSize() {
    if (!this.dom.boardWrap || !this.dom.bugCanvas) return;
    const r = this.dom.boardWrap.getBoundingClientRect();
    const w = Math.round(r.width || this.dom.boardWrap.offsetWidth || 0);
    const h = Math.round(r.height || this.dom.boardWrap.offsetHeight || 0);
    if (w > 0 && h > 0) {
      if (this.dom.bugCanvas.width !== w || this.dom.bugCanvas.height !== h) {
        this.dom.bugCanvas.width = w;
        this.dom.bugCanvas.height = h;
      }
    }
  }

  generateSolvableQueues(allNests) {
    const exposedColors = this.getCurrentlyReachableColors();
    const exposedNests = allNests.filter(s => exposedColors.has(s.color));
    const hiddenNests = allNests.filter(s => !exposedColors.has(s.color));

    const exposedByColor = {};
    for (const c of exposedColors) exposedByColor[c] = [];
    exposedNests.forEach(s => {
      if (!exposedByColor[s.color]) exposedByColor[s.color] = [];
      exposedByColor[s.color].push(s);
    });

    const interleavedExposed = [];
    let hasMore = true;
    while (hasMore) {
      hasMore = false;
      for (const col of Object.keys(exposedByColor)) {
        if (exposedByColor[col].length > 0) {
          interleavedExposed.push(exposedByColor[col].shift());
          hasMore = true;
        }
      }
    }

    const hiddenByColor = {};
    hiddenNests.forEach(s => {
      if (!hiddenByColor[s.color]) hiddenByColor[s.color] = [];
      hiddenByColor[s.color].push(s);
    });
    const interleavedHidden = [];
    hasMore = true;
    while (hasMore) {
      hasMore = false;
      for (const col of Object.keys(hiddenByColor)) {
        if (hiddenByColor[col].length > 0) {
          interleavedHidden.push(hiddenByColor[col].shift());
          hasMore = true;
        }
      }
    }

    const combined = [...interleavedExposed, ...interleavedHidden];
    const lanes = [[], [], [], [], []];
    combined.forEach((nest, idx) => {
      lanes[idx % 5].push(nest);
    });

    return lanes;
  }

  /* --- 4. Spatial Geometry & Waypoints --- */

  /**
   * Returns exact pixel coordinates { x, y, topY } of a staging bay slot
   * relative to the board-and-staging wrapper.
   */
  getBayCoordinates(bayIdx) {
    const wrapRect = this.dom.boardWrap.getBoundingClientRect();
    const slots = this.dom.stagingBaysGrid ? this.dom.stagingBaysGrid.children : null;
    if (slots && slots[bayIdx]) {
      const slotRect = slots[bayIdx].getBoundingClientRect();
      if (slotRect.width > 0) {
        return {
          x: slotRect.left + slotRect.width / 2 - wrapRect.left,
          y: slotRect.top + slotRect.height / 2 - wrapRect.top,
          topY: slotRect.top - wrapRect.top
        };
      }
    }

    // Default fallback
    const w = this.dom.bugCanvas.width || 600;
    const h = this.dom.bugCanvas.height || 450;
    const bayW = w / 6;
    return { x: (bayIdx + 0.5) * bayW, y: h - 35, topY: h - 65 };
  }

  /**
   * Returns exact pixel coordinates { x, y } of a grid cell (r, c)
   * relative to the board-and-staging wrapper.
   */
  getPictureCellCenter(r, c) {
    const wrapRect = this.dom.boardWrap.getBoundingClientRect();
    const canvasRect = this.dom.pixelCanvas.getBoundingClientRect();
    if (canvasRect.width > 0) {
      const cellW = canvasRect.width / this.gridSize;
      const cellH = canvasRect.height / this.gridSize;
      return {
        x: canvasRect.left + (c + 0.5) * cellW - wrapRect.left,
        y: canvasRect.top + (r + 0.5) * cellH - wrapRect.top
      };
    }

    const w = this.dom.bugCanvas.width || 600;
    const pictureSize = this.gridSize * this.cellSize;
    const originX = (w - pictureSize) / 2;
    const originY = 60;
    return {
      x: originX + (c + 0.5) * this.cellSize,
      y: originY + (r + 0.5) * this.cellSize
    };
  }

  /**
   * Returns a set of all colors that currently have at least one pixel
   * adjacent to an open space that connects to the outside boundary.
   */
  getCurrentlyReachableColors() {
    const reachable = new Set();
    const N = this.gridSize;

    const visited = new Uint8Array((N + 2) * (N + 2));
    const queue = [];

    for (let c = 0; c < N + 2; c++) {
      queue.push(0 * (N + 2) + c);
      queue.push((N + 1) * (N + 2) + c);
      visited[0 * (N + 2) + c] = 1;
      visited[(N + 1) * (N + 2) + c] = 1;
    }
    for (let r = 1; r <= N; r++) {
      queue.push(r * (N + 2) + 0);
      queue.push(r * (N + 2) + (N + 1));
      visited[r * (N + 2) + 0] = 1;
      visited[r * (N + 2) + (N + 1)] = 1;
    }

    let head = 0;
    while (head < queue.length) {
      const idx = queue[head++];
      const R = Math.floor(idx / (N + 2));
      const C = idx % (N + 2);

      const neighbors = [
        [R - 1, C], [R + 1, C], [R, C - 1], [R, C + 1]
      ];

      for (let i = 0; i < 4; i++) {
        const nr = neighbors[i][0];
        const nc = neighbors[i][1];
        if (nr < 0 || nr >= N + 2 || nc < 0 || nc >= N + 2) continue;

        const nIdx = nr * (N + 2) + nc;

        if (nr >= 1 && nr <= N && nc >= 1 && nc <= N) {
          const pr = nr - 1;
          const pc = nc - 1;
          const val = this.grid[pr][pc];
          if (val !== null) {
            reachable.add(val);
            continue;
          }
        }

        if (!visited[nIdx]) {
          visited[nIdx] = 1;
          queue.push(nIdx);
        }
      }
    }

    return reachable;
  }

  /**
   * Returns exact pixel boundaries of the orbital track rail surrounding the stage.
   */
  getRailCoordinates() {
    const wrapRect = this.dom.boardWrap.getBoundingClientRect();
    const railEl = this.dom.orbitRail || this.dom.antStage;
    if (railEl) {
      const rect = railEl.getBoundingClientRect();
      const inset = this.dom.orbitRail ? 0 : 22;
      return {
        left: rect.left + inset - wrapRect.left,
        right: rect.right - inset - wrapRect.left,
        top: rect.top + inset - wrapRect.top,
        bottom: rect.bottom - inset - wrapRect.top,
        centerX: rect.left + rect.width / 2 - wrapRect.left,
        centerY: rect.top + rect.height / 2 - wrapRect.top
      };
    }
    const w = this.dom.bugCanvas.width || 600;
    const h = this.dom.bugCanvas.height || 450;
    return {
      left: w * 0.15,
      right: w * 0.85,
      top: 40,
      bottom: h - 140,
      centerX: w / 2,
      centerY: (h - 100) / 2
    };
  }

  /**
   * Capture the DOM geometry used by one path search. Keeping these layout
   * reads outside the border-cell loop avoids hundreds of forced measurements
   * for every ant dispatched on a large board.
   */
  capturePathGeometry(bayIdx) {
    const wrapRect = this.dom.boardWrap.getBoundingClientRect();
    const canvasRect = this.dom.pixelCanvas.getBoundingClientRect();
    const slots = this.dom.stagingBaysGrid ? this.dom.stagingBaysGrid.children : null;
    const slotRect = slots && slots[bayIdx] ? slots[bayIdx].getBoundingClientRect() : null;
    const railEl = this.dom.orbitRail || this.dom.antStage;
    const railRect = railEl ? railEl.getBoundingClientRect() : null;

    const bayPos = slotRect && slotRect.width > 0 ? {
      x: slotRect.left + slotRect.width / 2 - wrapRect.left,
      y: slotRect.top + slotRect.height / 2 - wrapRect.top,
      topY: slotRect.top - wrapRect.top
    } : this.getBayCoordinates(bayIdx);

    const rail = railRect ? {
      left: railRect.left - wrapRect.left,
      right: railRect.right - wrapRect.left,
      top: railRect.top - wrapRect.top,
      bottom: railRect.bottom - wrapRect.top,
      centerX: railRect.left + railRect.width / 2 - wrapRect.left,
      centerY: railRect.top + railRect.height / 2 - wrapRect.top
    } : this.getRailCoordinates();

    const cellCenter = canvasRect.width > 0
      ? (r, c) => ({
          x: canvasRect.left + (c + 0.5) * canvasRect.width / this.gridSize - wrapRect.left,
          y: canvasRect.top + (r + 0.5) * canvasRect.height / this.gridSize - wrapRect.top
        })
      : (r, c) => this.getPictureCellCenter(r, c);

    return { bayPos, rail, cellCenter };
  }

  /**
   * Computes waypoints and perimeter track distance from a parking bay
   * along the outer orbit rail to an entry point on the picture perimeter.
   */
  getRailWaypointsAndDistance(bayIdx, side, r, c, geometry = null) {
    const rail = geometry ? geometry.rail : this.getRailCoordinates();
    const bayPos = geometry ? geometry.bayPos : this.getBayCoordinates(bayIdx);
    const cellPos = geometry ? geometry.cellCenter(r, c) : this.getPictureCellCenter(r, c);

    // Initial waypoints: from parked shuttle card out to the bottom track rail
    const baseWaypoints = [
      { x: bayPos.x, y: bayPos.y },
      { x: bayPos.x, y: bayPos.topY - 8 },
      { x: bayPos.x, y: rail.bottom }
    ];

    let railDistance = 0;
    const loopWaypoints = [];

    if (side === 'bottom') {
      // Scurry along bottom rail horizontally to the target column
      railDistance = Math.abs(cellPos.x - bayPos.x);
      loopWaypoints.push({ x: cellPos.x, y: rail.bottom });
    } else if (side === 'left') {
      // Scurry along bottom rail to bottom-left corner, then up the left rail
      railDistance = Math.abs(bayPos.x - rail.left) + Math.abs(rail.bottom - cellPos.y);
      loopWaypoints.push({ x: rail.left, y: rail.bottom });
      loopWaypoints.push({ x: rail.left, y: cellPos.y });
    } else if (side === 'right') {
      // Scurry along bottom rail to bottom-right corner, then up the right rail
      railDistance = Math.abs(rail.right - bayPos.x) + Math.abs(rail.bottom - cellPos.y);
      loopWaypoints.push({ x: rail.right, y: rail.bottom });
      loopWaypoints.push({ x: rail.right, y: cellPos.y });
    } else if (side === 'top') {
      // Compare both routes around the perimeter loop to choose the shorter track
      const distViaLeft = Math.abs(bayPos.x - rail.left) + Math.abs(rail.bottom - rail.top) + Math.abs(cellPos.x - rail.left);
      const distViaRight = Math.abs(rail.right - bayPos.x) + Math.abs(rail.bottom - rail.top) + Math.abs(rail.right - cellPos.x);

      if (distViaLeft <= distViaRight) {
        railDistance = distViaLeft;
        loopWaypoints.push({ x: rail.left, y: rail.bottom });
        loopWaypoints.push({ x: rail.left, y: rail.top });
        loopWaypoints.push({ x: cellPos.x, y: rail.top });
      } else {
        railDistance = distViaRight;
        loopWaypoints.push({ x: rail.right, y: rail.bottom });
        loopWaypoints.push({ x: rail.right, y: rail.top });
        loopWaypoints.push({ x: cellPos.x, y: rail.top });
      }
    }

    return {
      railDistance,
      waypoints: [...baseWaypoints, ...loopWaypoints]
    };
  }

  /**
   * Finds the closest reachable pixel of targetColor (not currently reserved).
   * Ants travel from their parking bay around the outer orbit track rail to their
   * entry point, then scurry through cleared corridors to snatch the pixel!
   */
  findPathFromShuttleToClosestPixel(bayIdx, targetColor) {
    const N = this.gridSize;
    const cellSize = this.cellSize;
    const geometry = this.capturePathGeometry(bayIdx);

    const dist = new Float32Array(N * N).fill(Infinity);
    const parent = new Int32Array(N * N).fill(-1);

    // Min-heap for Dijkstra
    const heap = [];
    function pushHeap(item) {
      heap.push(item);
      let i = heap.length - 1;
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (heap[i].cost < heap[p].cost) {
          const tmp = heap[i]; heap[i] = heap[p]; heap[p] = tmp;
          i = p;
        } else break;
      }
    }
    function popHeap() {
      const top = heap[0];
      const bottom = heap.pop();
      if (heap.length > 0) {
        heap[0] = bottom;
        let i = 0;
        const len = heap.length;
        while ((i << 1) + 1 < len) {
          let best = (i << 1) + 1;
          const r = best + 1;
          if (r < len && heap[r].cost < heap[best].cost) best = r;
          if (heap[best].cost < heap[i].cost) {
            const tmp = heap[i]; heap[i] = heap[best]; heap[best] = tmp;
            i = best;
          } else break;
        }
      }
      return top;
    }

    let bestDirectTarget = null;
    let minDirectCost = Infinity;

    // Helper to evaluate border cells
    const checkBorderCell = (side, r, c) => {
      const idx = r * N + c;
      const color = this.grid[r][c];
      const railInfo = this.getRailWaypointsAndDistance(bayIdx, side, r, c, geometry);
      const railDist = railInfo.railDistance;

      if (color === targetColor && !this.reservedPixels.has(`${r},${c}`)) {
        const totalCost = railDist + cellSize;
        if (totalCost < minDirectCost) {
          minDirectCost = totalCost;
          bestDirectTarget = {
            target: { r, c },
            cost: totalCost,
            waypoints: [...railInfo.waypoints, geometry.cellCenter(r, c)]
          };
        }
      } else if (color === null) {
        // Open entry corridor into canvas interior
        const startCost = railDist + cellSize;
        if (startCost < dist[idx]) {
          dist[idx] = startCost;
          pushHeap({ r, c, idx, cost: startCost, side, entryR: r, entryC: c });
        }
      }
    };

    // Inspect all 4 borders of the picture
    for (let c = 0; c < N; c++) {
      checkBorderCell('bottom', N - 1, c);
      checkBorderCell('top', 0, c);
    }
    for (let r = 0; r < N; r++) {
      checkBorderCell('left', r, 0);
      checkBorderCell('right', r, N - 1);
    }

    // Run Dijkstra through open cleared spaces
    let bestCorridorTarget = null;

    while (heap.length > 0) {
      const curr = popHeap();
      if (curr.cost > dist[curr.idx]) continue;
      if (curr.cost >= minDirectCost) break; // Direct border target is already shorter!

      const r = curr.r;
      const c = curr.c;

      const neighbors = [
        [r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]
      ];

      let foundTarget = false;

      for (let i = 0; i < 4; i++) {
        const nr = neighbors[i][0];
        const nc = neighbors[i][1];
        if (nr < 0 || nr >= N || nc < 0 || nc >= N) continue;

        const nIdx = nr * N + nc;
        const nColor = this.grid[nr][nc];

        if (nColor === targetColor && !this.reservedPixels.has(`${nr},${nc}`)) {
          const totalCost = curr.cost + cellSize;
          if (totalCost < minDirectCost) {
            bestCorridorTarget = {
              target: { r: nr, c: nc },
              cost: totalCost,
              entrySide: curr.side,
              entryR: curr.entryR,
              entryC: curr.entryC,
              endIdx: curr.idx
            };
            foundTarget = true;
            break;
          }
        } else if (nColor === null) {
          const nextCost = curr.cost + cellSize;
          if (nextCost < dist[nIdx]) {
            dist[nIdx] = nextCost;
            parent[nIdx] = curr.idx;
            pushHeap({ r: nr, c: nc, idx: nIdx, cost: nextCost, side: curr.side, entryR: curr.entryR, entryC: curr.entryC });
          }
        }
      }

      if (foundTarget) break;
    }

    if (bestCorridorTarget && (!bestDirectTarget || bestCorridorTarget.cost < bestDirectTarget.cost)) {
      const cellPath = [];
      let cur = bestCorridorTarget.endIdx;
      while (cur !== -1) {
        const cr = Math.floor(cur / N);
        const cc = cur % N;
        cellPath.unshift({ r: cr, c: cc });
        cur = parent[cur];
      }
      cellPath.push(bestCorridorTarget.target);

      const railInfo = this.getRailWaypointsAndDistance(
        bayIdx,
        bestCorridorTarget.entrySide,
        bestCorridorTarget.entryR,
        bestCorridorTarget.entryC,
        geometry
      );
      const waypoints = [...railInfo.waypoints];

      for (const cp of cellPath) {
        waypoints.push(geometry.cellCenter(cp.r, cp.c));
      }

      return { target: bestCorridorTarget.target, waypoints: waypoints };
    } else if (bestDirectTarget) {
      return { target: bestDirectTarget.target, waypoints: bestDirectTarget.waypoints };
    }

    return null;
  }

  /* --- 5. Staging & Queue Interactions --- */
  handleQueueClick(laneIdx) {
    if (this.isPaused) return;

    const lane = this.shuttleQueues[laneIdx];
    if (!lane || lane.length === 0) return;

    const freeBayIdx = this.stagingBays.findIndex(b => b === null);
    if (freeBayIdx === -1) {
      window.antsAudio.playInvalid();
      this.checkJamCondition();
      this.dom.stagingBaysGrid.style.animation = 'none';
      setTimeout(() => {
        this.dom.stagingBaysGrid.style.animation = 'pulse-shake 0.35s ease';
      }, 10);
      return;
    }

    this.saveStateForUndo();

    const nest = lane.shift();
    this.stagingBays[freeBayIdx] = {
      ...nest,
      stagingIdx: freeBayIdx,
      inFlight: true
    };

    window.antsAudio.playDeploy();
    this.render();
  }

  findNestInQueues(id) {
    for (const lane of this.shuttleQueues) {
      for (const nest of lane) {
        if (nest.id === id) return nest;
      }
    }
    return null;
  }

  swapParkedNest() {
    let bayIdx = -1;
    this.stagingBays.forEach((nest, idx) => {
      if (!nest || nest.remaining <= 0) return;
      // Do not swap out a bay that currently has ants actively in flight
      const inFlight = this.activeBugs.some(b => b.bayIdx === idx || b.nestId === nest.id);
      if (inFlight) return;
      if (bayIdx === -1 || nest.remaining > this.stagingBays[bayIdx].remaining) bayIdx = idx;
    });
    const queued = this.shuttleQueues.flatMap((lane, laneIdx) =>
      lane.map((nest, cardIdx) => ({ laneIdx, cardIdx }))
    );
    if (bayIdx === -1 || queued.length === 0) return;

    this.saveStateForUndo();
    const { laneIdx, cardIdx } = queued[Math.floor(Math.random() * queued.length)];
    const incoming = this.shuttleQueues[laneIdx][cardIdx];
    const { stagingIdx, inFlight, ...outgoing } = this.stagingBays[bayIdx];
    this.shuttleQueues[laneIdx][cardIdx] = outgoing;
    this.stagingBays[bayIdx] = { ...incoming, stagingIdx: bayIdx, inFlight: true };
    this.render();
  }

  /* --- 6. Bug Dispatching & Scurrying Engine --- */
  startAnimationLoop() {
    let lastTime = performance.now();
    const loop = (now) => {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      if (!this.isPaused) {
        this.updateBugs(now, dt);
      }

      this.renderBugCanvas();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  updateBugs(now, dt) {
    const speedIntervals = { slow: 380, normal: 240, fast: 130 };
    const dispatchInterval = speedIntervals[this.speedMode] || 240;
    const maxBugsPerBay = 6;

    for (let bayIdx = 0; bayIdx < 6; bayIdx++) {
      const bay = this.stagingBays[bayIdx];
      if (!bay || bay.remaining <= 0) continue;

      const activeForThisBay = this.activeBugs.filter(b => b.bayIdx === bayIdx).length;
      if (activeForThisBay >= bay.remaining || activeForThisBay >= maxBugsPerBay) continue;

      if (now - this.lastBayDispatchTime[bayIdx] >= dispatchInterval) {
        const found = this.findPathFromShuttleToClosestPixel(bayIdx, bay.color);
        if (found) {
          const { target, waypoints } = found;
          this.reservedPixels.add(`${target.r},${target.c}`);
          this.lastBayDispatchTime[bayIdx] = now;

          this.activeBugs.push({
            id: this.nextBugId++,
            bayIdx: bayIdx,
            nestId: bay.id,
            color: bay.color,
            target: target,
            waypoints: waypoints,
            wpIndex: 0,
            segProgress: 0.0,
            state: 'outbound',
            hasPixel: false,
            waddlePhase: Math.random() * Math.PI * 2,
            distanceWalked: 0
          });
        }
      }
    }

    const bugSpeed = { slow: 160.0, normal: 260.0, fast: 420.0 }[this.speedMode] || 260.0;
    const moveDist = bugSpeed * dt;

    for (let i = this.activeBugs.length - 1; i >= 0; i--) {
      const bug = this.activeBugs[i];
      let remainingMove = moveDist;
      bug.distanceWalked += moveDist;

      while (remainingMove > 0 && bug.wpIndex < bug.waypoints.length - 1) {
        const p1 = bug.waypoints[bug.wpIndex];
        const p2 = bug.waypoints[bug.wpIndex + 1];
        const segLen = Math.hypot(p2.x - p1.x, p2.y - p1.y) || 1;
        const distNeeded = segLen - bug.segProgress;

        if (remainingMove >= distNeeded) {
          remainingMove -= distNeeded;
          bug.wpIndex++;
          bug.segProgress = 0.0;
        } else {
          bug.segProgress += remainingMove;
          remainingMove = 0;
        }
      }

      if (bug.wpIndex >= bug.waypoints.length - 1) {
        if (bug.state === 'outbound') {
          const { r, c } = bug.target;
          if (r >= 0 && r < this.gridSize && c >= 0 && c < this.gridSize && this.grid[r][c] === bug.color) {
            this.grid[r][c] = null;
            this.reservedPixels.delete(`${r},${c}`);
            bug.hasPixel = true;

            // Decrement quota immediately on snatch so pixels and shuttle counts stay locked
            const owningBay = this.stagingBays.find(b => b && b.id === bug.nestId) || this.stagingBays[bug.bayIdx];
            if (owningBay) {
              owningBay.remaining--;
            } else {
              const queuedNest = this.findNestInQueues(bug.nestId);
              if (queuedNest) queuedNest.remaining--;
            }

            this.ctx.clearRect(c * this.cellSize, r * this.cellSize, this.cellSize, this.cellSize);
            window.antsAudio.playSnatch(this.snatchStreak++);
            this.renderStatusBar();
            this.renderStaging();
          } else {
            this.reservedPixels.delete(`${r},${c}`);
          }

          // Retrace waypoints all the way back into the parked shuttle in the staging bay!
          bug.state = 'returning';
          bug.waypoints.reverse();
          bug.wpIndex = 0;
          bug.segProgress = 0.0;
        } else {
          // Arrived inside the parked shuttle in the staging bay!
          window.antsAudio.playDeposit(this.depositStreak++);
          this.activeBugs.splice(i, 1);

          const owningBay = this.stagingBays.find(b => b && b.id === bug.nestId) || this.stagingBays[bug.bayIdx];
          if (owningBay && owningBay.remaining <= 0) {
            const bugsRemainingForBay = this.activeBugs.some(b => b.nestId === bug.nestId);
            if (!bugsRemainingForBay) {
              window.antsAudio.playNestFull();
              const idx = this.stagingBays.indexOf(owningBay);
              if (idx !== -1) this.stagingBays[idx] = null;
            }
          }

          this.renderStaging();
          this.checkWinCondition();
          this.checkJamCondition();
          continue;
        }
      }
    }

    if (this.activeBugs.length === 0) {
      this.checkWinCondition();
      this.checkJamCondition();
    }
  }

  /* --- 7. Rendering Bugs on Stage Canvas --- */
  renderBugCanvas() {
    if (!this.bugCtx) return;
    const ctx = this.bugCtx;
    ctx.clearRect(0, 0, this.dom.bugCanvas.width, this.dom.bugCanvas.height);

    for (const bug of this.activeBugs) {
      const p1 = bug.waypoints[bug.wpIndex];
      const p2 = bug.waypoints[Math.min(bug.waypoints.length - 1, bug.wpIndex + 1)];
      const segLen = Math.hypot(p2.x - p1.x, p2.y - p1.y) || 1;

      const t = Math.max(0, Math.min(1, bug.segProgress / segLen));
      const x = p1.x + (p2.x - p1.x) * t;
      const y = p1.y + (p2.y - p1.y) * t;

      let angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      if (p1.x === p2.x && p1.y === p2.y) angle = -Math.PI / 2;

      const waddle = Math.sin(bug.distanceWalked * 0.18 + bug.waddlePhase) * 0.18;

      this.drawBug(ctx, x, y, angle + waddle, bug);
    }
  }

  drawBug(ctx, x, y, angle, bug) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    const bugRadius = Math.max(4.5, Math.min(8.5, this.cellSize * 0.45));
    const pal = this.palette[bug.color] || { hex: '#ec8d6f', border: '#c96a4d' };

    // 1. 6-legged insect marks
    ctx.strokeStyle = '#222222';
    ctx.lineWidth = 1.2;
    ctx.lineCap = 'round';
    [-bugRadius * 0.4, 0, bugRadius * 0.4].forEach(legX => {
      const legSpread = bugRadius * 1.35;
      ctx.beginPath();
      ctx.moveTo(legX, -legSpread);
      ctx.lineTo(legX, legSpread);
      ctx.stroke();
    });

    // 2. Bug Round Body
    ctx.fillStyle = pal.hex;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.ellipse(0, 0, bugRadius * 1.1, bugRadius * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 3. Cute Bug Eyes facing direction of travel
    const eyeOffsetX = bugRadius * 0.55;
    const eyeOffsetY = bugRadius * 0.45;
    const eyeR = Math.max(1.8, bugRadius * 0.32);

    [-eyeOffsetY, eyeOffsetY].forEach(ey => {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(eyeOffsetX, ey, eyeR, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(eyeOffsetX + eyeR * 0.3, ey, eyeR * 0.5, 0, Math.PI * 2);
      ctx.fill();
    });

    // 4. Carried Pixel Crumb (when returning to shuttle)
    if (bug.hasPixel) {
      const crumbSize = Math.max(4.5, this.cellSize * 0.7);
      ctx.fillStyle = pal.hex;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.2;

      ctx.beginPath();
      ctx.rect(-crumbSize * 0.5, -crumbSize * 0.5, crumbSize, crumbSize);
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }

  /* --- 8. Board Rendering --- */
  render() {
    this.renderPixelCanvas();
    this.renderStaging();
    this.renderQueues();
    this.renderStatusBar();
    this.checkWinCondition();
    this.checkJamCondition();
    this.updateOverlayCanvasSize();
  }

  renderPixelCanvas() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.dom.pixelCanvas.width, this.dom.pixelCanvas.height);

    for (let r = 0; r < this.gridSize; r++) {
      for (let c = 0; c < this.gridSize; c++) {
        const col = this.grid[r][c];
        if (col && this.palette[col]) {
          ctx.fillStyle = this.palette[col].hex;
          ctx.fillRect(c * this.cellSize, r * this.cellSize, this.cellSize, this.cellSize);
        }
      }
    }
  }

  renderStaging() {
    if (!this.dom.stagingBaysGrid) return;
    this.dom.stagingBaysGrid.innerHTML = '';

    for (let i = 0; i < 6; i++) {
      const bay = this.stagingBays[i];
      const slot = document.createElement('div');
      slot.className = 'staging-slot';

      if (bay) {
        slot.classList.add('occupied');
        const pal = this.palette[bay.color] || { hex: '#ec8d6f' };
        slot.innerHTML = `
          <div class="slot-color-pip" style="background-color: ${pal.hex};"></div>
          <div class="slot-count-badge">${bay.remaining}</div>
        `;
      }

      this.dom.stagingBaysGrid.appendChild(slot);
    }
  }

  renderQueues() {
    if (!this.dom.queuesLanesGrid) return;
    this.dom.queuesLanesGrid.innerHTML = '';

    this.shuttleQueues.forEach((lane, laneIdx) => {
      const laneEl = document.createElement('div');
      laneEl.className = 'queue-lane';

      lane.forEach((nest, cardIdx) => {
        const card = document.createElement('div');
        card.className = `queue-card ${cardIdx === 0 ? 'head-card' : 'waiting-card'}`;
        const pal = this.palette[nest.color] || { hex: '#ec8d6f' };

        card.innerHTML = `
          <div class="card-color-dot" style="background-color: ${pal.hex}; border-color: ${pal.border};"></div>
          <div class="card-quota-num">${nest.remaining}</div>
        `;

        if (cardIdx === 0) {
          card.addEventListener('click', () => this.handleQueueClick(laneIdx));
        }

        laneEl.appendChild(card);
      });

      this.dom.queuesLanesGrid.appendChild(laneEl);
    });
  }

  renderStatusBar() {
    if (!this.dom.itemsLeft) return;
    let count = 0;
    for (let r = 0; r < this.gridSize; r++) {
      for (let c = 0; c < this.gridSize; c++) {
        if (this.grid[r][c] !== null) count++;
      }
    }
    this.dom.itemsLeft.textContent = count;
  }

  /* --- 9. Win & Jam Conditions --- */
  checkWinCondition() {
    let remainingPixels = 0;
    for (let r = 0; r < this.gridSize; r++) {
      for (let c = 0; c < this.gridSize; c++) {
        if (this.grid[r][c] !== null) remainingPixels++;
      }
    }

    if (remainingPixels > 0) {
      this.isComplete = false;
      return;
    }
    if (this.activeBugs.length > 0 || this.isComplete) return;

    this.isComplete = true;
    for (let i = 0; i < 6; i++) {
      this.stagingBays[i] = null;
    }
    this.renderStaging();
    window.antsAudio.playWin();
    this.dom.winModal.classList.remove('hidden');
  }

  checkJamCondition() {
    if (!this.dom.jamModal) return;

    let remainingPixels = 0;
    for (let r = 0; r < this.gridSize; r++) {
      for (let c = 0; c < this.gridSize; c++) {
        if (this.grid[r][c] !== null) remainingPixels++;
      }
    }
    if (remainingPixels === 0) return;

    const isFull = this.stagingBays.every(b => b !== null && b.remaining > 0);
    if (!isFull) {
      this.dom.jamModal.classList.add('hidden');
      return;
    }

    const reachableColors = this.getCurrentlyReachableColors();
    const canProgress = this.stagingBays.some(bay => bay && reachableColors.has(bay.color));

    if (!canProgress && this.activeBugs.length === 0) {
      this.dom.jamModal.classList.remove('hidden');
    } else {
      this.dom.jamModal.classList.add('hidden');
    }
  }

  /* --- 10. Undo History --- */
  saveStateForUndo() {
    const snapshot = {
      grid: this.grid.map(row => [...row]),
      stagingBays: this.stagingBays.map(b => b ? { ...b } : null),
      shuttleQueues: this.shuttleQueues.map(lane => lane.map(n => ({ ...n })))
    };
    this.undoStack.push(snapshot);
    if (this.undoStack.length > 50) this.undoStack.shift();
  }

  undoMove() {
    if (this.undoStack.length === 0) return;
    const last = this.undoStack.pop();

    this.grid = last.grid.map(row => [...row]);
    this.stagingBays = last.stagingBays.map(b => b ? { ...b } : null);
    this.shuttleQueues = last.shuttleQueues.map(lane => lane.map(n => ({ ...n })));

    this.activeBugs = [];
    this.reservedPixels.clear();

    if (this.dom.jamModal) this.dom.jamModal.classList.add('hidden');
    this.render();
  }
}

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
    grow.checked = gameStorage.getItem(options.id + '_grow') !== 'false';
    document.getElementById('btn-settings').addEventListener('click', () => { grow.checked = gameStorage.getItem(options.id + '_grow') !== 'false'; });
    document.getElementById('btn-apply-settings').addEventListener('click', () => {
      try { localStorage.setItem(options.id + '_grow', String(grow.checked)); } catch (error) { this.status('Browser saving is unavailable.'); }
    }, true);
    document.getElementById('btn-reset-progress').addEventListener('click', () => {
      if (!confirm('Reset this game to level 1 and discard its saved board? Your other games are kept.')) return;
      this.suspended = true;
      try {
        localStorage.removeItem(this.key);
        localStorage.setItem(options.levelKey, '1');
      } catch (error) { this.suspended = false; this.status('Browser saving is unavailable.'); return; }
      location.reload();
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.save(); });
    window.addEventListener('pagehide', () => this.save());
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
  window.antsGame = new AntsGame();
  const game = window.antsGame;

  game.checkpoint = new BrowserCheckpoint(game, {
    id: 'ants', levelKey: 'ants_level',
    fields: 'level selectedSize difficulty currentModelId speedMode gridSize grid shuttleQueues stagingBays undoStack isPaused',
    actions: 'loadRandomPictureForSize restartLevel undoMove handleQueueClick swapParkedNest togglePause cycleSpeed',
    validate: s => s.level >= 1 && [12,20,28,48,100].includes(s.gridSize) && s.grid.length === s.gridSize && s.grid.every(r => r.length === s.gridSize) && s.shuttleQueues.length === 5 && s.stagingBays.length === 6,
    resume: g => {
      const model = g.models.find(m => m.id === g.currentModelId);
      if (!model || model.size !== g.gridSize) throw new Error('Missing picture');
      g.cellSize = { 12: 20, 20: 16, 28: 14, 48: 10, 100: 6 }[g.gridSize] || 6;
      const pictureSize = g.gridSize * g.cellSize;

      g.dom.pixelCanvas.width = pictureSize;
      g.dom.pixelCanvas.height = pictureSize;
      g.dom.antStage.style.setProperty('--picture-size', `${pictureSize}px`);
      g.dom.levelBadge.textContent = `Level ${g.level}: ${model.title}`;
      g.activeBugs = [];
      g.reservedPixels.clear();
      g.updateSpeedButton();
      g.dom.iconPause.classList.toggle('hidden', g.isPaused);
      g.dom.iconPlay.classList.toggle('hidden', !g.isPaused);
      g.render();
      g.checkWinCondition();
    },
    capture: (g, s) => {
      s.stagingBays = g.stagingBays.map(b => b && b.remaining > 0 ? { ...b, inFlight: true } : null);
    },
  });
});
