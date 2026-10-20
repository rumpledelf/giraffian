/**
 * Pixel Unravel - Orbital Vacuum Layer Dismantler
 * Pure Vanilla ES6 JavaScript with HTML5 Canvas Renderer
 */

class PixelGame {
  constructor() {
    this.models = this.initModels();
    this.selectedSize = parseInt(localStorage.getItem('pixel_size') || '12', 10);
    this.difficulty = localStorage.getItem('pixel_difficulty') === 'easy' ? 'easy' : 'challenging';
    this.currentModelId = null;
    this.speedMode = localStorage.getItem('pixel_speed') || 'normal'; // 'slow', 'normal', 'fast'
    
    this.gridSize = 12;
    this.grid = []; // 2D array of color keys or null
    this.shuttleQueues = [[], [], [], [], []]; // 5 queue lanes
    this.stagingBays = [null, null, null, null, null, null]; // 6 staging slots
    this.inFlightShuttles = []; // Array of { id, color, capacity, remaining, stagingIdx, trackPos, lapHits, el }
    this.launchQueue = []; // Queue of staging bay indices to launch onto track
    this.lastSpawnTime = 0;
    this.nextShuttleId = 1;
    this.isPaused = false;
    this.undoStack = [];
    
    // Boundary line-of-sight tracking for instant O(1) raycasting even on 100x100
    this.topBounds = null;
    this.bottomBounds = null;
    this.leftBounds = null;
    this.rightBounds = null;

    this.dom = {
      levelBadge: document.getElementById('level-badge'),
      itemsLeft: document.getElementById('items-left-count'),
      stagingBaysGrid: document.getElementById('staging-bays-grid'),
      queuesLanesGrid: document.getElementById('queues-lanes-grid'),
      canvas: document.getElementById('pixel-canvas'),
      orbitStage: document.getElementById('orbit-stage'),
      shuttlesLayer: document.getElementById('orbit-shuttles-layer'),
      vacuumBeamSvg: document.getElementById('vacuum-beam-svg'),
      btnPause: document.getElementById('btn-pause'),
      iconPause: document.getElementById('icon-pause'),
      iconPlay: document.getElementById('icon-play'),
      btnRestart: document.getElementById('btn-restart'),
      btnUndo: document.getElementById('btn-undo'),
      btnSound: document.getElementById('btn-sound'),
      soundIconOn: document.getElementById('sound-icon-on'),
      soundIconOff: document.getElementById('sound-icon-off'),
      btnSpeed: document.getElementById('btn-speed'),
      speedLabel: document.getElementById('speed-label'),
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

    if (this.dom.canvas) {
      this.ctx = this.dom.canvas.getContext('2d');
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

  /* --- 1. Pixel Art Models (Tiny 12x12 -> Epic 100x100) --- */
  initModels() {
    return window.pixelPictures.map(model => ({
      ...model,
      colorCount: new Set(model.data.join('')).size
    }));
  }

  /* --- 2. Event Listeners --- */
  initEvents() {
    this.dom.btnPause.addEventListener('click', () => this.togglePause());
    this.dom.btnRestart.addEventListener('click', () => this.restartLevel());
    this.dom.btnUndo.addEventListener('click', () => this.undoMove());
    this.dom.btnJamRescue.addEventListener('click', () => this.swapParkedShuttle());
    this.dom.btnSpeed.addEventListener('click', () => this.cycleSpeed());
    this.dom.btnNew.addEventListener('click', () => {
      this.loadRandomPictureForSize(this.selectedSize);
    });

    this.dom.btnSound.addEventListener('click', () => {
      window.pixelAudio.toggleMute();
      this.updateSoundIcons();
    });

    this.dom.btnNextLevel.addEventListener('click', () => {
      this.dom.winModal.classList.add('hidden');
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
      localStorage.setItem('pixel_size', this.selectedSize);
      localStorage.setItem('pixel_difficulty', this.difficulty);
      localStorage.setItem('pixel_speed', this.speedMode);
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
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    if (this.isPaused) {
      this.dom.iconPause.classList.add('hidden');
      this.dom.iconPlay.classList.remove('hidden');
    } else {
      this.dom.iconPause.classList.remove('hidden');
      this.dom.iconPlay.classList.add('hidden');
    }
  }

  cycleSpeed() {
    const modes = ['slow', 'normal', 'fast'];
    const nextIdx = (modes.indexOf(this.speedMode) + 1) % modes.length;
    this.speedMode = modes[nextIdx];
    localStorage.setItem('pixel_speed', this.speedMode);
    this.updateSpeedButton();
  }

  updateSpeedButton() {
    const labels = {
      slow: '⚡ Slow',
      normal: '⚡ Normal',
      fast: '⚡ Fast'
    };
    this.dom.btnSpeed.textContent = labels[this.speedMode] || '⚡ Speed';
    if (this.dom.speedLabel) {
      this.dom.speedLabel.textContent = labels[this.speedMode] || 'Normal';
    }
  }

  updateSoundIcons() {
    const isMuted = window.pixelAudio.isMuted();
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
      this.dom.sizeSelect.value = String(this.selectedSize);
    }
    if (this.dom.speedSelect) {
      this.dom.speedSelect.value = this.speedMode;
    }
  }

  /* --- 3. Level Setup & Solvable Queue Generation --- */
  loadRandomPictureForSize(size) {
    this.selectedSize = size || this.selectedSize || 12;
    const candidates = this.models.filter(m => m.size === this.selectedSize &&
      (this.difficulty === 'easy' ? m.colorCount <= 5 : m.colorCount >= 8));
    let pick = candidates[0];
    if (candidates.length > 1) {
      const remaining = candidates.filter(m => m.id !== this.currentModelId);
      pick = remaining[Math.floor(Math.random() * remaining.length)];
    }
    this.loadPicture(pick);
  }

  restartLevel() {
    const model = this.models.find(m => m.id === this.currentModelId) || this.models[0];
    this.loadPicture(model);
  }

  loadPicture(model) {
    this.currentModelId = model.id;
    this.gridSize = model.size;
    const cellSize = { 12: 20, 20: 16, 28: 14, 48: 10, 100: 6 }[model.size] || 6;
    const pictureSize = model.size * cellSize;
    this.dom.canvas.width = pictureSize;
    this.dom.canvas.height = pictureSize;
    this.dom.orbitStage.style.setProperty('--picture-size', `${pictureSize}px`);
    this.dom.levelBadge.textContent = `${model.size}×${model.size}: ${model.title}`;
    this.dom.winModal.classList.add('hidden');

    const rawData = model.data;

    // 1. Build grid
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

    // 2. Initialize fast O(1) perimeter bounds
    this.initBoundaries();

    // 3. Generate shuttles: strictly capped at <= 90 per shuttle (never 3 digits!)
    const shuttles = [];
    let shuttleIdCounter = 1;
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
        // Ensure cap strictly at at most 90
        batch = Math.min(90, Math.max(1, batch));

        shuttles.push({
          id: shuttleIdCounter++,
          color: color,
          capacity: batch,
          remaining: batch
        });
        remaining -= batch;
      }
    }

    // 4. Arrange shuttles into 5 queues, sorted with outer layer colors at top
    this.shuttleQueues = this.generateSolvableQueues(shuttles);
    this.stagingBays = [null, null, null, null, null, null];
    if (this.inFlightShuttles) {
      this.inFlightShuttles.forEach(s => {
        if (s.el && s.el.parentNode) s.el.remove();
      });
    }
    this.inFlightShuttles = [];
    this.launchQueue = [];
    if (this.dom.shuttlesLayer) {
      this.dom.shuttlesLayer.innerHTML = '';
    }
    if (this.dom.vacuumBeamSvg) {
      this.dom.vacuumBeamSvg.innerHTML = '';
    }
    if (this.dom.jamModal) {
      this.dom.jamModal.classList.add('hidden');
    }
    this.undoStack = [];

    this.render();
  }

  /* Boundary line-of-sight tracking for instant O(1) raycasting */
  initBoundaries() {
    this.topBounds = new Int16Array(this.gridSize).fill(-1);
    this.bottomBounds = new Int16Array(this.gridSize).fill(-1);
    this.leftBounds = new Int16Array(this.gridSize).fill(-1);
    this.rightBounds = new Int16Array(this.gridSize).fill(-1);

    for (let c = 0; c < this.gridSize; c++) {
      for (let r = 0; r < this.gridSize; r++) {
        if (this.grid[r][c] !== null) { this.topBounds[c] = r; break; }
      }
      for (let r = this.gridSize - 1; r >= 0; r--) {
        if (this.grid[r][c] !== null) { this.bottomBounds[c] = r; break; }
      }
    }
    for (let r = 0; r < this.gridSize; r++) {
      for (let c = 0; c < this.gridSize; c++) {
        if (this.grid[r][c] !== null) { this.leftBounds[r] = c; break; }
      }
      for (let c = this.gridSize - 1; c >= 0; c--) {
        if (this.grid[r][c] !== null) { this.rightBounds[r] = c; break; }
      }
    }
  }

  generateSolvableQueues(allShuttles) {
    const exposedColors = this.getCurrentlyExposedColors();
    // Group into exposed vs not-yet-exposed
    const exposedShuttles = allShuttles.filter(s => exposedColors.has(s.color));
    const hiddenShuttles = allShuttles.filter(s => !exposedColors.has(s.color));

    // Group exposed shuttles by color so we can interleave them
    const exposedByColor = {};
    for (const c of exposedColors) {
      exposedByColor[c] = [];
    }
    exposedShuttles.forEach(s => {
      if (!exposedByColor[s.color]) exposedByColor[s.color] = [];
      exposedByColor[s.color].push(s);
    });

    // Interleave exposed colors
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

    // Interleave hidden colors similarly
    const hiddenByColor = {};
    hiddenShuttles.forEach(s => {
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
    combined.forEach((shuttle, idx) => {
      lanes[idx % 5].push(shuttle);
    });

    return lanes;
  }

  /* --- 4. Perimeter Raycasting: O(1) Line-of-Sight --- */
  getExposedPixelFromTrack(side, index) {
    if (index < 0 || index >= this.gridSize) return null;

    if (side === 'top') {
      const r = this.topBounds[index];
      if (r !== -1 && this.grid[r][index] !== null) {
        return { row: r, col: index, color: this.grid[r][index] };
      }
    } else if (side === 'bottom') {
      const r = this.bottomBounds[index];
      if (r !== -1 && this.grid[r][index] !== null) {
        return { row: r, col: index, color: this.grid[r][index] };
      }
    } else if (side === 'left') {
      const c = this.leftBounds[index];
      if (c !== -1 && this.grid[index][c] !== null) {
        return { row: index, col: c, color: this.grid[index][c] };
      }
    } else if (side === 'right') {
      const c = this.rightBounds[index];
      if (c !== -1 && this.grid[index][c] !== null) {
        return { row: index, col: c, color: this.grid[index][c] };
      }
    }
    return null;
  }

  getCurrentlyExposedColors() {
    const exposed = new Set();
    for (let i = 0; i < this.gridSize; i++) {
      ['top', 'right', 'bottom', 'left'].forEach(side => {
        const hit = this.getExposedPixelFromTrack(side, i);
        if (hit) exposed.add(hit.color);
      });
    }
    return exposed;
  }

  hasReachablePixels(color) {
    for (let i = 0; i < this.gridSize; i++) {
      for (const side of ['top', 'right', 'bottom', 'left']) {
        const hit = this.getExposedPixelFromTrack(side, i);
        if (hit && hit.color === color) return true;
      }
    }
    return false;
  }

  /* --- 5. Shuttle Interaction & Multi-Shuttle Staging --- */
  handleQueueClick(laneIdx) {
    if (this.isPaused) return;

    const lane = this.shuttleQueues[laneIdx];
    if (!lane || lane.length === 0) return;

    const freeBayIdx = this.stagingBays.findIndex(b => b === null);
    if (freeBayIdx === -1) {
      this.checkJamCondition();
      // Staging bays are full! Gentle visual feedback
      this.dom.stagingBaysGrid.style.animation = 'none';
      setTimeout(() => {
        this.dom.stagingBaysGrid.style.animation = 'pulse-inflight 0.4s ease 2';
      }, 10);
      return;
    }

    this.saveStateForUndo();

    const shuttle = lane.shift();
    this.stagingBays[freeBayIdx] = {
      ...shuttle,
      stagingIdx: freeBayIdx,
      inFlight: true
    };

    this.queueShuttleLaunch(freeBayIdx);
    this.render();
  }

  handleStagingClick(bayIdx) {
    if (this.isPaused) return;
    const shuttle = this.stagingBays[bayIdx];
    if (!shuttle) return;

    // Only parked shuttles with remaining count can be re-launched into orbit
    if (!shuttle.inFlight && shuttle.remaining > 0) {
      this.saveStateForUndo();
      shuttle.inFlight = true;
      this.queueShuttleLaunch(bayIdx);
      this.render();
    }
  }

  swapParkedShuttle() {
    let bayIdx = -1;
    this.stagingBays.forEach((shuttle, idx) => {
      if (!shuttle || shuttle.inFlight || shuttle.remaining <= 0) return;
      if (bayIdx === -1 || shuttle.remaining > this.stagingBays[bayIdx].remaining) bayIdx = idx;
    });
    const queued = this.shuttleQueues.flatMap((lane, laneIdx) =>
      lane.map((shuttle, cardIdx) => ({ laneIdx, cardIdx }))
    );
    if (bayIdx === -1 || queued.length === 0) return;

    this.saveStateForUndo();
    const { laneIdx, cardIdx } = queued[Math.floor(Math.random() * queued.length)];
    const incoming = this.shuttleQueues[laneIdx][cardIdx];
    const { stagingIdx, inFlight, ...outgoing } = this.stagingBays[bayIdx];
    this.shuttleQueues[laneIdx][cardIdx] = outgoing;
    this.stagingBays[bayIdx] = { ...incoming, stagingIdx: bayIdx, inFlight: false };
    this.render();
  }

  queueShuttleLaunch(stagingIdx) {
    this.launchQueue.push(stagingIdx);
    this.processLaunchQueue();
  }

  processLaunchQueue() {
    if (this.launchQueue.length === 0) return;

    const now = performance.now();
    // Maintain smooth minimum spacing between successive shuttle launches (~450ms)
    if (now - this.lastSpawnTime < 450) return;

    // Check if any existing in-flight shuttle is right on the bottom-left start line
    const isStartLineBlocked = this.inFlightShuttles.some(s => s.trackPos < 0.28);
    if (isStartLineBlocked) return;

    const stagingIdx = this.launchQueue.shift();
    const bay = this.stagingBays[stagingIdx];
    if (!bay) return;

    const shuttleObj = {
      id: this.nextShuttleId++,
      color: bay.color,
      capacity: bay.capacity,
      remaining: bay.remaining,
      stagingIdx: stagingIdx,
      trackPos: 0.0,
      lapHits: new Set(),
      el: this.createShuttleElement(bay)
    };

    this.inFlightShuttles.push(shuttleObj);
    this.lastSpawnTime = now;
    window.pixelAudio.playLaunch();
    this.renderShuttlePosition(shuttleObj);
  }

  createShuttleElement(shuttleData) {
    const el = document.createElement('div');
    el.className = 'orbit-shuttle';
    const pal = this.palette[shuttleData.color] || { hex: '#ec8d6f' };
    el.innerHTML = `
      <div class="orbit-shuttle-core" style="background-color: ${pal.hex};"></div>
      <div class="orbit-shuttle-count">${shuttleData.remaining}</div>
    `;
    if (this.dom.shuttlesLayer) {
      this.dom.shuttlesLayer.appendChild(el);
    }
    return el;
  }

  /* --- 6. Orbit Animation Loop (Concurrent Shuttles) --- */
  startAnimationLoop() {
    let lastTime = performance.now();
    const loop = (now) => {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      if (!this.isPaused) {
        this.updateInFlightShuttles(dt);
      }

      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  updateInFlightShuttles(dt) {
    this.processLaunchQueue();

    if (this.inFlightShuttles.length === 0) {
      this.checkJamCondition();
      return;
    }

    const speedMap = { slow: 0.16, normal: 0.28, fast: 0.5 };
    const speed = speedMap[this.speedMode] || 0.28;

    // Update shuttles in reverse so we can safely splice completed/docked ones
    for (let i = this.inFlightShuttles.length - 1; i >= 0; i--) {
      const shuttle = this.inFlightShuttles[i];
      shuttle.trackPos += speed * dt;

      // 1. One complete circuit round (pos >= 4.0): returns to bottom-left and docks
      if (shuttle.trackPos >= 4.0) {
        if (shuttle.el && shuttle.el.parentNode) shuttle.el.remove();
        this.inFlightShuttles.splice(i, 1);

        const bay = this.stagingBays[shuttle.stagingIdx];
        if (shuttle.remaining > 0) {
          // Shuttle still has quota remaining -> parks in its staging bay
          if (bay) {
            bay.remaining = shuttle.remaining;
            bay.inFlight = false;
          }
          window.pixelAudio.playDock();
        } else {
          // Shuttle fulfilled: clears from staging bay
          this.stagingBays[shuttle.stagingIdx] = null;
        }

        this.renderStaging();
        this.checkJamCondition();
        continue;
      }

      // 2. Track rail coordinates & direction (Clockwise starting from bottom-left)
      const pos = shuttle.trackPos;
      let side, frac;
      if (pos < 1.0) {
        // Left rail moving UP (bottom to top)
        side = 'left';
        frac = Math.max(0, Math.min(1.0 - pos, 0.999));
      } else if (pos < 2.0) {
        // Top rail moving RIGHT (left to right)
        side = 'top';
        frac = Math.max(0, Math.min(pos - 1.0, 0.999));
      } else if (pos < 3.0) {
        // Right rail moving DOWN (top to bottom)
        side = 'right';
        frac = Math.max(0, Math.min(pos - 2.0, 0.999));
      } else {
        // Bottom rail moving LEFT (right to left)
        side = 'bottom';
        frac = Math.max(0, Math.min(1.0 - (pos - 3.0), 0.999));
      }

      const gridIdx = Math.max(0, Math.min(Math.floor(frac * this.gridSize), this.gridSize - 1));
      const lineKey = `${side}-${gridIdx}`;

      // Strictly peel only ONE row deep per line for this round:
      if (!shuttle.lapHits.has(lineKey)) {
        const exposed = this.getExposedPixelFromTrack(side, gridIdx);
        if (exposed && exposed.color === shuttle.color) {
          shuttle.lapHits.add(lineKey);
          this.vacuumPixelForShuttle(shuttle, exposed.row, exposed.col, side);
        }
      }

      // 3. Check if shuttle hit 0 quota mid-lap:
      if (shuttle.remaining <= 0) {
        window.pixelAudio.playShuttleFull();
        if (shuttle.el && shuttle.el.parentNode) shuttle.el.remove();
        this.inFlightShuttles.splice(i, 1);
        this.stagingBays[shuttle.stagingIdx] = null;
        this.renderStaging();
        this.checkWinCondition();
        continue;
      }

      // 4. Update shuttle DOM position on the track rail
      this.renderShuttlePosition(shuttle);
    }
    this.checkJamCondition();
  }

  vacuumPixelForShuttle(shuttle, row, col, side) {
    // 1. Clear cell in model
    this.grid[row][col] = null;
    shuttle.remaining--;

    // 2. Update boundary lookup tables O(1)
    this.updateBoundaryAfterRemoval(row, col);

    // 3. Update staging bay count in real time
    const bay = this.stagingBays[shuttle.stagingIdx];
    if (bay) {
      bay.remaining = shuttle.remaining;
    }

    // 4. Play gentle musical "doot"
    window.pixelAudio.playVacuumPop(shuttle.capacity - shuttle.remaining);

    // 5. Flash strictly straight (orthogonal) vacuum beam
    this.drawVacuumBeam(row, col, side, shuttle);

    // 6. Update rendering
    const cellW = this.dom.canvas.width / this.gridSize;
    const cellH = this.dom.canvas.height / this.gridSize;
    this.ctx.clearRect(col * cellW, row * cellH, cellW, cellH);
    this.renderStaging();
    this.renderStatusBar();
    this.checkWinCondition();
  }

  updateBoundaryAfterRemoval(row, col) {
    // Top boundary for this col
    if (this.topBounds[col] === row) {
      let nextR = -1;
      for (let r = row + 1; r < this.gridSize; r++) {
        if (this.grid[r][col] !== null) { nextR = r; break; }
      }
      this.topBounds[col] = nextR;
    }
    // Bottom boundary for this col
    if (this.bottomBounds[col] === row) {
      let nextR = -1;
      for (let r = row - 1; r >= 0; r--) {
        if (this.grid[r][col] !== null) { nextR = r; break; }
      }
      this.bottomBounds[col] = nextR;
    }
    // Left boundary for this row
    if (this.leftBounds[row] === col) {
      let nextC = -1;
      for (let c = col + 1; c < this.gridSize; c++) {
        if (this.grid[row][c] !== null) { nextC = c; break; }
      }
      this.leftBounds[row] = nextC;
    }
    // Right boundary for this row
    if (this.rightBounds[row] === col) {
      let nextC = -1;
      for (let c = col - 1; c >= 0; c--) {
        if (this.grid[row][c] !== null) { nextC = c; break; }
      }
      this.rightBounds[row] = nextC;
    }
  }

  drawVacuumBeam(row, col, side, shuttle) {
    if (!this.dom.vacuumBeamSvg || !this.dom.canvas || !shuttle || !shuttle.el) return;

    const stageRect = this.dom.orbitStage.getBoundingClientRect();
    const shuttleRect = shuttle.el.getBoundingClientRect();
    const canvasRect = this.dom.canvas.getBoundingClientRect();

    const cellW = canvasRect.width / this.gridSize;
    const cellH = canvasRect.height / this.gridSize;

    const targetX = canvasRect.left + (col + 0.5) * cellW - stageRect.left;
    const targetY = canvasRect.top + (row + 0.5) * cellH - stageRect.top;

    let startX = shuttleRect.left + shuttleRect.width / 2 - stageRect.left;
    let startY = shuttleRect.top + shuttleRect.height / 2 - stageRect.top;

    // Enforce strictly straight (orthogonal) line from shuttle rail into the pixel:
    if (side === 'top' || side === 'bottom') {
      startX = targetX; // strictly straight vertical line
    } else if (side === 'left' || side === 'right') {
      startY = targetY; // strictly straight horizontal line
    }

    const pal = this.palette[shuttle.color] || { hex: '#ec8d6f' };
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.innerHTML = `
      <line x1="${startX}" y1="${startY}" x2="${targetX}" y2="${targetY}" stroke="${pal.hex}" stroke-width="2" stroke-dasharray="3,3" opacity="0.9"/>
      <circle cx="${targetX}" cy="${targetY}" r="4" fill="${pal.hex}" opacity="0.8"/>
    `;
    this.dom.vacuumBeamSvg.appendChild(group);

    setTimeout(() => {
      if (group.parentNode) group.remove();
    }, 130);
  }

  checkWinCondition() {
    let remainingPixels = 0;
    for (let r = 0; r < this.gridSize; r++) {
      for (let c = 0; c < this.gridSize; c++) {
        if (this.grid[r][c] !== null) remainingPixels++;
      }
    }

    if (remainingPixels === 0) {
      setTimeout(() => {
        window.pixelAudio.playVictory();
        this.dom.winModal.classList.remove('hidden');
      }, 350);
    }
  }

  checkJamCondition() {
    const moving = this.inFlightShuttles.length > 0 || this.launchQueue.length > 0;
    const exposed = this.getCurrentlyExposedColors();
    const canRelaunch = this.stagingBays.some(b => b && b.remaining > 0 && exposed.has(b.color));
    const canTakeFromQueue = this.stagingBays.includes(null) && this.shuttleQueues.some(lane => lane.length > 0);
    const jammed = !moving && exposed.size > 0 && !canRelaunch && !canTakeFromQueue;

    this.dom.jamModal.classList.toggle('hidden', !jammed);
    this.dom.btnJamUndo.disabled = this.undoStack.length === 0;
    const canSwap = this.stagingBays.some(b => b && !b.inFlight && b.remaining > 0)
      && this.shuttleQueues.some(lane => lane.length > 0);
    this.dom.btnJamRescue.disabled = !canSwap;
  }

  /* --- 7. Undo Functionality --- */
  saveStateForUndo() {
    const snapshot = {
      grid: this.grid.map(row => [...row]),
      shuttleQueues: this.shuttleQueues.map(lane => lane.map(s => ({ ...s }))),
      stagingBays: this.stagingBays.map(bay => (bay ? { ...bay, inFlight: false } : null))
    };
    this.undoStack.push(snapshot);
    if (this.undoStack.length > 30) this.undoStack.shift();
    this.updateUndoButton();
  }

  undoMove() {
    if (this.undoStack.length === 0) return;

    // Clear all currently active in-flight shuttles
    if (this.inFlightShuttles) {
      this.inFlightShuttles.forEach(s => {
        if (s.el && s.el.parentNode) s.el.remove();
      });
    }
    this.inFlightShuttles = [];
    this.launchQueue = [];
    if (this.dom.shuttlesLayer) {
      this.dom.shuttlesLayer.innerHTML = '';
    }
    if (this.dom.vacuumBeamSvg) {
      this.dom.vacuumBeamSvg.innerHTML = '';
    }
    if (this.dom.jamModal) {
      this.dom.jamModal.classList.add('hidden');
    }

    const state = this.undoStack.pop();
    this.grid = state.grid.map(row => [...row]);
    this.shuttleQueues = state.shuttleQueues.map(lane => lane.map(s => ({ ...s })));
    this.stagingBays = state.stagingBays.map(bay => (bay ? { ...bay, inFlight: false } : null));

    this.initBoundaries();
    window.pixelAudio.playUndo();
    this.updateUndoButton();
    this.render();
  }

  updateUndoButton() {
    this.dom.btnUndo.disabled = this.undoStack.length === 0;
    this.dom.btnUndo.style.opacity = this.undoStack.length === 0 ? '0.5' : '1.0';
  }

  /* --- 8. Canvas Rendering & UI Updates --- */
  render() {
    this.renderGrid();
    this.renderStaging();
    this.renderQueues();
    this.renderStatusBar();
    this.updateUndoButton();
    this.checkJamCondition();
  }

  renderStatusBar() {
    let remainingPixels = 0;
    for (let r = 0; r < this.gridSize; r++) {
      for (let c = 0; c < this.gridSize; c++) {
        if (this.grid[r][c] !== null) remainingPixels++;
      }
    }
    this.dom.itemsLeft.textContent = remainingPixels;
  }

  renderGrid() {
    if (!this.ctx || !this.dom.canvas) return;

    const w = this.dom.canvas.width;
    const h = this.dom.canvas.height;
    this.ctx.clearRect(0, 0, w, h);

    const cellW = w / this.gridSize;
    const cellH = h / this.gridSize;
    this.ctx.strokeStyle = '#bec6ce';
    this.ctx.lineWidth = 0.5;

    for (let r = 0; r < this.gridSize; r++) {
      for (let c = 0; c < this.gridSize; c++) {
        const colorKey = this.grid[r][c];
        if (colorKey && this.palette[colorKey]) {
          this.ctx.fillStyle = this.palette[colorKey].hex;
          this.ctx.fillRect(c * cellW, r * cellH, cellW, cellH);
          this.ctx.strokeRect(c * cellW + 0.25, r * cellH + 0.25, cellW - 0.5, cellH - 0.5);
        }
      }
    }
  }

  renderShuttlePosition(shuttle) {
    if (!shuttle || !shuttle.el) return;

    const pos = shuttle.trackPos;
    const stageWidth = this.dom.orbitStage.clientWidth || 380;
    const stageHeight = this.dom.orbitStage.clientHeight || 380;
    const inset = 22;

    const minX = inset;
    const maxX = stageWidth - inset;
    const minY = inset;
    const maxY = stageHeight - inset;

    // Clockwise from bottom-left (pos = 0.0)
    let x, y;
    if (pos < 1.0) {
      // 1. LEFT rail: bottom-left (minX, maxY) moving UP to top-left (minX, minY)
      const f = pos;
      x = minX;
      y = maxY - f * (maxY - minY);
    } else if (pos < 2.0) {
      // 2. TOP rail: top-left (minX, minY) moving RIGHT to top-right (maxX, minY)
      const f = pos - 1.0;
      x = minX + f * (maxX - minX);
      y = minY;
    } else if (pos < 3.0) {
      // 3. RIGHT rail: top-right (maxX, minY) moving DOWN to bottom-right (maxX, maxY)
      const f = pos - 2.0;
      x = maxX;
      y = minY + f * (maxY - minY);
    } else {
      // 4. BOTTOM rail: bottom-right (maxX, maxY) moving LEFT to bottom-left (minX, maxY)
      const f = pos - 3.0;
      x = maxX - f * (maxX - minX);
      y = maxY;
    }

    shuttle.el.style.left = `${x}px`;
    shuttle.el.style.top = `${y}px`;

    const countEl = shuttle.el.querySelector('.orbit-shuttle-count');
    if (countEl) {
      countEl.textContent = shuttle.remaining;
    }
  }

  // Runs on every vacuumed pixel, so update the bays in place: rebuilding
  // them would swap the element out mid-tap and swallow the click.
  renderStaging() {
    const grid = this.dom.stagingBaysGrid;
    if (grid.children.length !== this.stagingBays.length) {
      grid.replaceChildren();
      this.stagingBays.forEach((_, bayIdx) => {
        const slot = document.createElement('div');
        slot.innerHTML = '<div class="slot-color-pip"></div><div class="slot-count-badge"></div>';
        slot.addEventListener('click', () => this.handleStagingClick(bayIdx));
        grid.appendChild(slot);
      });
    }
    const exposedColors = this.getCurrentlyExposedColors();

    this.stagingBays.forEach((shuttle, bayIdx) => {
      const slot = grid.children[bayIdx];
      const pip = slot.querySelector('.slot-color-pip');
      const badge = slot.querySelector('.slot-count-badge');

      slot.className = 'staging-slot';
      if (!shuttle) {
        slot.classList.add('empty');
        pip.hidden = true;
        badge.hidden = true;
        return;
      }

      slot.classList.add('occupied');
      if (shuttle.inFlight) {
        slot.classList.add('in-flight');
      } else if (shuttle.remaining > 0 && exposedColors.has(shuttle.color)) {
        slot.classList.add('ready-pulse');
      }

      const pal = this.palette[shuttle.color] || { hex: '#ec8d6f' };
      pip.hidden = false;
      badge.hidden = false;
      pip.style.backgroundColor = pal.hex;
      pip.style.borderColor = pal.border || '';
      badge.textContent = shuttle.remaining;
    });
  }

  renderQueues() {
    this.dom.queuesLanesGrid.innerHTML = '';

    this.shuttleQueues.forEach((lane, laneIdx) => {
      const laneEl = document.createElement('div');
      laneEl.className = 'queue-lane';

      lane.forEach((shuttle, cardIdx) => {
        const card = document.createElement('div');
        card.className = 'queue-card';

        const pal = this.palette[shuttle.color] || { hex: '#ec8d6f' };
        card.innerHTML = `
          <div class="card-color-dot" style="background-color: ${pal.hex}; border-color: ${pal.border};"></div>
          <div class="card-quota-num">${shuttle.remaining}</div>
        `;

        if (cardIdx === 0) {
          card.classList.add('head-card');
          card.addEventListener('click', () => this.handleQueueClick(laneIdx));
        } else {
          card.classList.add('waiting-card');
        }

        laneEl.appendChild(card);
      });

      this.dom.queuesLanesGrid.appendChild(laneEl);
    });
  }
}

// Boot game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.pixelGame = new PixelGame();
});
