/**
 * Ball Sort - ad-free colour sorting puzzle.
 */

class BallSortGame {
  constructor() {
    this.colorCount = parseInt(localStorage.getItem('bs_colorCount') || '4', 10);
    this.vialCapacity = parseInt(localStorage.getItem('bs_vialCapacity') || '4', 10);
    this.emptyVials = parseInt(localStorage.getItem('bs_emptyVials') || '2', 10);
    this.currentLevel = parseInt(localStorage.getItem('bs_currentLevel') || '1', 10);

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
      this.currentLevel++;
      this.saveProgress();
      this.startNewGame();
    });

    this.dom.btnSound.addEventListener('click', () => {
      const isMuted = window.soundManager.toggleMute();
      this.updateSoundIcons();
    });

    this.dom.btnSettings.addEventListener('click', () => {
      this.dom.colorSelect.value = this.colorCount;
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

      localStorage.setItem('bs_colorCount', this.colorCount);
      localStorage.setItem('bs_vialCapacity', this.vialCapacity);
      localStorage.setItem('bs_emptyVials', this.emptyVials);

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
    localStorage.setItem('bs_currentLevel', this.currentLevel);
  }

  /* --- Solvable Level Generation --- */

  generateSolvableLevel() {
    const K = this.vialCapacity;
    const N = this.colorCount;
    const E = this.emptyVials;

    // Try generating with fast BFS validation to guarantee a non-trivial, solvable level
    let attempts = 0;
    while (attempts < 100) {
      attempts++;
      const candidateVials = this.buildRandomBoard(N, K, E);
      const solution = this.solveBFS(candidateVials, K, 60); // max depth 60
      if (solution && solution.length >= Math.max(5, N * 2)) {
        return candidateVials;
      }
    }

    // Fallback: reverse-walk generation from solved state if BFS generator timed out
    return this.generateByReverseWalk(N, K, E);
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

  generateByReverseWalk(N, K, E) {
    const vials = [];
    for (let c = 1; c <= N; c++) {
      const tube = [];
      for (let i = 0; i < K; i++) tube.push(c);
      vials.push(tube);
    }
    for (let i = 0; i < E; i++) vials.push([]);

    const steps = N * K * 4;
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
    while (queue.length > 0 && nodes < 15000) {
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

  /* --- Render UI --- */

  render() {
    this.dom.grid.innerHTML = '';

    // Adjust tube height according to capacity
    const vialHeight = (this.vialCapacity * 54) + 36;

    this.vials.forEach((tube, idx) => {
      const vialEl = document.createElement('div');
      vialEl.className = 'vial';
      vialEl.style.height = `${vialHeight}px`;
      vialEl.dataset.index = idx;

      // Check if vial is complete
      const isComplete = tube.length === this.vialCapacity && tube.every(b => b === tube[0]);
      if (isComplete) {
        vialEl.classList.add('completed');
      }

      if (this.selectedVialIndex === idx) {
        vialEl.classList.add('selected');
      }

      // Render balls inside tube
      tube.forEach((colorId, ballIndex) => {
        const ballEl = document.createElement('div');
        ballEl.className = `ball ball-color-${colorId}`;
        ballEl.dataset.ballIndex = ballIndex;

        // If this tube is selected and this is the top ball, pop it up
        if (this.selectedVialIndex === idx && ballIndex === tube.length - 1) {
          ballEl.classList.add('popped-up');
        }

        vialEl.appendChild(ballEl);
      });

      vialEl.addEventListener('click', () => this.handleVialClick(idx));
      this.dom.grid.appendChild(vialEl);
    });
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
        const targetEl = this.dom.grid.children[index];
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

    const sourceVialEl = this.dom.grid.children[sourceIdx];
    const targetVialEl = this.dom.grid.children[targetIdx];

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
        const ballSize = sourceBallRect.width || 52;
        const ballStep = 54;
        const vialPadding = 8;
        const destLeft = targetVialRect.left + (targetVialRect.width - ballSize) / 2;
        const currentTargetCount = targetTube.length;
        const destTop = targetVialRect.bottom - vialPadding - ((currentTargetCount + 1) * ballStep) + 4;

        // Peak arc height above vials
        const minTop = Math.min(sourceVialRect.top, targetVialRect.top);
        const clearTop = minTop - 65;

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
