/**
 * Tap Out - Main Game Engine
 * Features:
 * - 2 Piece Modes: Squares (1x1), Cars & Planks (1x2, 1x3, 1x4)
 * - Configurable N x N grid (4x4, 6x6, 8x8, 10x10, 12x12)
 * - Solvable boards constructed by carving pieces in a legal exit order
 * - Unlimited Undo, Hint System, Procedural Web Audio API
 */

class TapOutGame {
  constructor() {
    this.audio = new window.TapOutAudio();
    const urlParams = new URLSearchParams(window.location.search);
    this.gridSize = parseInt(urlParams.get('size') || gameStorage.getItem('tapout_grid_size') || '6', 10);
    const requestedMode = urlParams.get('mode') || gameStorage.getItem('tapout_shape_mode') || 'rectangles';
    this.shapeMode = requestedMode === 'squares' ? 'squares' : 'rectangles';
    if (requestedMode === 'corners') gameStorage.setItem('tapout_shape_mode', 'rectangles');
    this.level = parseInt(gameStorage.getItem('tapout_level') || '1', 10);
    this.grid = []; // gridSize x gridSize, holds pieceId or null
    this.pieces = new Map(); // pieceId -> { id, cells: [{r, c}], dir: 'up'|'down'|'left'|'right', color: string }
    this.undoStack = [];
    this.moveCount = 0;
    this.isAnimating = false;
    this.boardVersion = 0;
    this.winTimer = null;
    this.colors = ['#82dee6', '#f7e55f', '#ec8d6f', '#589a56', '#dcb0ed', '#3a7ede'];

    this.dom = {
      app: document.getElementById('game-app'),
      gridContainer: document.getElementById('tapout-grid'),
      blocksRemaining: document.getElementById('blocks-remaining-count'),
      movesCount: document.getElementById('moves-count'),
      levelBadge: document.getElementById('level-badge'),
      btnSound: document.getElementById('btn-sound'),
      soundOnIcon: document.getElementById('sound-icon-on'),
      soundOffIcon: document.getElementById('sound-icon-off'),
      btnSettings: document.getElementById('btn-settings'),
      settingsModal: document.getElementById('settings-modal'),
      sizeSelect: document.getElementById('size-select'),
      shapeSelect: document.getElementById('shape-select'),
      btnCloseSettings: document.getElementById('btn-close-settings'),
      btnApplySettings: document.getElementById('btn-apply-settings'),
      btnRestart: document.getElementById('btn-restart'),
      btnUndo: document.getElementById('btn-undo'),
      btnHint: document.getElementById('btn-hint'),
      btnNew: document.getElementById('btn-new'),
      winModal: document.getElementById('win-modal'),
      winStats: document.getElementById('win-stats'),
      btnNextLevel: document.getElementById('btn-next-level'),
    };

    this.init();
  }

  init() {
    this.updateSoundIcons();
    this.bindEvents();
    this.newGame();
  }

  updateSoundIcons() {
    const muted = this.audio.isMuted();
    if (this.dom.soundOnIcon && this.dom.soundOffIcon) {
      this.dom.soundOnIcon.classList.toggle('hidden', muted);
      this.dom.soundOffIcon.classList.toggle('hidden', !muted);
    }
  }

  bindEvents() {
    window.addEventListener('resize', () => this.renderBoard());
    // Sound
    this.dom.btnSound.addEventListener('click', () => {
      const muted = this.audio.toggleMute();
      this.updateSoundIcons();
    });

    // Settings
    this.dom.btnSettings.addEventListener('click', () => {
      this.dom.sizeSelect.value = gameStorage.getItem('tapout_grid_size') || '6';
      if (this.dom.shapeSelect) {
        this.dom.shapeSelect.value = this.shapeMode;
      }
      this.dom.settingsModal.classList.remove('hidden');
    });

    this.dom.btnCloseSettings.addEventListener('click', () => {
      this.dom.settingsModal.classList.add('hidden');
    });

    this.dom.settingsModal.addEventListener('click', (e) => {
      if (e.target === this.dom.settingsModal) {
        this.dom.settingsModal.classList.add('hidden');
      }
    });

    this.dom.btnApplySettings.addEventListener('click', () => {
      this.gridSize = parseInt(this.dom.sizeSelect.value, 10);
      if (this.dom.shapeSelect) {
        this.shapeMode = this.dom.shapeSelect.value;
      }
      gameStorage.setItem('tapout_grid_size', String(this.gridSize));
      gameStorage.setItem('tapout_shape_mode', this.shapeMode);
      this.dom.settingsModal.classList.add('hidden');
      this.newGame();
    });

    // Toolbar
    this.dom.btnRestart.addEventListener('click', () => this.restartGame());
    this.dom.btnUndo.addEventListener('click', () => this.undoMove());
    this.dom.btnHint.addEventListener('click', () => this.giveHint());
    this.dom.btnNew.addEventListener('click', () => {
      this.newGame();
    });

    this.dom.btnNextLevel.addEventListener('click', () => {
      this.dom.winModal.classList.add('hidden');
      this.level++;
      gameStorage.setItem('tapout_level', String(this.level));
      this.newGame();
    });

    // Keyboard shortcuts (Escape, U, H, R)
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.dom.settingsModal.classList.add('hidden');
        this.dom.winModal.classList.add('hidden');
      } else if (e.key === 'u' || e.key === 'U') {
        this.undoMove();
      } else if (e.key === 'h' || e.key === 'H') {
        this.giveHint();
      } else if (e.key === 'r' || e.key === 'R') {
        this.restartGame();
      }
    });
  }

  /**
   * Procedural Puzzle Generator Supporting:
   * 1. 'squares': 1x1 tiles
   * 2. 'rectangles': 1x1, 1x2, 1x3, 1x4 cars / planks
   */
  generatePuzzle(size, mode) {
    const dirs = ['up', 'down', 'left', 'right'];
    const grid = Array.from({ length: size }, () => Array(size).fill(null));
    const remaining = Array.from({ length: size }, () => Array(size).fill(true));
    const pieces = new Map();
    let emptyCount = size * size;

    const shuffle = values => {
      const result = [...values];
      for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
      }
      return result;
    };

    const countParallelNeighbors = (cells, dir) => {
      let count = 0;
      const isHoriz = dir === 'left' || dir === 'right';
      for (const pt of cells) {
        const neighbors = isHoriz
          ? [{ r: pt.r - 1, c: pt.c }, { r: pt.r + 1, c: pt.c }]
          : [{ r: pt.r, c: pt.c - 1 }, { r: pt.r, c: pt.c + 1 }];
        for (const n of neighbors) {
          if (n.r >= 0 && n.r < size && n.c >= 0 && n.c < size && grid[n.r][n.c] !== null) {
            const np = pieces.get(grid[n.r][n.c]);
            if (np && np.dir === dir) count++;
          }
        }
      }
      return count;
    };

    // Carve pieces from exposed edges of a full board. Each piece can leave
    // when it is carved, so the insertion order is also a complete solution.
    let maxLoops = 3000;
    while (emptyCount > 0 && maxLoops-- > 0) {
      const exposed = new Map();
      const add = (r, c) => exposed.set(`${r},${c}`, { r, c });
      for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
          if (remaining[i][j] !== null) { add(i, j); break; }
        }
        for (let j = size - 1; j >= 0; j--) {
          if (remaining[i][j] !== null) { add(i, j); break; }
        }
        for (let j = 0; j < size; j++) {
          if (remaining[j][i] !== null) { add(j, i); break; }
        }
        for (let j = size - 1; j >= 0; j--) {
          if (remaining[j][i] !== null) { add(j, i); break; }
        }
      }

      const exposedCells = shuffle(exposed.values());

      const findCandidate = (templates) => {
        let best = null;
        let minPenalty = 999;
        for (const cell of exposedCells) {
          for (const template of templates) {
            for (const anchor of shuffle(template)) {
              const cells = template.map(offset => ({
                r: cell.r + offset.r - anchor.r,
                c: cell.c + offset.c - anchor.c
              }));
              if (!cells.every(pt => pt.r >= 0 && pt.r < size && pt.c >= 0 && pt.c < size && remaining[pt.r][pt.c] !== null)) continue;
              const validDirs = dirs.filter(d => this.isReversePieceClear(remaining, size, cells, d));
              const alignedDirs = this.getAlignedValidDirs(template, validDirs);
              if (!alignedDirs.length) continue;

              for (const dir of shuffle(alignedDirs)) {
                const penalty = countParallelNeighbors(cells, dir);
                if (penalty < minPenalty) {
                  minPenalty = penalty;
                  best = { cells, dir };
                  if (minPenalty === 0) return best;
                }
              }
            }
          }
        }
        return best;
      };

      let bestCandidate = null;
      if (mode === 'rectangles') {
        const templatesByLen = {
          4: [
            [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 }, { r: 0, c: 3 }],
            [{ r: 0, c: 0 }, { r: 1, c: 0 }, { r: 2, c: 0 }, { r: 3, c: 0 }]
          ],
          3: [
            [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 }],
            [{ r: 0, c: 0 }, { r: 1, c: 0 }, { r: 2, c: 0 }]
          ],
          2: [
            [{ r: 0, c: 0 }, { r: 0, c: 1 }],
            [{ r: 0, c: 0 }, { r: 1, c: 0 }]
          ],
          1: [
            [{ r: 0, c: 0 }]
          ]
        };
        // Natural distribution: mostly 1x2 cars (~60%), some 1x3 trucks (~30%), occasional 1x4 bus (~10%)
        const rand = Math.random();
        const order = rand < 0.60 ? [2, 3, 4] : (rand < 0.90 ? [3, 2, 4] : [4, 2, 3]);
        const multiTemplates = [];
        for (const len of order) {
          multiTemplates.push(...shuffle(templatesByLen[len]));
        }

        bestCandidate = findCandidate(multiTemplates);
        // Fall back to 1x1 singles only if no multi-cell car/plank fits
        if (!bestCandidate) {
          bestCandidate = findCandidate(templatesByLen[1]);
        }
      } else {
        // 'squares' mode: single 1x1 tiles with anti-clustering direction scoring
        bestCandidate = findCandidate([[{ r: 0, c: 0 }]]);
      }

      if (bestCandidate) {
        const id = pieces.size + 1;
        const { cells, dir } = bestCandidate;
        pieces.set(id, {
          id, cells, dir,
          color: this.colors[id % this.colors.length]
        });
        cells.forEach(pt => {
          grid[pt.r][pt.c] = id;
          remaining[pt.r][pt.c] = null;
        });
        emptyCount -= cells.length;
      } else {
        break;
      }
    }
    return { grid, pieces };
  }

  getAlignedValidDirs(template, validDirs) {
    // Planks and cars MUST move lengthways along their longitudinal axis
    const isHorizontal = template.length > 1 && template.every(pt => pt.r === template[0].r);
    const isVertical = template.length > 1 && template.every(pt => pt.c === template[0].c);

    if (isHorizontal) {
      return validDirs.filter(d => d === 'left' || d === 'right');
    }
    if (isVertical) {
      return validDirs.filter(d => d === 'up' || d === 'down');
    }
    // Single blocks can move in any valid direction
    return validDirs;
  }

  isReversePieceClear(grid, size, cells, dir) {
    let dr = 0, dc = 0;
    if (dir === 'up') dr = -1;
    else if (dir === 'down') dr = 1;
    else if (dir === 'left') dc = -1;
    else if (dir === 'right') dc = 1;

    const cellSet = new Set(cells.map(pt => `${pt.r},${pt.c}`));

    for (const pt of cells) {
      let currR = pt.r + dr;
      let currC = pt.c + dc;
      while (currR >= 0 && currR < size && currC >= 0 && currC < size) {
        if (!cellSet.has(`${currR},${currC}`) && grid[currR][currC] !== null) {
          return false;
        }
        currR += dr;
        currC += dc;
      }
    }
    return true;
  }

  verifySolvability(initialGrid, piecesMap, size) {
    const simGrid = initialGrid.map(row => [...row]);
    const remainingPieces = new Set(piecesMap.keys());
    let progress = true;

    while (progress && remainingPieces.size > 0) {
      progress = false;
      for (const pieceId of remainingPieces) {
        const piece = piecesMap.get(pieceId);
        if (this.isForwardPieceClear(simGrid, size, piece)) {
          // Clear piece
          piece.cells.forEach(pt => { simGrid[pt.r][pt.c] = null; });
          remainingPieces.delete(pieceId);
          progress = true;
          break;
        }
      }
    }

    return remainingPieces.size === 0;
  }

  newGame() {
    const growth = gameStorage.getItem('tapout_grow') === 'false' ? 0 : Math.floor((this.level - 1) / 3);
    this.gridSize = Math.min(12, (Number(new URLSearchParams(location.search).get('size') || gameStorage.getItem('tapout_grid_size')) || 6) + growth * 2);
    this.boardVersion++;
    this.isAnimating = false;
    this.cancelPendingWin();
    this.dom.winModal.classList.add('hidden');
    this.undoStack = [];
    this.moveCount = 0;

    const modeLabels = {
      squares: 'Squares',
      rectangles: 'Cars & Planks'
    };
    const modeLabel = modeLabels[this.shapeMode] || 'Classic';
    this.dom.levelBadge.textContent = `Level ${this.level}: ${this.gridSize}×${this.gridSize} (${modeLabel})`;

    const { grid, pieces } = this.generatePuzzle(this.gridSize, this.shapeMode);
    this.grid = grid;
    this.pieces = pieces;

    // Save initial state for Restart
    this.initialGridState = this.grid.map(row => [...row]);
    this.initialPiecesState = new Map();
    for (const [id, p] of this.pieces.entries()) {
      this.initialPiecesState.set(id, {
        id: p.id,
        cells: p.cells.map(c => ({ ...c })),
        dir: p.dir,
        color: p.color
      });
    }

    this.renderBoard();
    this.updateStats();
  }

  restartGame() {
    this.boardVersion++;
    this.isAnimating = false;
    this.cancelPendingWin();
    this.dom.winModal.classList.add('hidden');
    this.undoStack = [];
    this.moveCount = 0;

    this.grid = this.initialGridState.map(row => [...row]);
    this.pieces = new Map();
    for (const [id, p] of this.initialPiecesState.entries()) {
      this.pieces.set(id, {
        id: p.id,
        cells: p.cells.map(c => ({ ...c })),
        dir: p.dir,
        color: p.color
      });
    }

    this.renderBoard();
    this.updateStats();
  }

  renderBoard() {
    const container = this.dom.gridContainer;
    container.innerHTML = '';

    const size = this.gridSize;
    container.style.gridTemplateColumns = `repeat(${size}, minmax(0, 1fr))`;
    container.style.gridTemplateRows = `repeat(${size}, minmax(0, 1fr))`;

    // Calculate dimensions
    const frame = container.parentElement;
    const style = getComputedStyle(frame);
    const inset = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight)
      + parseFloat(style.borderLeftWidth) + parseFloat(style.borderRightWidth);
    const maxWidth = Math.min(frame.parentElement.clientWidth - inset, 540);
    const gap = parseFloat(getComputedStyle(container).columnGap);
    const cellSize = Math.floor((maxWidth - gap * (size - 1)) / size);
    const boardSize = cellSize * size + gap * (size - 1);
    container.style.width = `${boardSize}px`;
    container.style.height = `${boardSize}px`;
    container.style.setProperty('--arrow-size', `${Math.min(26, cellSize * 0.55)}px`);

    // Render each piece's cells
    for (const piece of this.pieces.values()) {
      this.renderPiece(piece);
    }
  }

  renderPiece(piece) {
    const container = this.dom.gridContainer;

    const minR = Math.min(...piece.cells.map(p => p.r));
    const maxR = Math.max(...piece.cells.map(p => p.r));
    const minC = Math.min(...piece.cells.map(p => p.c));
    const maxC = Math.max(...piece.cells.map(p => p.c));
    const spanR = maxR - minR + 1;
    const spanC = maxC - minC + 1;
    // A straight block spanning one to four cells
    const el = document.createElement('div');
    el.id = `piece-${piece.id}`;
    el.className = `tap-block piece-${piece.id}`;
    el.style.gridRow = `${minR + 1} / span ${spanR}`;
    el.style.gridColumn = `${minC + 1} / span ${spanC}`;
    el.style.backgroundColor = piece.color;
    el.dataset.pieceId = piece.id;

    el.innerHTML = this.getArrowSvg(piece.dir);
    this.positionArrow(el, piece, minR, minC);

    el.addEventListener('click', (e) => {
      e.stopPropagation();
      this.handlePieceTap(piece.id);
    });

    container.appendChild(el);
  }

  positionArrow(el, piece, minR, minC) {
    const leading = piece.cells.reduce((a, b) => {
      if (piece.dir === 'right') return b.c > a.c ? b : a;
      if (piece.dir === 'left') return b.c < a.c ? b : a;
      if (piece.dir === 'down') return b.r > a.r ? b : a;
      return b.r < a.r ? b : a;
    });
    const container = this.dom.gridContainer;
    const gap = parseFloat(getComputedStyle(container).columnGap);
    const cellSize = (container.clientWidth - gap * (this.gridSize - 1)) / this.gridSize;
    const border = el.classList.contains('tap-block') ? 2 : 0;
    el.style.setProperty('--arrow-x', `${(leading.c - minC) * (cellSize + gap) + cellSize / 2 - border}px`);
    el.style.setProperty('--arrow-y', `${(leading.r - minR) * (cellSize + gap) + cellSize / 2 - border}px`);
  }

  getArrowSvg(dir) {
    let rotation = 0;
    if (dir === 'right') rotation = 90;
    else if (dir === 'down') rotation = 180;
    else if (dir === 'left') rotation = 270;

    return `
      <svg class="block-arrow" viewBox="0 0 24 24" style="transform: translate(-50%, -50%) rotate(${rotation}deg);">
        <path d="M12 4L12 20M12 4L6 10M12 4L18 10" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
      </svg>
    `;
  }

  handlePieceTap(pieceId) {
    if (this.isAnimating) return;
    const piece = this.pieces.get(pieceId);
    if (!piece) return;

    const size = this.gridSize;
    const isClear = this.isForwardPieceClear(this.grid, size, piece);

    if (!isClear) {
      // Blocked: soft bonk and bump
      this.animateBonkPiece(piece);
      return;
    }

    // Unblocked: Fly off screen!
    this.audio.playFlyOut();
    this.moveCount++;
    this.undoStack.push({
      piece: {
        id: piece.id,
        cells: piece.cells.map(c => ({ ...c })),
        dir: piece.dir,
        color: piece.color
      }
    });

    // Remove from grid matrix immediately
    piece.cells.forEach(pt => { this.grid[pt.r][pt.c] = null; });
    this.pieces.delete(pieceId);

    this.animateFlyOutPiece(piece, () => {
      this.updateStats();
      this.checkWinCondition();
    });
  }

  isForwardPieceClear(grid, size, piece) {
    let dr = 0, dc = 0;
    if (piece.dir === 'up') dr = -1;
    else if (piece.dir === 'down') dr = 1;
    else if (piece.dir === 'left') dc = -1;
    else if (piece.dir === 'right') dc = 1;

    for (const pt of piece.cells) {
      let currR = pt.r + dr;
      let currC = pt.c + dc;
      while (currR >= 0 && currR < size && currC >= 0 && currC < size) {
        const occupant = grid[currR][currC];
        if (occupant !== null && occupant !== piece.id) {
          return false;
        }
        currR += dr;
        currC += dc;
      }
    }
    return true;
  }

  getFreeSteps(piece) {
    const size = this.gridSize;
    let dr = 0, dc = 0;
    if (piece.dir === 'up') dr = -1;
    else if (piece.dir === 'down') dr = 1;
    else if (piece.dir === 'left') dc = -1;
    else if (piece.dir === 'right') dc = 1;

    let minFree = Infinity;

    for (const pt of piece.cells) {
      let currR = pt.r + dr;
      let currC = pt.c + dc;
      let steps = 0;
      while (currR >= 0 && currR < size && currC >= 0 && currC < size) {
        const occupant = this.grid[currR][currC];
        if (occupant !== null && occupant !== piece.id) {
          // Obstacle encountered
          break;
        }
        steps++;
        currR += dr;
        currC += dc;
      }
      if (currR >= 0 && currR < size && currC >= 0 && currC < size) {
        minFree = Math.min(minFree, steps);
      }
    }

    return minFree === Infinity ? 0 : minFree;
  }

  animateBonkPiece(piece) {
    if (this.isAnimating) return;
    this.isAnimating = true;
    const boardVersion = this.boardVersion;

    const freeSteps = this.getFreeSteps(piece);
    const container = this.dom.gridContainer;
    const size = this.gridSize;
    const gap = window.innerWidth <= 540 ? 4 : 8;
    const stepSize = (container.offsetWidth + gap) / size;

    // Travel all the way across free cells + small bump right to the obstacle's edge
    const nudge = 6;
    const totalDist = freeSteps === 0 ? 8 : (freeSteps * stepSize + nudge);

    let tx = 0, ty = 0;
    if (piece.dir === 'up') ty = -totalDist;
    else if (piece.dir === 'down') ty = totalDist;
    else if (piece.dir === 'left') tx = -totalDist;
    else if (piece.dir === 'right') tx = totalDist;

    const elements = document.querySelectorAll(`.piece-${piece.id}`);

    const forwardDuration = freeSteps === 0 ? 0.08 : Math.min(0.24, 0.11 + freeSteps * 0.04);
    const returnDuration = freeSteps === 0 ? 0.12 : Math.min(0.28, 0.14 + freeSteps * 0.04);

    elements.forEach(el => {
      el.style.zIndex = '30';
      el.style.transition = `transform ${forwardDuration}s cubic-bezier(0.25, 0.9, 0.4, 1.1)`;
      el.style.transform = `translate(${tx}px, ${ty}px)`;
    });

    // Play bonk on impact with the blocking obstacle
    setTimeout(() => {
      if (boardVersion !== this.boardVersion) return;
      this.audio.playBonk();

      // Recoil smoothly back to original position
      elements.forEach(el => {
        el.style.transition = `transform ${returnDuration}s cubic-bezier(0.16, 1, 0.3, 1)`;
        el.style.transform = 'translate(0, 0)';
      });

      setTimeout(() => {
        if (boardVersion !== this.boardVersion) return;
        elements.forEach(el => {
          el.style.zIndex = '';
          el.style.transition = '';
        });
        this.isAnimating = false;
      }, returnDuration * 1000 + 20);
    }, forwardDuration * 1000);
  }

  animateFlyOutPiece(piece, callback) {
    const boardVersion = this.boardVersion;
    let tx = 0, ty = 0;
    const dist = 650;
    if (piece.dir === 'up') ty = -dist;
    else if (piece.dir === 'down') ty = dist;
    else if (piece.dir === 'left') tx = -dist;
    else if (piece.dir === 'right') tx = dist;

    const elements = document.querySelectorAll(`.piece-${piece.id}`);
    elements.forEach(el => {
      el.style.transition = 'transform 0.28s cubic-bezier(0.2, 0.8, 0.4, 1.2), opacity 0.24s ease-out';
      el.style.transform = `translate(${tx}px, ${ty}px) scale(0.9)`;
      el.style.opacity = '0';
      el.style.pointerEvents = 'none';
      el.style.zIndex = '100';
    });

    setTimeout(() => {
      elements.forEach(el => {
        if (el.parentNode) el.parentNode.removeChild(el);
      });
      if (boardVersion === this.boardVersion) callback();
    }, 280);
  }

  undoMove() {
    if (this.undoStack.length === 0) return;
    this.cancelPendingWin();
    this.dom.winModal.classList.add('hidden');

    const lastMove = this.undoStack.pop();
    const { piece } = lastMove;

    piece.cells.forEach(pt => {
      this.grid[pt.r][pt.c] = piece.id;
    });
    this.pieces.set(piece.id, piece);

    // Render piece outside and animate back into position
    this.renderPiece(piece);

    let tx = 0, ty = 0;
    const dist = 650;
    if (piece.dir === 'up') ty = -dist;
    else if (piece.dir === 'down') ty = dist;
    else if (piece.dir === 'left') tx = -dist;
    else if (piece.dir === 'right') tx = dist;

    const elements = document.querySelectorAll(`.piece-${piece.id}`);
    elements.forEach(el => {
      el.style.transform = `translate(${tx}px, ${ty}px) scale(0.9)`;
      el.style.opacity = '0';
      void el.offsetWidth;
      el.style.transition = 'transform 0.24s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease-in';
      el.style.transform = 'translate(0, 0) scale(1)';
      el.style.opacity = '1';
    });

    this.audio.playUndo();
    this.moveCount = Math.max(0, this.moveCount - 1);
    this.updateStats();
  }

  giveHint() {
    const size = this.gridSize;
    const unblockedPieces = [];

    for (const piece of this.pieces.values()) {
      if (this.isForwardPieceClear(this.grid, size, piece)) {
        unblockedPieces.push(piece);
      }
    }

    if (unblockedPieces.length === 0) return;

    const pick = unblockedPieces[Math.floor(Math.random() * unblockedPieces.length)];
    const elements = document.querySelectorAll(`.piece-${pick.id}`);

    this.audio.playHint();
    elements.forEach(el => {
      el.classList.add('hint-pulse');
      setTimeout(() => {
        el.classList.remove('hint-pulse');
      }, 1200);
    });
  }

  updateStats() {
    const remaining = this.pieces.size;
    this.dom.blocksRemaining.textContent = remaining;
    this.dom.movesCount.textContent = this.moveCount;
  }

  checkWinCondition() {
    if (this.pieces.size === 0 && this.winTimer === null) {
      const boardVersion = this.boardVersion;
      this.winTimer = setTimeout(() => {
        this.winTimer = null;
        if (boardVersion !== this.boardVersion || this.pieces.size !== 0) return;
        this.audio.playWin();
        this.showWinModal();
      }, 250);
    }
  }

  cancelPendingWin() {
    clearTimeout(this.winTimer);
    this.winTimer = null;
  }

  showWinModal() {
    if (this.dom.winStats) {
      this.dom.winStats.innerHTML = `
        <div>Grid Size: <strong>${this.gridSize}×${this.gridSize}</strong></div>
        <div>Total Moves: <strong>${this.moveCount}</strong></div>
      `;
    }
    this.dom.winModal.classList.remove('hidden');
  }
}

// Auto-boot on load
window.addEventListener('DOMContentLoaded', () => {
  window.game = new TapOutGame();
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
    id: 'tapout', levelKey: 'tapout_level',
    fields: 'level gridSize shapeMode grid pieces initialGridState initialPiecesState undoStack moveCount',
    actions: 'newGame restartGame undoMove handlePieceTap',
    validate: s => s.level >= 1 && [4,6,8,10,12].includes(s.gridSize) && s.grid.length === s.gridSize && s.grid.every(r => r.length === s.gridSize) && [...s.pieces.values()].every(p => p.cells.length && p.cells.every(c => c.r >= 0 && c.c >= 0 && c.r < s.gridSize && c.c < s.gridSize)),
    resume: g => { g.renderBoard(); g.updateStats(); g.dom.levelBadge.textContent = `Level ${g.level}: ${g.gridSize}×${g.gridSize}`; g.checkWinCondition(); },
  });
});
