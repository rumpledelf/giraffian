/** Arrows: winding paths whose heads need a clear route out of the board. */
class ArrowsGame {
  constructor() {
    this.sizes = [6, 8, 10, 12, 16];
    const requested = Number(new URLSearchParams(location.search).get('size') || localStorage.getItem('arrows_size') || 10);
    this.gridSize = this.sizes.includes(requested) ? requested : 10;
    this.level = Math.max(1, Number(localStorage.getItem('arrows_level')) || 1);
    this.audio = new window.ArrowsAudio();
    this.paths = new Map();
    this.grid = [];
    this.history = [];
    this.moves = 0;
    this.boardVersion = 0;
    this.animationFrame = null;
    this.winTimer = null;
    this.isAnimating = false;
    this.colors = ['#ec8d6f', '#f7e55f', '#589a56', '#82dee6', '#3a7ede', '#dcb0ed'];
    this.directions = { up: [-1, 0], right: [0, 1], down: [1, 0], left: [0, -1] };
    this.dom = {};
    for (const id of ['arrows-board', 'level-badge', 'paths-remaining-count', 'moves-count',
      'btn-sound', 'sound-icon-on', 'sound-icon-off', 'btn-settings', 'settings-modal',
      'size-select', 'btn-close-settings', 'btn-apply-settings', 'btn-restart', 'btn-undo',
      'btn-hint', 'btn-new', 'win-modal', 'win-stats', 'btn-next-level']) {
      this.dom[id] = document.getElementById(id);
    }
    this.bindEvents();
    this.updateSoundIcons();
    this.newGame();
  }

  shuffle(values) {
    const items = [...values];
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
  }

  countBends(cells) {
    let bends = 0;
    for (let i = 2; i < cells.length; i++) {
      const a = cells[i - 2], b = cells[i - 1], c = cells[i];
      if (b.r - a.r !== c.r - b.r || b.c - a.c !== c.c - b.c) bends++;
    }
    return bends;
  }

  generatePuzzle(size) {
    const remaining = Array.from({ length: size }, () => Array(size).fill(true));
    const grid = Array.from({ length: size }, () => Array(size).fill(null));
    const paths = new Map();
    let left = size * size;
    const inside = (r, c) => r >= 0 && c >= 0 && r < size && c < size;

    // Each head faces a clear ray through already-carved cells. Growing its
    // body backwards through occupied cells preserves that exit. Removing
    // paths in insertion order therefore solves the finished board.
    while (left > 0) {
      const heads = [];
      for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) if (remaining[i][j]) { heads.push({ r: i, c: j, dir: 'left' }); break; }
        for (let j = size - 1; j >= 0; j--) if (remaining[i][j]) { heads.push({ r: i, c: j, dir: 'right' }); break; }
        for (let j = 0; j < size; j++) if (remaining[j][i]) { heads.push({ r: j, c: i, dir: 'up' }); break; }
        for (let j = size - 1; j >= 0; j--) if (remaining[j][i]) { heads.push({ r: j, c: i, dir: 'down' }); break; }
      }
      let best = null;
      for (const head of this.shuffle(heads).slice(0, 14)) {
        for (let attempt = 0; attempt < 2; attempt++) {
          const [dr, dc] = this.directions[head.dir];
          const backwards = [{ r: head.r, c: head.c }];
          const visited = new Set([`${head.r},${head.c}`]);
          const behind = { r: head.r - dr, c: head.c - dc };
          const target = 6 + Math.floor(Math.random() * Math.min(size + 2, 18));
          if (inside(behind.r, behind.c) && remaining[behind.r][behind.c]) {
            backwards.push(behind);
            visited.add(`${behind.r},${behind.c}`);
          }
          while (backwards.length > 1 && backwards.length < target) {
            const end = backwards[backwards.length - 1];
            const previous = backwards[backwards.length - 2];
            let options = this.shuffle(Object.values(this.directions)).map(([r, c]) => ({ r: end.r + r, c: end.c + c }))
              .filter(p => inside(p.r, p.c) && remaining[p.r][p.c] && !visited.has(`${p.r},${p.c}`));
            if (!options.length) break;
            if (Math.random() < 0.7) {
              const turns = options.filter(p => p.r - end.r !== end.r - previous.r || p.c - end.c !== end.c - previous.c);
              if (turns.length) options = turns;
            }
            const next = options[0];
            backwards.push(next);
            visited.add(`${next.r},${next.c}`);
          }
          const cells = backwards.reverse();
          const score = cells.length + this.countBends(cells) * 2;
          if (!best || score > best.score) best = { cells, dir: head.dir, score };
        }
      }
      const id = paths.size + 1;
      const path = { id, cells: best.cells, dir: best.dir, color: this.colors[(id - 1) % this.colors.length] };
      paths.set(id, path);
      for (const cell of path.cells) {
        remaining[cell.r][cell.c] = false;
        grid[cell.r][cell.c] = id;
      }
      left -= path.cells.length;
    }
    return { grid, paths };
  }

  isPathClear(path, grid = this.grid) {
    const head = path.cells[path.cells.length - 1];
    const [dr, dc] = this.directions[path.dir];
    for (let r = head.r + dr, c = head.c + dc;
      r >= 0 && c >= 0 && r < grid.length && c < grid.length; r += dr, c += dc) {
      if (grid[r][c] !== null) return false;
    }
    return true;
  }

  bindEvents() {
    this.dom['btn-new'].addEventListener('click', () => this.nextGame());
    this.dom['btn-next-level'].addEventListener('click', () => this.nextGame());
    this.dom['btn-restart'].addEventListener('click', () => this.restartGame());
    this.dom['btn-undo'].addEventListener('click', () => this.undoMove());
    this.dom['btn-hint'].addEventListener('click', () => this.giveHint());
    this.dom['btn-sound'].addEventListener('click', () => { this.audio.toggleMute(); this.updateSoundIcons(); });
    this.dom['btn-settings'].addEventListener('click', () => {
      this.dom['size-select'].value = String(this.gridSize);
      this.dom['settings-modal'].classList.remove('hidden');
    });
    this.dom['btn-close-settings'].addEventListener('click', () => this.dom['settings-modal'].classList.add('hidden'));
    this.dom['btn-apply-settings'].addEventListener('click', () => {
      this.gridSize = Number(this.dom['size-select'].value);
      localStorage.setItem('arrows_size', String(this.gridSize));
      this.dom['settings-modal'].classList.add('hidden');
      this.newGame();
    });
    this.dom['settings-modal'].addEventListener('click', e => {
      if (e.target === this.dom['settings-modal']) this.dom['settings-modal'].classList.add('hidden');
    });
    window.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        this.dom['settings-modal'].classList.add('hidden');
        this.dom['win-modal'].classList.add('hidden');
        return;
      }
      if (e.target.closest('input, select, textarea, button') || e.ctrlKey || e.metaKey || e.altKey) return;
      if (!this.dom['settings-modal'].classList.contains('hidden')) return;
      if (e.key.toLowerCase() === 'u') this.undoMove();
      if (e.key.toLowerCase() === 'h') this.giveHint();
      if (e.key.toLowerCase() === 'r') this.restartGame();
    });
    window.addEventListener('resize', () => {
      this.cancelAnimation();
      this.render();
      if (!this.paths.size && this.dom['win-modal'].classList.contains('hidden')) this.checkWinCondition();
    });
  }

  updateSoundIcons() {
    const muted = this.audio.isMuted();
    this.dom['sound-icon-on'].classList.toggle('hidden', muted);
    this.dom['sound-icon-off'].classList.toggle('hidden', !muted);
  }

  cancelAnimation() {
    this.boardVersion++;
    cancelAnimationFrame(this.animationFrame);
    clearTimeout(this.winTimer);
    this.animationFrame = null;
    this.winTimer = null;
    this.isAnimating = false;
  }

  nextGame() {
    this.level++;
    localStorage.setItem('arrows_level', String(this.level));
    this.newGame();
  }

  newGame() {
    this.cancelAnimation();
    const { grid, paths } = this.generatePuzzle(this.gridSize);
    this.grid = grid;
    this.paths = paths;
    this.initialPaths = [...paths.values()].map(p => ({ ...p, cells: p.cells.map(c => ({ ...c })) }));
    this.history = [];
    this.moves = 0;
    this.dom['win-modal'].classList.add('hidden');
    this.render();
  }

  restartGame() {
    this.cancelAnimation();
    this.paths = new Map(this.initialPaths.map(p => [p.id, { ...p, cells: p.cells.map(c => ({ ...c })) }]));
    this.grid = Array.from({ length: this.gridSize }, () => Array(this.gridSize).fill(null));
    for (const path of this.paths.values()) for (const cell of path.cells) this.grid[cell.r][cell.c] = path.id;
    this.history = [];
    this.moves = 0;
    this.dom['win-modal'].classList.add('hidden');
    this.render();
  }

  svgElement(name, attributes = {}) {
    const element = document.createElementNS('http://www.w3.org/2000/svg', name);
    for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
    return element;
  }

  render() {
    const board = this.dom['arrows-board'];
    const frame = board.parentElement;
    const css = getComputedStyle(frame);
    const inset = parseFloat(css.paddingLeft) + parseFloat(css.paddingRight)
      + parseFloat(css.borderLeftWidth) + parseFloat(css.borderRightWidth);
    const available = Math.min(720, frame.parentElement.clientWidth - inset);
    this.cellSize = Math.floor(available / this.gridSize);
    this.boardSize = this.gridSize * this.cellSize;
    board.setAttribute('viewBox', `0 0 ${this.boardSize} ${this.boardSize}`);
    board.setAttribute('width', this.boardSize);
    board.setAttribute('height', this.boardSize);
    board.replaceChildren();

    // Dotted slot grid on board background for clear spatial alignment
    const gridGroup = this.svgElement('g', { class: 'board-grid' });
    const slotPad = Math.max(2, Math.round(this.cellSize * 0.08));
    const slotSize = this.cellSize - slotPad * 2;
    const slotRadius = Math.max(4, Math.round(this.cellSize * 0.16));
    for (let r = 0; r < this.gridSize; r++) {
      for (let c = 0; c < this.gridSize; c++) {
        gridGroup.appendChild(this.svgElement('rect', {
          class: 'grid-slot',
          x: c * this.cellSize + slotPad,
          y: r * this.cellSize + slotPad,
          width: slotSize,
          height: slotSize,
          rx: slotRadius
        }));
      }
    }
    board.appendChild(gridGroup);

    for (const path of this.paths.values()) this.renderPath(path);
    this.updateStats();
  }

  pointsForPath(path) {
    const points = path.cells.map(c => ({ x: (c.c + 0.5) * this.cellSize, y: (c.r + 0.5) * this.cellSize }));
    const [dr, dc] = this.directions[path.dir];
    const head = points[points.length - 1];
    if (points.length === 1) points.unshift({ x: head.x - dc * this.cellSize * 0.25, y: head.y - dr * this.cellSize * 0.25 });
    points.push({ x: head.x + dc * this.cellSize * 0.24, y: head.y + dr * this.cellSize * 0.24 });
    return points;
  }

  renderPath(path) {
    const group = this.svgElement('g', {
      class: 'arrow-piece', 'data-path-id': path.id, tabindex: '0', role: 'button',
      'aria-label': `Arrow pointing ${path.dir}, ${path.cells.length} cells`,
      style: `--path-color: ${path.color}`
    });

    // Touch hitboxes per cell
    for (const cell of path.cells) group.appendChild(this.svgElement('rect', {
      class: 'arrow-hit', x: cell.c * this.cellSize, y: cell.r * this.cellSize,
      width: this.cellSize, height: this.cellSize, fill: 'transparent'
    }));

    // Dual-stroke body: outline creates strict 2px border around pastel core.
    // Butt caps keep the body flush with the arrowhead; tail circles round off the back.
    group.appendChild(this.svgElement('path', { class: 'arrow-outline', fill: 'none', 'stroke-linecap': 'butt', 'stroke-linejoin': 'round' }));
    group.appendChild(this.svgElement('circle', { class: 'arrow-tail-outline' }));
    group.appendChild(this.svgElement('polygon', { class: 'arrow-head', 'stroke-width': '2', 'stroke-linejoin': 'round' }));
    group.appendChild(this.svgElement('path', { class: 'arrow-core', fill: 'none', 'stroke-linecap': 'butt', 'stroke-linejoin': 'round' }));
    group.appendChild(this.svgElement('circle', { class: 'arrow-tail' }));

    this.drawPath(group, this.pointsForPath(path));

    group.addEventListener('click', () => this.handlePathTap(path.id));
    group.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); this.handlePathTap(path.id); }
    });
    this.dom['arrows-board'].appendChild(group);
    return group;
  }

  drawPath(group, points) {
    if (!points || points.length < 2) return;
    const outline = group.querySelector('.arrow-outline');
    const core = group.querySelector('.arrow-core');
    const head = group.querySelector('.arrow-head');
    const tailOutline = group.querySelector('.arrow-tail-outline');
    const tail = group.querySelector('.arrow-tail');

    const bodyWidth = Math.max(12, Math.round(this.cellSize * 0.46));
    const outlineWidth = bodyWidth + 4; // strictly 2px border on all sides

    const end = points[points.length - 1];
    const before = points[points.length - 2];
    const length = Math.hypot(end.x - before.x, end.y - before.y) || 1;
    const dx = (end.x - before.x) / length;
    const dy = (end.y - before.y) / length;

    // Arrowhead: a clean triangle wider than the body, its base just ahead of the head cell's centre
    const headLen = this.cellSize * 0.4;
    const headWing = bodyWidth * 0.8;
    const tip = { x: end.x + dx * this.cellSize * 0.18, y: end.y + dy * this.cellSize * 0.18 };
    const base = { x: tip.x - dx * headLen, y: tip.y - dy * headLen };
    const pt = p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    head.setAttribute('points', [tip, { x: base.x - dy * headWing, y: base.y + dx * headWing },
      { x: base.x + dy * headWing, y: base.y - dx * headWing }].map(pt).join(' '));

    // Outline stops at the head's base; core pokes 1.5px past it to hide the base stroke inside the body
    const bodyPath = reach => [...points.slice(0, -1), { x: base.x + dx * reach, y: base.y + dy * reach }]
      .map((p, i) => `${i ? 'L' : 'M'}${pt(p)}`).join(' ');
    outline.setAttribute('d', bodyPath(0));
    outline.setAttribute('stroke-width', outlineWidth);
    core.setAttribute('d', bodyPath(1.5));
    core.setAttribute('stroke-width', bodyWidth);

    const start = points[0];
    for (const [circle, r] of [[tailOutline, outlineWidth / 2], [tail, bodyWidth / 2]]) {
      circle.setAttribute('cx', start.x.toFixed(1));
      circle.setAttribute('cy', start.y.toFixed(1));
      circle.setAttribute('r', r);
    }
  }

  handlePathTap(id) {
    if (this.isAnimating || !this.paths.has(id)) return;
    const path = this.paths.get(id);
    const group = this.dom['arrows-board'].querySelector(`[data-path-id="${id}"]`);
    if (!this.isPathClear(path)) { this.animateBonk(path, group); return; }
    this.history.push(path);
    this.paths.delete(id);
    for (const cell of path.cells) this.grid[cell.r][cell.c] = null;
    this.moves++;
    this.audio.playFlyOut();
    this.updateStats();
    this.animateExit(path, group);
  }

  animate(duration, step, done) {
    const version = this.boardVersion;
    this.isAnimating = true;
    let start = null;
    const frame = now => {
      if (version !== this.boardVersion) return;
      if (start === null) start = now;
      const progress = Math.min(1, (now - start) / duration);
      step(progress);
      if (progress < 1) this.animationFrame = requestAnimationFrame(frame);
      else {
        this.animationFrame = null;
        this.isAnimating = false;
        done();
      }
    };
    this.animationFrame = requestAnimationFrame(frame);
  }

  animateBonk(path, group) {
    const [dr, dc] = this.directions[path.dir];
    let sounded = false;
    group.classList.add('blocked');
    this.animate(260, progress => {
      const distance = Math.sin(progress * Math.PI) * 7;
      group.setAttribute('transform', `translate(${dc * distance},${dr * distance})`);
      if (progress >= 0.5 && !sounded) { this.audio.playBonk(); sounded = true; }
    }, () => { group.removeAttribute('transform'); group.classList.remove('blocked'); });
  }

  slicePolyline(points, distances, start, end) {
    const at = distance => {
      for (let i = 1; i < points.length; i++) if (distance <= distances[i]) {
        const portion = (distance - distances[i - 1]) / (distances[i] - distances[i - 1]);
        return { x: points[i - 1].x + (points[i].x - points[i - 1].x) * portion,
          y: points[i - 1].y + (points[i].y - points[i - 1].y) * portion };
      }
      return points[points.length - 1];
    };
    const slice = [at(start)];
    for (let i = 1; i < points.length - 1; i++) if (distances[i] > start && distances[i] < end) slice.push(points[i]);
    slice.push(at(end));
    return slice;
  }

  animateExit(path, group) {
    group.classList.add('departing');
    group.removeAttribute('tabindex');
    const points = this.pointsForPath(path);
    const distances = [0];
    for (let i = 1; i < points.length; i++) distances.push(distances[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y));
    const bodyLength = distances[distances.length - 1];
    const end = points[points.length - 1];
    const [dr, dc] = this.directions[path.dir];
    const toEdge = dc > 0 ? this.boardSize - end.x : dc < 0 ? end.x
      : dr > 0 ? this.boardSize - end.y : end.y;
    const travel = bodyLength + toEdge + this.cellSize;
    points.push({ x: end.x + dc * (travel + bodyLength), y: end.y + dr * (travel + bodyLength) });
    distances.push(bodyLength + travel + bodyLength);
    const duration = matchMedia('(prefers-reduced-motion: reduce)').matches ? 80 : Math.min(750, 340 + path.cells.length * 12);
    this.animate(duration, progress => this.drawPath(group, this.slicePolyline(points, distances, progress * travel, bodyLength + progress * travel)), () => {
      group.remove();
      this.checkWinCondition();
    });
  }

  undoMove() {
    if (!this.history.length) return;
    this.cancelAnimation();
    const path = this.history.pop();
    this.paths.set(path.id, path);
    for (const cell of path.cells) this.grid[cell.r][cell.c] = path.id;
    this.moves--;
    this.dom['win-modal'].classList.add('hidden');
    this.audio.playUndo();
    this.render();
  }

  giveHint() {
    if (this.isAnimating) return;
    const candidates = [...this.paths.values()].filter(path => this.isPathClear(path));
    if (!candidates.length) return;
    this.dom['arrows-board'].querySelectorAll('.hinted').forEach(el => el.classList.remove('hinted'));
    const path = candidates[Math.floor(Math.random() * candidates.length)];
    const group = this.dom['arrows-board'].querySelector(`[data-path-id="${path.id}"]`);
    group.classList.add('hinted');
    this.audio.playHint();
    setTimeout(() => group.classList.remove('hinted'), 1600);
  }

  updateStats() {
    this.dom['level-badge'].textContent = `Level ${this.level}: ${this.gridSize}×${this.gridSize}`;
    this.dom['paths-remaining-count'].textContent = this.paths.size;
    this.dom['moves-count'].textContent = this.moves;
    this.dom['btn-undo'].disabled = this.history.length === 0;
    this.dom['btn-hint'].disabled = this.paths.size === 0;
  }

  checkWinCondition() {
    if (this.paths.size || this.winTimer !== null) return;
    const version = this.boardVersion;
    this.winTimer = setTimeout(() => {
      this.winTimer = null;
      if (version !== this.boardVersion || this.paths.size) return;
      this.dom['win-stats'].textContent = `${this.moves} arrows cleared`;
      this.audio.playWin();
      this.dom['win-modal'].classList.remove('hidden');
    }, 180);
  }
}

window.addEventListener('DOMContentLoaded', () => { window.arrowsGame = new ArrowsGame(); });
