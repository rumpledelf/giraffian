/**
 * Ball Sort - ad-free colour sorting puzzle.
 */

class BallSortGame {
  constructor() {
    this.colorCount = parseInt(gameStorage.getItem('bs_colorCount') || '4', 10);
    this.vialCapacity = parseInt(gameStorage.getItem('bs_vialCapacity') || '4', 10);
    this.emptyVials = parseInt(gameStorage.getItem('bs_emptyVials') || '2', 10);
    this.currentLevel = parseInt(gameStorage.getItem('bs_currentLevel') || '1', 10);

    this.vials = []; // Array of arrays: vials[i] = [bottomBallColor, ..., topBallColor]
    this.selectedVialIndex = null;
    this.isAnimating = false;
    this.moveHistory = [];
    this.moveCount = 0;
    this.extraVialsAdded = 0;

    this.dom = {
      grid: document.getElementById('vials-grid'),
      levelIndicator: document.getElementById('level-indicator'),
      btnRestart: document.getElementById('btn-restart'),
      btnUndo: document.getElementById('btn-undo'),
      undoCount: document.getElementById('undo-count'),
      btnAddVial: document.getElementById('btn-add-vial'),
      btnNew: document.getElementById('btn-new'),
      btnSound: document.getElementById('btn-sound'),
      soundIconOn: document.getElementById('sound-icon-on'),
      soundIconOff: document.getElementById('sound-icon-off'),
      btnSettings: document.getElementById('btn-settings'),
      winModal: document.getElementById('win-modal'),
      winStats: document.getElementById('win-stats'),
      btnNextLevel: document.getElementById('btn-next-level'),
      vialsCompletedCount: document.getElementById('vials-completed-count'),
      movesCount: document.getElementById('moves-count'),
      settingsModal: document.getElementById('settings-modal'),
      btnApplySettings: document.getElementById('btn-apply-settings'),
      btnCloseSettings: document.getElementById('btn-close-settings'),
      colorSelect: document.getElementById('color-count-select'),
      capacitySelect: document.getElementById('vial-capacity-select'),
      emptySelect: document.getElementById('empty-vials-select'),
    };

    this.initEvents();
    this.updateSoundIcons();
    this.startNewGame();
  }

  initEvents() {
    this.dom.btnRestart.addEventListener('click', () => this.restartLevel());
    this.dom.btnUndo.addEventListener('click', () => this.undoMove());
    this.dom.btnAddVial.addEventListener('click', () => this.addExtraVial());
    this.dom.btnNew.addEventListener('click', () => {
      this.startNewGame();
    });

    this.dom.btnSound.addEventListener('click', () => {
      const isMuted = window.soundManager.toggleMute();
      this.updateSoundIcons();
    });

    let resizeTimer = null;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (this.vials && this.vials.length > 0 && !this.isAnimating) {
          this.render();
        }
      }, 100);
    });

    this.dom.btnSettings.addEventListener('click', () => {
      this.dom.colorSelect.value = Number(gameStorage.getItem('bs_colorCount')) || 4;
      this.dom.capacitySelect.value = this.vialCapacity;
      this.dom.emptySelect.value = this.emptyVials;
      this.dom.settingsModal.classList.remove('hidden');
    });

    this.dom.btnCloseSettings.addEventListener('click', () => {
      this.dom.settingsModal.classList.add('hidden');
    });

    this.dom.btnApplySettings.addEventListener('click', () => {
      this.colorCount = parseInt(this.dom.colorSelect.value, 10);
      this.vialCapacity = parseInt(this.dom.capacitySelect.value, 10);
      this.emptyVials = parseInt(this.dom.emptySelect.value, 10);

      gameStorage.setItem('bs_colorCount', this.colorCount);
      gameStorage.setItem('bs_vialCapacity', this.vialCapacity);
      gameStorage.setItem('bs_emptyVials', this.emptyVials);

      this.dom.settingsModal.classList.add('hidden');
      this.startNewGame();
    });

    this.dom.btnNextLevel.addEventListener('click', () => {
      this.dom.winModal.classList.add('hidden');
      this.currentLevel++;
      this.saveProgress();
      this.startNewGame();
    });

    // Dismiss modals on backdrop click
    this.dom.settingsModal.addEventListener('click', (e) => {
      if (e.target === this.dom.settingsModal) {
        this.dom.settingsModal.classList.add('hidden');
      }
    });
  }

  updateSoundIcons() {
    const muted = window.soundManager.isMuted();
    if (muted) {
      this.dom.soundIconOn.classList.add('hidden');
      this.dom.soundIconOff.classList.remove('hidden');
    } else {
      this.dom.soundIconOn.classList.remove('hidden');
      this.dom.soundIconOff.classList.add('hidden');
    }
  }

  saveProgress() {
    gameStorage.setItem('bs_currentLevel', this.currentLevel);
  }

  /* --- Solvable Level Generation --- */

  generateSolvableLevel() {
    const K = this.vialCapacity;
    const N = this.colorCount;
    const E = this.emptyVials;
    const level = this.currentLevel || 1;

    // Minimum solution depth scales with level (shorter puzzles on early levels, deeper on high levels)
    const minSolutionDepth = Math.min(50, Math.max(5, (N * 2) + Math.floor(level * 1.2)));

    // Try generating with fast BFS validation for smaller configurations
    let attempts = 0;
    const bfsAttempts = N <= 8 && K <= 5 ? 4 : 0;
    while (attempts < bfsAttempts) {
      attempts++;
      const candidateVials = this.buildRandomBoard(N, K, E);
      const solution = this.solveBFS(candidateVials, K, 65);
      if (solution && solution.length >= minSolutionDepth) {
        return candidateVials;
      }
    }

    // Reverse-walk generator from solved state with entropy scaling:
    // Early levels (1-3) leave gentle 2-ball runs for accessible opening moves.
    // High levels (10+) demand maximum color fragmentation (no matching neighbors).
    const maxPossibleSwitches = N * (K - 1);
    const targetEntropy = Math.min(0.96, 0.52 + (level - 1) * 0.045);
    const targetScore = Math.round(maxPossibleSwitches * targetEntropy);
    const scrambleMultiplier = Math.min(10, 3 + Math.floor(level * 0.6));

    let best = null, bestDiff = Infinity;
    for (let attempt = 0; attempt < 16; attempt++) {
      const board = this.generateByReverseWalk(N, K, E, scrambleMultiplier);
      const switches = board.reduce((sum, tube) => sum + tube.reduce((runs, color, i) =>
        runs + (i > 0 && color !== tube[i - 1] ? 1 : 0), 0), 0);

      // On high levels, we want maximum switches (high entropy)
      const diff = level >= 8 ? (maxPossibleSwitches - switches) : Math.abs(switches - targetScore);
      if (diff < bestDiff) {
        best = board;
        bestDiff = diff;
        if (diff <= 1) break;
      }
    }
    return best;
  }

  buildRandomBoard(N, K, E) {
    const balls = [];
    for (let c = 1; c <= N; c++) {
      for (let i = 0; i < K; i++) {
        balls.push(c);
      }
    }
    // Fisher-Yates shuffle
    for (let i = balls.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [balls[i], balls[j]] = [balls[j], balls[i]];
    }

    const vials = [];
    for (let i = 0; i < N; i++) {
      vials.push(balls.slice(i * K, (i + 1) * K));
    }
    for (let i = 0; i < E; i++) {
      vials.push([]);
    }
    return vials;
  }

  generateByReverseWalk(N, K, E, scrambleMultiplier = 4) {
    const vials = [];
    for (let c = 1; c <= N; c++) {
      const tube = [];
      for (let i = 0; i < K; i++) tube.push(c);
      vials.push(tube);
    }
    for (let i = 0; i < E; i++) vials.push([]);

    const steps = N * K * scrambleMultiplier;
    for (let s = 0; s < steps; s++) {
      // Every scramble step must undo as exactly one legal cascade move.
      // Leave the same colour exposed in the source (or leave it empty),
      // and put the ball above a different colour so the inverse moves one ball.
      const moves = [];
      vials.forEach((from, fromIdx) => {
        if (!from.length) return;
        const color = from[from.length - 1];
        if (from.length > 1 && from[from.length - 2] !== color) return;
        vials.forEach((to, toIdx) => {
          if (fromIdx === toIdx || to.length === K) return;
          if (to.length && to[to.length - 1] === color) return;
          if (from.length === 1 && to.length === 0) return;
          moves.push([fromIdx, toIdx]);
        });
      });
      if (!moves.length) break;
      const [fromIdx, toIdx] = moves[Math.floor(Math.random() * moves.length)];

      const ball = vials[fromIdx].pop();
      vials[toIdx].push(ball);
    }
    return vials;
  }

  // Canonical string for tube state pruning in BFS
  hashState(vials) {
    const tubeStrs = vials.map(v => v.join(','));
    tubeStrs.sort();
    return tubeStrs.join('|');
  }

  isStateWon(vials, capacity) {
    for (let v of vials) {
      if (v.length === 0) continue;
      if (v.length !== capacity) return false;
      const first = v[0];
      for (let b of v) {
        if (b !== first) return false;
      }
    }
    return true;
  }

  solveBFS(initialVials, capacity, maxDepth = 50) {
    const startVials = initialVials.map(v => [...v]);
    const queue = [{ vials: startVials, depth: 0, path: [] }];
    const visited = new Set();
    visited.add(this.hashState(startVials));

    let nodes = 0;
    const deadline = performance.now() + 80;
    while (queue.length > 0 && nodes < 15000) {
      if (performance.now() > deadline) return null;
      nodes++;
      const current = queue.shift();

      if (this.isStateWon(current.vials, capacity)) {
        return current.path;
      }

      if (current.depth >= maxDepth) continue;

      const numVials = current.vials.length;
      for (let i = 0; i < numVials; i++) {
        const fromTube = current.vials[i];
        if (fromTube.length === 0) continue;

        // Skip if tube is already complete
        if (fromTube.length === capacity && fromTube.every(b => b === fromTube[0])) {
          continue;
        }

        const topBall = fromTube[fromTube.length - 1];

        for (let j = 0; j < numVials; j++) {
          if (i === j) continue;
          const toTube = current.vials[j];

          // Valid ball sort move rule
          if (toTube.length < capacity && (toTube.length === 0 || toTube[toTube.length - 1] === topBall)) {
            // Prune redundant: moving a sole monochromatic tube into an empty tube
            if (toTube.length === 0 && fromTube.every(b => b === topBall)) {
              continue;
            }

            const nextVials = current.vials.map(v => [...v]);
            const movedBall = nextVials[i].pop();
            nextVials[j].push(movedBall);

            const hash = this.hashState(nextVials);
            if (!visited.has(hash)) {
              visited.add(hash);
              queue.push({
                vials: nextVials,
                depth: current.depth + 1,
                path: [...current.path, [i, j]],
              });
            }
          }
        }
      }
    }
    return null; // Not solved within limit
  }

  /* --- Game Flow --- */

  startNewGame() {
    const growth = gameStorage.getItem('sortingballs_grow') === 'false' ? 0 : Math.floor((this.currentLevel - 1) / 3);
    this.colorCount = Math.min(16, (Number(gameStorage.getItem('bs_colorCount')) || 4) + growth);
    this.boardVersion = (this.boardVersion || 0) + 1;
    this.isAnimating = false;
    this.dom.winModal.classList.add('hidden');
    this.selectedVialIndex = null;
    this.moveHistory = [];
    this.moveCount = 0;
    this.extraVialsAdded = 0;
    this.dom.btnAddVial.disabled = false;
    this.updateUndoButton();

    this.dom.levelIndicator.textContent = `Level ${this.currentLevel}`;
    this.vials = this.generateSolvableLevel();
    this.initialSnapshot = this.vials.map(v => [...v]);

    this.render();
  }

  restartLevel() {
    if (this.isAnimating) return;
    this.boardVersion++;
    this.selectedVialIndex = null;
    this.vials = this.initialSnapshot.map(v => [...v]);
    this.moveHistory = [];
    this.moveCount = 0;
    this.updateUndoButton();
    this.render();
  }

  addExtraVial() {
    if (this.isAnimating || this.extraVialsAdded >= 2) return;
    this.extraVialsAdded++;
    this.vials.push([]);
    this.initialSnapshot.push([]);
    if (this.extraVialsAdded >= 2) {
      this.dom.btnAddVial.disabled = true;
    }
    this.render();
  }

  /* --- Render UI & Viewport-Fitted Rows --- */

  getAvailableWidth() {
    const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
    const appEl = isBrowser ? (document.getElementById('game-app') || document.body) : null;
    return isBrowser && window.innerWidth
      ? Math.min(840, Math.max(240, (appEl?.clientWidth || window.innerWidth) - 24))
      : 640;
  }

  calculateRowDistribution(totalVials) {
    // Two balanced rows, or more when two rows of minimum-width tubes would overflow
    const minVialWidth = 28, minGap = 16; // Widest gap used for rows of 7–8
    const maxPerRow = Math.max(1, Math.floor((this.getAvailableWidth() + minGap) / (minVialWidth + minGap)));
    const rowCount = Math.max(2, Math.ceil(totalVials / maxPerRow));
    const perRow = Math.ceil(totalVials / rowCount);
    const rows = [];
    for (let left = totalVials; left > 0; left -= perRow) rows.push(Math.min(perRow, left));
    return rows;
  }

  calculateTubeDimensions(maxInRow, capacity, rowCount = 2) {
    const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
    const availableWidth = this.getAvailableWidth();

    const vh = isBrowser && window.innerHeight ? window.innerHeight : 720;
    // Estimated fixed UI overhead (header, instructions, status bar, toolbar, padding)
    const availableHeight = Math.max(260, vh - 220);
    const maxRowHeight = Math.floor((availableHeight - 20) / rowCount);

    // Ensure generous gap between vials so rims (which overhang by 3px on each side) never collide
    const gap = maxInRow >= 9 ? 14 : (maxInRow >= 7 ? 16 : 18);
    const widthFromHorizontal = Math.floor((availableWidth - (gap * (maxInRow - 1))) / maxInRow);

    // Headroom at top of tube so the top ball sits well below the rim
    const tubeHeadroom = 18;
    const maxBallStepFromVertical = Math.floor((maxRowHeight - tubeHeadroom - 12) / capacity);
    const widthFromVertical = (maxBallStepFromVertical - 3) + 12;

    // Constrain width so it never overflows horizontally OR vertically
    const vialWidth = Math.max(28, Math.min(54, widthFromHorizontal, widthFromVertical));
    const vialPadding = Math.max(3, Math.min(5, Math.round(vialWidth * 0.1)));
    const ballSize = vialWidth - (vialPadding * 2);
    const ballStep = ballSize + 3;
    const vialHeight = (capacity * ballStep) + (vialPadding * 2) + tubeHeadroom;
    const rowGap = Math.max(14, Math.min(24, Math.round(ballSize * 0.5)));

    this.lastBallSize = ballSize;
    this.lastVialPadding = vialPadding;
    this.lastBallStep = ballStep;

    return { ballSize, vialWidth, vialPadding, vialHeight, vialGap: gap, rowGap };
  }

  updateStats() {
    if (this.dom.movesCount) {
      this.dom.movesCount.textContent = this.moveCount;
    }
    if (this.dom.vialsCompletedCount) {
      const completed = this.vials.filter(v => v.length === this.vialCapacity && v.every(b => b === v[0])).length;
      this.dom.vialsCompletedCount.textContent = `${completed} / ${this.colorCount}`;
    }
  }

  render() {
    this.dom.grid.innerHTML = '';
    const totalVials = this.vials.length;
    if (totalVials === 0) return;

    const rowCounts = this.calculateRowDistribution(totalVials);
    const maxInRow = Math.max(...rowCounts);
    const dims = this.calculateTubeDimensions(maxInRow, this.vialCapacity, rowCounts.length);

    this.dom.grid.style.setProperty('--ball-size', `${dims.ballSize}px`);
    this.dom.grid.style.setProperty('--vial-width', `${dims.vialWidth}px`);
    this.dom.grid.style.setProperty('--vial-padding', `${dims.vialPadding}px`);
    this.dom.grid.style.setProperty('--vial-gap', `${dims.vialGap}px`);
    this.dom.grid.style.setProperty('--row-gap', `${dims.rowGap}px`);

    let vialIdx = 0;
    rowCounts.forEach(countInRow => {
      const rowEl = document.createElement('div');
      rowEl.className = 'vials-row';
      rowEl.style.gap = `${dims.vialGap}px`;

      for (let r = 0; r < countInRow && vialIdx < totalVials; r++) {
        const idx = vialIdx++;
        const tube = this.vials[idx];
        const vialEl = document.createElement('div');
        vialEl.className = 'vial';
        vialEl.style.height = `${dims.vialHeight}px`;
        vialEl.style.width = `${dims.vialWidth}px`;
        vialEl.dataset.index = idx;

        const isComplete = tube.length === this.vialCapacity && tube.every(b => b === tube[0]);
        if (isComplete) vialEl.classList.add('completed');
        if (this.selectedVialIndex === idx) vialEl.classList.add('selected');

        tube.forEach((colorId, ballIndex) => {
          const ballEl = document.createElement('div');
          ballEl.className = `ball ball-color-${colorId}`;
          ballEl.dataset.ballIndex = ballIndex;

          if (this.selectedVialIndex === idx && ballIndex === tube.length - 1) {
            ballEl.classList.add('popped-up');
          }
          vialEl.appendChild(ballEl);
        });

        vialEl.addEventListener('click', () => this.handleVialClick(idx));
        rowEl.appendChild(vialEl);
      }

      this.dom.grid.appendChild(rowEl);
    });

    this.updateStats();
  }

  getVialElement(idx) {
    return this.dom.grid.querySelector(`.vial[data-index="${idx}"]`);
  }

  /* --- Interaction --- */

  handleVialClick(index) {
    if (this.isAnimating) return;

    if (this.selectedVialIndex === null) {
      // Pick source vial
      const sourceTube = this.vials[index];
      if (sourceTube.length === 0) {
        return; // Can't select empty tube
      }

      // If tube is already fully sorted, skip unless user really wants to
      if (sourceTube.length === this.vialCapacity && sourceTube.every(b => b === sourceTube[0])) {
        // Already done, no need to touch
        return;
      }

      this.selectedVialIndex = index;
      window.soundManager.playPop();
      this.render();
    } else {
      // Destination clicked
      const sourceIndex = this.selectedVialIndex;

      if (sourceIndex === index) {
        // Deselect
        this.selectedVialIndex = null;
        this.render();
        return;
      }

      const sourceTube = this.vials[sourceIndex];
      const targetTube = this.vials[index];

      // Check if move is legal
      const movingBall = sourceTube[sourceTube.length - 1];
      const canMove = targetTube.length < this.vialCapacity && 
        (targetTube.length === 0 || targetTube[targetTube.length - 1] === movingBall);

      if (!canMove) {
        // Invalid target
        window.soundManager.playInvalid();
        const targetEl = this.getVialElement(index);
        if (targetEl) {
          targetEl.classList.add('invalid-shake');
          setTimeout(() => targetEl.classList.remove('invalid-shake'), 350);
        }
        // If clicking another tube with balls, switch selection smoothly!
        if (targetTube.length > 0) {
          this.selectedVialIndex = index;
          window.soundManager.playPop();
          this.render();
        } else {
          this.selectedVialIndex = null;
          this.render();
        }
        return;
      }

      // Calculate how many matching balls we can cascade move
      let countToMove = 0;
      for (let i = sourceTube.length - 1; i >= 0; i--) {
        if (sourceTube[i] === movingBall && (targetTube.length + countToMove) < this.vialCapacity) {
          countToMove++;
        } else {
          break;
        }
      }

      this.executeCascadeMove(sourceIndex, index, countToMove);
    }
  }

  async executeCascadeMove(sourceIdx, targetIdx, count) {
    const boardVersion = this.boardVersion;
    this.isAnimating = true;
    this.selectedVialIndex = null;

    const sourceTube = this.vials[sourceIdx];
    const targetTube = this.vials[targetIdx];
    const movesInBatch = [];

    const sourceVialEl = this.getVialElement(sourceIdx);
    const targetVialEl = this.getVialElement(targetIdx);

    if (sourceVialEl) {
      sourceVialEl.classList.remove('selected');
    }

    for (let c = 0; c < count; c++) {
      const ballColor = sourceTube[sourceTube.length - 1];
      const sourceBallEl = sourceVialEl ? sourceVialEl.lastElementChild : null;

      if (sourceBallEl && sourceVialEl && targetVialEl) {
        const sourceBallRect = sourceBallEl.getBoundingClientRect();
        const sourceVialRect = sourceVialEl.getBoundingClientRect();
        const targetVialRect = targetVialEl.getBoundingClientRect();

        // Create the flying ball clone
        const flyer = document.createElement('div');
        flyer.className = `ball ball-color-${ballColor} flying-ball`;
        flyer.style.position = 'fixed';
        flyer.style.left = `${sourceBallRect.left}px`;
        flyer.style.top = `${sourceBallRect.top}px`;
        flyer.style.width = `${sourceBallRect.width}px`;
        flyer.style.height = `${sourceBallRect.height}px`;
        flyer.style.margin = '0';
        flyer.style.zIndex = '9999';
        flyer.style.pointerEvents = 'none';
        document.body.appendChild(flyer);

        // Remove source ball from data and DOM
        sourceTube.pop();
        sourceBallEl.remove();

        // If another ball of this color will move in this cascade, pop it up next!
        if (c + 1 < count && sourceVialEl.lastElementChild) {
          sourceVialEl.lastElementChild.classList.add('popped-up');
        }

        // Target coordinates in destination vial
        const ballSize = sourceBallRect.width || this.lastBallSize || 36;
        const vialPadding = this.lastVialPadding || 6;
        const ballStep = this.lastBallStep || (ballSize + 3);
        const destLeft = targetVialRect.left + (targetVialRect.width - ballSize) / 2;
        const currentTargetCount = targetTube.length;
        const destTop = targetVialRect.bottom - vialPadding - ((currentTargetCount + 1) * ballStep) + 3;

        // Peak arc height above vials
        const minTop = Math.min(sourceVialRect.top, targetVialRect.top);
        const clearTop = minTop - Math.max(35, ballSize * 1.25);

        const deltaX = destLeft - sourceBallRect.left;
        const deltaY_clear = clearTop - sourceBallRect.top;
        const deltaY_dest = destTop - sourceBallRect.top;

        // Three-phase smooth flight:
        // 1. Lift up out of tube
        // 2. Glide across above tubes
        // 3. Drop down into target tube slot
        const anim = flyer.animate([
          { transform: 'translate3d(0, 0, 0)', offset: 0, easing: 'cubic-bezier(0.2, 0.8, 0.4, 1)' },
          { transform: `translate3d(0, ${deltaY_clear}px, 0)`, offset: 0.32, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' },
          { transform: `translate3d(${deltaX}px, ${deltaY_clear}px, 0)`, offset: 0.68, easing: 'cubic-bezier(0.4, 0, 0.8, 1)' },
          { transform: `translate3d(${deltaX}px, ${deltaY_dest}px, 0)`, offset: 1.0 }
        ], {
          duration: 380,
          fill: 'forwards'
        });

        await anim.finished;
        flyer.remove();
        if (boardVersion !== this.boardVersion) return;

        // Land in target vial
        targetTube.push(ballColor);
        movesInBatch.push({ from: sourceIdx, to: targetIdx, color: ballColor });

        const landedBall = document.createElement('div');
        landedBall.className = `ball ball-color-${ballColor}`;
        landedBall.dataset.ballIndex = targetTube.length - 1;
        targetVialEl.appendChild(landedBall);

        // Satisfying landing sound and squish
        window.soundManager.playDrop();
        landedBall.animate([
          { transform: 'scale(1.18, 0.82)' },
          { transform: 'scale(0.96, 1.04)' },
          { transform: 'scale(1, 1)' }
        ], { duration: 180, easing: 'ease-out' });

        // Brief cadence pause between cascade balls
        if (c + 1 < count) {
          await this.sleep(70);
          if (boardVersion !== this.boardVersion) return;
        }
      } else {
        // Fallback if elements not found
        const ball = sourceTube.pop();
        targetTube.push(ball);
        movesInBatch.push({ from: sourceIdx, to: targetIdx, color: ball });
        window.soundManager.playDrop();
      }
    }

    this.moveHistory.push(movesInBatch);
    this.moveCount++;
    this.updateUndoButton();

    // Check if target tube is now complete
    if (targetTube.length === this.vialCapacity && targetTube.every(b => b === targetTube[0])) {
      targetVialEl.classList.add('completed');
      window.soundManager.playVialComplete();
    }

    this.isAnimating = false;
    this.render();

    // Check win condition
    if (this.isStateWon(this.vials, this.vialCapacity)) {
      setTimeout(() => {
        if (boardVersion === this.boardVersion && this.isStateWon(this.vials, this.vialCapacity)) {
          this.handleWin();
        }
      }, 300);
    }
  }

  undoMove() {
    if (this.isAnimating || this.moveHistory.length === 0) return;

    this.selectedVialIndex = null;
    const lastBatch = this.moveHistory.pop();

    // Reverse the batch moves
    for (let i = lastBatch.length - 1; i >= 0; i--) {
      const step = lastBatch[i];
      const ball = this.vials[step.to].pop();
      this.vials[step.from].push(ball);
    }

    window.soundManager.playDrop();
    this.updateUndoButton();
    this.render();
  }

  updateUndoButton() {
    this.dom.undoCount.textContent = this.moveHistory.length;
    this.dom.btnUndo.disabled = this.moveHistory.length === 0;
  }

  handleWin() {
    window.soundManager.playWin();
    this.dom.winStats.innerHTML = `
      <div><strong>${this.moveCount}</strong>Moves</div>
    `;
    this.dom.winModal.classList.remove('hidden');
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Start the game when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  window.game = new BallSortGame();
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
    const grow = document.getElementById('grow-difficulty');
    grow.checked = gameStorage.getItem(options.id + '_grow') !== 'false';
    document.getElementById('btn-settings').addEventListener('click', () => { grow.checked = gameStorage.getItem(options.id + '_grow') !== 'false'; });
    document.getElementById('btn-apply-settings').addEventListener('click', () => {
      try { localStorage.setItem(options.id + '_grow', String(grow.checked)); } catch (error) { this.status('Browser saving is unavailable.'); }
    }, true);
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
  const game = window.game;
  game.checkpoint = new BrowserCheckpoint(game, {
    id: 'sortingballs', levelKey: 'bs_currentLevel',
    fields: 'currentLevel colorCount vialCapacity emptyVials vials initialSnapshot moveHistory moveCount extraVialsAdded',
    actions: 'startNewGame restartLevel addExtraVial executeCascadeMove undoMove',
    validate: s => s.currentLevel >= 1 && [3,4,5,6,7,8].includes(s.vialCapacity) && s.vials.length >= 4 && s.vials.every(v => Array.isArray(v) && v.length <= s.vialCapacity && v.every(c => Number.isInteger(c) && c >= 1 && c <= 16)),
    resume: g => { g.render(); g.updateUndoButton(); g.dom.levelIndicator.textContent = `Level ${g.currentLevel}`; g.dom.btnAddVial.disabled = g.extraVialsAdded >= 2; if (g.isStateWon(g.vials, g.vialCapacity)) g.handleWin(); },
  });
});
