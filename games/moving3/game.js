/**
 * Moving 3 - Conveyor Match Puzzle
 * 3 endless conveyor belts moving in alternating directions with extra off-screen boxes.
 * Seamless wrap-around belts with solvable generation.
 */

class MovingThreeGame {
  constructor() {
    this.speedMode = localStorage.getItem('moving3_speed') || 'slow';
    this.boxesPerTrack = parseInt(localStorage.getItem('moving3_boxesPerTrack') || '5', 10);
    this.currentTheme = localStorage.getItem('moving3_theme') || 'pantry';
    this.currentLevel = parseInt(localStorage.getItem('moving3_level') || '1', 10);
    this.isPaused = false;

    this.themes = {
      pantry: [
        { id: 1, name: 'Mushroom', icon: '🍄' },
        { id: 2, name: 'Honey', icon: '🍯' },
        { id: 3, name: 'Coffee', icon: '☕' },
        { id: 4, name: 'Jam', icon: '🍓' },
        { id: 5, name: 'Matcha', icon: '🍵' },
        { id: 6, name: 'Croissant', icon: '🥐' },
        { id: 7, name: 'Avocado', icon: '🥑' },
        { id: 8, name: 'Cheese', icon: '🧀' },
        { id: 9, name: 'Baguette', icon: '🥖' },
        { id: 10, name: 'Orange', icon: '🍊' },
        { id: 11, name: 'Donut', icon: '🍩' },
        { id: 12, name: 'Cupcake', icon: '🧁' },
        { id: 13, name: 'Cherry', icon: '🍒' },
        { id: 14, name: 'Teapot', icon: '🫖' },
        { id: 15, name: 'Cookie', icon: '🍪' },
        { id: 16, name: 'Pizza', icon: '🍕' },
        { id: 17, name: 'Apple', icon: '🍎' },
        { id: 18, name: 'Peach', icon: '🍑' },
        { id: 19, name: 'Watermelon', icon: '🍉' },
        { id: 20, name: 'Grape', icon: '🍇' },
      ],
      shapes: [
        { id: 1, name: 'Diamond', icon: '💎' },
        { id: 2, name: 'Orb', icon: '🔮' },
        { id: 3, name: 'Star', icon: '⭐' },
        { id: 4, name: 'Crescent', icon: '🌙' },
        { id: 5, name: 'Clover', icon: '🍀' },
        { id: 6, name: 'Sakura', icon: '🌸' },
        { id: 7, name: 'Bolt', icon: '⚡' },
        { id: 8, name: 'Sun', icon: '☀️' },
        { id: 9, name: 'Drop', icon: '💧' },
        { id: 10, name: 'Leaf', icon: '🍁' },
        { id: 11, name: 'Heart', icon: '💖' },
        { id: 12, name: 'Crown', icon: '👑' },
        { id: 13, name: 'Flame', icon: '🔥' },
        { id: 14, name: 'Sparkle', icon: '✨' },
        { id: 15, name: 'Bell', icon: '🔔' },
        { id: 16, name: 'Key', icon: '🗝️' },
        { id: 17, name: 'Compass', icon: '🧭' },
        { id: 18, name: 'Hourglass', icon: '⏳' },
        { id: 19, name: 'Shield', icon: '🛡️' },
        { id: 20, name: 'Ring', icon: '💍' },
      ]
    };

    // Total boxes = 3 * boxesPerTrack (e.g. 15 or 18)
    this.boxes = []; 
    this.trackOffsets = [0, 0, 0]; // Track movement offset
    this.trackBelts = [
      document.getElementById('belt-0'),
      document.getElementById('belt-1'),
      document.getElementById('belt-2')
    ];

    this.selected = null; // { boxIdx, itemIdx }
    this.moveHistory = [];
    this.moveCount = 0;
    this.boxesPacked = 0;
    this.targetPackedBoxes = 0;
    this.isLocked = false;
    this.lastTimestamp = null;

    this.dom = {
      stage: document.getElementById('conveyor-stage'),
      levelBadge: document.getElementById('level-badge'),
      itemsLeft: document.getElementById('items-left-count'),
      boxesClearedCount: document.getElementById('boxes-cleared-count'),
      floatingItem: document.getElementById('floating-selected-item'),
      btnPause: document.getElementById('btn-pause'),
      iconPause: document.getElementById('icon-pause'),
      iconPlay: document.getElementById('icon-play'),
      btnRestart: document.getElementById('btn-restart'),
      btnUndo: document.getElementById('btn-undo'),
      undoCount: document.getElementById('undo-count'),
      btnSpeed: document.getElementById('btn-speed'),
      btnAdvance: document.getElementById('btn-advance'),
      btnNew: document.getElementById('btn-new'),
      btnSound: document.getElementById('btn-sound'),
      soundIconOn: document.getElementById('sound-icon-on'),
      soundIconOff: document.getElementById('sound-icon-off'),
      btnSettings: document.getElementById('btn-settings'),
      winModal: document.getElementById('win-modal'),
      winStats: document.getElementById('win-stats'),
      btnNextLevel: document.getElementById('btn-next-level'),
      settingsModal: document.getElementById('settings-modal'),
      speedSelect: document.getElementById('speed-select'),
      lengthSelect: document.getElementById('length-select'),
      themeSelect: document.getElementById('theme-select'),
      btnCloseSettings: document.getElementById('btn-close-settings'),
      btnApplySettings: document.getElementById('btn-apply-settings'),
    };

    this.initEvents();
    this.updateSoundIcons();
    this.updateSpeedButton();
    this.startNewGame();
    this.startAnimationLoop();
  }

  initEvents() {
    this.dom.btnPause.addEventListener('click', () => this.togglePause());
    this.dom.btnRestart.addEventListener('click', () => this.restartGame());
    this.dom.btnUndo.addEventListener('click', () => this.undoMove());
    this.dom.btnSpeed.addEventListener('click', () => this.cycleSpeed());
    this.dom.btnAdvance.addEventListener('click', () => this.shiftBeltsOnMove());
    this.dom.btnNew.addEventListener('click', () => {
      this.currentLevel++;
      localStorage.setItem('moving3_level', this.currentLevel);
      this.startNewGame();
    });

    this.dom.btnSound.addEventListener('click', () => {
      window.conveyorSound.toggleMute();
      this.updateSoundIcons();
    });

    this.dom.btnSettings.addEventListener('click', () => {
      this.dom.speedSelect.value = this.speedMode;
      this.dom.lengthSelect.value = this.boxesPerTrack;
      this.dom.themeSelect.value = this.currentTheme;
      this.dom.settingsModal.classList.remove('hidden');
    });

    this.dom.btnCloseSettings.addEventListener('click', () => {
      this.dom.settingsModal.classList.add('hidden');
    });

    this.dom.btnApplySettings.addEventListener('click', () => {
      this.speedMode = this.dom.speedSelect.value;
      this.boxesPerTrack = parseInt(this.dom.lengthSelect.value, 10);
      this.currentTheme = this.dom.themeSelect.value;

      localStorage.setItem('moving3_speed', this.speedMode);
      localStorage.setItem('moving3_boxesPerTrack', this.boxesPerTrack);
      localStorage.setItem('moving3_theme', this.currentTheme);

      this.updateSpeedButton();
      this.dom.settingsModal.classList.add('hidden');
      this.startNewGame();
    });

    this.dom.btnNextLevel.addEventListener('click', () => {
      this.dom.winModal.classList.add('hidden');
      this.currentLevel++;
      localStorage.setItem('moving3_level', this.currentLevel);
      this.startNewGame();
    });

    this.dom.settingsModal.addEventListener('click', (e) => {
      if (e.target === this.dom.settingsModal) {
        this.dom.settingsModal.classList.add('hidden');
      }
    });

    // Escape key to cancel selection
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        if (this.selected) {
          this.clearFloatingPreview();
          this.render();
        }
      }
    });

    // Cursor / touch tracker for floating selected item
    const updateFloatingPos = (x, y, isTouch = false) => {
      if (this.selected) {
        this.dom.floatingItem.style.left = `${x}px`;
        // On mouse, center directly on cursor. On touch, slight offset so finger doesn't obscure.
        this.dom.floatingItem.style.top = isTouch ? `${y - 32}px` : `${y}px`;
      }
    };

    window.addEventListener('mousemove', (e) => updateFloatingPos(e.clientX, e.clientY, false));
    window.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        updateFloatingPos(e.touches[0].clientX, e.touches[0].clientY, true);
      }
    }, { passive: true });

    // Background click listener (runs only when click misses a box directly)
    window.addEventListener('click', (e) => {
      if (!this.selected || this.isLocked) return;

      // Don't intercept clicks on header, footer or modal controls
      if (e.target.closest('header') || e.target.closest('footer') || e.target.closest('.modal-backdrop')) {
        return;
      }

      // Check if the floating icon center is hovering over an open box
      const rect = this.dom.floatingItem.getBoundingClientRect();
      const iconCx = rect.left + rect.width / 2;
      const iconCy = rect.top + rect.height / 2;
      const elements = document.elementsFromPoint(iconCx, iconCy) || [];

      let hitBox = null;
      for (let el of elements) {
        const b = el.closest('.moving-box');
        if (b && !b.classList.contains('closed')) {
          hitBox = b;
          break;
        }
      }

      if (hitBox) {
        const boxIdx = parseInt(hitBox.dataset.boxIndex, 10);
        this.handleBoxClick(boxIdx, e);
      } else {
        // Clicked outside on empty conveyor space -> cancel selection
        this.clearFloatingPreview();
        this.render();
      }
    });
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    if (this.isPaused) {
      this.dom.iconPause.classList.add('hidden');
      this.dom.iconPlay.classList.remove('hidden');
    } else {
      this.dom.iconPause.classList.remove('hidden');
      this.dom.iconPlay.classList.add('hidden');
      this.lastTimestamp = null;
    }
  }

  cycleSpeed() {
    const modes = ['slow', 'medium', 'fast', 'shift'];
    const nextIdx = (modes.indexOf(this.speedMode) + 1) % modes.length;
    this.speedMode = modes[nextIdx];
    localStorage.setItem('moving3_speed', this.speedMode);
    this.updateSpeedButton();
  }

  updateSpeedButton() {
    const labels = {
      slow: '⚡ Slow',
      medium: '⚡ Medium',
      fast: '⚡ Fast',
      shift: '⚡ Shift'
    };
    this.dom.btnSpeed.textContent = labels[this.speedMode] || '⚡ Speed';
    this.dom.btnAdvance.classList.toggle('hidden', this.speedMode !== 'shift');
  }

  updateSoundIcons() {
    const muted = window.conveyorSound.isMuted();
    if (muted) {
      this.dom.soundIconOn.classList.add('hidden');
      this.dom.soundIconOff.classList.remove('hidden');
    } else {
      this.dom.soundIconOn.classList.remove('hidden');
      this.dom.soundIconOff.classList.add('hidden');
    }
  }

  /* --- Game Initialization --- */

  startNewGame() {
    this.boardVersion = (this.boardVersion || 0) + 1;
    this.dom.winModal.classList.add('hidden');
    this.clearFloatingPreview();
    this.moveHistory = [];
    this.moveCount = 0;
    this.boxesPacked = 0;
    this.isLocked = false;
    this.trackOffsets = [0, 0, 0];
    this.updateUndoButton();

    this.dom.levelBadge.textContent = `Level ${this.currentLevel}`;

    const B = 3 * this.boxesPerTrack; // e.g. 15 or 18
    const T = B - 1; // e.g. 14 or 17 triplet types, leaving 3 gaps
    this.targetPackedBoxes = T;

    const themeList = this.themes[this.currentTheme];
    const typesInGame = themeList.slice(0, T);

    // 1. Solved state
    const board = [];
    for (let i = 0; i < T; i++) {
      const typeId = typesInGame[i].id;
      board.push([typeId, typeId, typeId]);
    }
    board.push([null, null, null]); // 1 spare working box (3 gaps total)

    // 2. Scramble walk
    const scrambleSteps = Math.max(120, B * 16);
    for (let s = 0; s < scrambleSteps; s++) {
      const nonEmpty = [];
      for (let i = 0; i < B; i++) {
        if (board[i].some(x => x !== null)) nonEmpty.push(i);
      }
      const fromBox = nonEmpty[Math.floor(Math.random() * nonEmpty.length)];

      const hasRoom = [];
      for (let j = 0; j < B; j++) {
        if (j !== fromBox && board[j].some(x => x === null)) hasRoom.push(j);
      }
      if (hasRoom.length === 0) continue;
      const toBox = hasRoom[Math.floor(Math.random() * hasRoom.length)];

      const fromSlots = [0, 1, 2].filter(slot => board[fromBox][slot] !== null);
      const fromSlot = fromSlots[Math.floor(Math.random() * fromSlots.length)];

      const toSlots = [0, 1, 2].filter(slot => board[toBox][slot] === null);
      const toSlot = toSlots[Math.floor(Math.random() * toSlots.length)];

      board[toBox][toSlot] = board[fromBox][fromSlot];
      board[fromBox][fromSlot] = null;
    }

    // Break any accidental instant matches
    for (let i = 0; i < B; i++) {
      if (board[i][0] !== null && board[i][0] === board[i][1] && board[i][1] === board[i][2]) {
        for (let next = 0; next < B; next++) {
          if (next !== i && board[next].some(x => x !== null)) {
            const nextSlot = [0, 1, 2].find(slot => board[next][slot] !== null);
            const tmp = board[i][0];
            board[i][0] = board[next][nextSlot];
            board[next][nextSlot] = tmp;
            break;
          }
        }
      }
    }

    this.boxes = board.map(items => ({
      items: [...items],
      isClosed: false
    }));

    this.initialSnapshot = this.boxes.map(b => ({
      items: [...b.items],
      isClosed: false
    }));

    this.updateCounts();
    this.render();
  }

  restartGame() {
    if (this.isLocked) return;
    this.boardVersion++;
    this.clearFloatingPreview();
    this.boxes = this.initialSnapshot.map(b => ({
      items: [...b.items],
      isClosed: false
    }));
    this.moveHistory = [];
    this.moveCount = 0;
    this.boxesPacked = 0;
    this.updateUndoButton();
    this.updateCounts();
    this.render();
  }

  updateCounts() {
    let itemsLeft = 0;
    this.boxes.forEach(b => {
      if (!b.isClosed) itemsLeft += b.items.filter(x => x !== null).length;
    });

    this.dom.itemsLeft.textContent = itemsLeft;
    this.dom.boxesClearedCount.textContent = `${this.boxesPacked} / ${this.targetPackedBoxes}`;
  }

  updateUndoButton() {
    this.dom.undoCount.textContent = this.moveHistory.length;
    this.dom.btnUndo.disabled = this.moveHistory.length === 0;
  }

  /* --- Animation Loop for Extended Conveyor Loop --- */

  startAnimationLoop() {
    const loop = (timestamp) => {
      if (!this.lastTimestamp) this.lastTimestamp = timestamp;
      const dt = (timestamp - this.lastTimestamp) / 1000;
      this.lastTimestamp = timestamp;

      if (!this.isPaused && this.speedMode !== 'shift') {
        this.updateMotion(dt);
      }

      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  updateMotion(dt) {
    const speedMap = { slow: 28, medium: 52, fast: 85 };
    const speed = speedMap[this.speedMode] || 28;

    const stageWidth = this.dom.stage.clientWidth || 800;
    const boxWidth = 220;
    const minX = -boxWidth - 40; // fully hidden beyond left edge
    const maxX = stageWidth + 40; // fully hidden beyond right edge
    const visibleSpan = maxX - minX;

    const pitch = 260;
    const loopSpan = Math.max(this.boxesPerTrack * pitch, visibleSpan + pitch);

    // Track 0 moves right (+), Track 1 moves left (-), Track 2 moves right (+)
    for (let track = 0; track < 3; track++) {
      const dir = (track % 2 === 0) ? 1 : -1;
      this.trackOffsets[track] += speed * dt * dir;

      for (let b = 0; b < this.boxesPerTrack; b++) {
        const globalIdx = track * this.boxesPerTrack + b;
        const initialPos = b * pitch;

        let raw = (initialPos + this.trackOffsets[track]) % loopSpan;
        if (raw < 0) raw += loopSpan;

        // x coordinate strictly maps between minX and (minX + loopSpan)
        const x = minX + raw;

        const boxEl = this.boxElements && this.boxElements[globalIdx];
        if (boxEl) {
          boxEl.style.transform = `translateX(${x}px)`;
        }
      }
    }
  }

  shiftBeltsOnMove() {
    if (this.speedMode !== 'shift') return;
    const stageWidth = this.dom.stage.clientWidth || 800;
    const boxWidth = 220;
    const minX = -boxWidth - 40;
    const maxX = stageWidth + 40;
    const visibleSpan = maxX - minX;

    const pitch = 260;
    const loopSpan = Math.max(this.boxesPerTrack * pitch, visibleSpan + pitch);
    const shiftDist = 75;

    for (let track = 0; track < 3; track++) {
      const dir = (track % 2 === 0) ? 1 : -1;
      this.trackOffsets[track] += shiftDist * dir;

      for (let b = 0; b < this.boxesPerTrack; b++) {
        const globalIdx = track * this.boxesPerTrack + b;
        const initialPos = b * pitch;

        let raw = (initialPos + this.trackOffsets[track]) % loopSpan;
        if (raw < 0) raw += loopSpan;
        const x = minX + raw;

        const boxEl = this.boxElements && this.boxElements[globalIdx];
        if (boxEl) {
          boxEl.style.transform = `translateX(${x}px)`;
        }
      }
    }
  }

  /* --- Rendering --- */

  render() {
    this.trackBelts.forEach(belt => belt.innerHTML = '');
    this.boxElements = [];
    const themeList = this.themes[this.currentTheme];

    this.boxes.forEach((box, boxIdx) => {
      const trackIdx = Math.floor(boxIdx / this.boxesPerTrack);
      const beltEl = this.trackBelts[trackIdx];

      const boxEl = document.createElement('div');
      boxEl.className = 'moving-box';
      boxEl.dataset.boxIndex = boxIdx;

      if (box.isClosed) {
        boxEl.classList.add('closed');
      }

      if (this.selected && this.selected.boxIdx === boxIdx) {
        boxEl.classList.add('selected');
      }

      const slotsEl = document.createElement('div');
      slotsEl.className = 'box-slots';

      if (box.isClosed) {
        const lidEl = document.createElement('div');
        lidEl.className = 'box-lid-closed';
        lidEl.innerHTML = `<span>✨ Packed ✨</span>`;
        slotsEl.appendChild(lidEl);
      } else {
        for (let s = 0; s < 3; s++) {
          const slotEl = document.createElement('div');
          slotEl.className = 'slot';
          slotEl.dataset.slotIdx = s;

          const itemId = box.items[s];
          if (itemId !== null) {
            const def = themeList.find(t => t.id === itemId) || { icon: '❓', name: 'Item' };

            const itemEl = document.createElement('div');
            itemEl.className = `item item-type-${itemId}`;
            itemEl.dataset.slotIdx = s;
            itemEl.textContent = def.icon;
            itemEl.title = def.name;

            if (this.selected && this.selected.boxIdx === boxIdx && this.selected.slotIdx === s) {
              itemEl.classList.add('selected');
            }

            slotEl.appendChild(itemEl);
          } else {
            slotEl.classList.add('empty');
          }
          slotsEl.appendChild(slotEl);
        }
      }

      boxEl.appendChild(slotsEl);

      if (!box.isClosed) {
        boxEl.addEventListener('click', (e) => {
          e.stopPropagation();
          this.handleBoxClick(boxIdx, e);
        });
      }

      beltEl.appendChild(boxEl);
      this.boxElements.push(boxEl);
    });

    // Update positions immediately
    this.updateMotion(0);
  }

  /* --- Interaction --- */

  handleBoxClick(boxIdx, e) {
    if (this.isLocked) return;
    const targetBox = this.boxes[boxIdx];
    if (targetBox.isClosed) return;

    const itemEl = e.target.closest('.item');
    const emptySlotEl = e.target.closest('.slot.empty');
    const clickedItemSlot = itemEl ? parseInt(itemEl.dataset.slotIdx, 10) : null;
    const clickedEmptySlot = emptySlotEl ? parseInt(emptySlotEl.dataset.slotIdx, 10) : null;

    if (!this.selected) {
      if (clickedItemSlot === null) return;
      if (targetBox.items[clickedItemSlot] === null) return;

      this.selected = { boxIdx, slotIdx: clickedItemSlot };
      window.conveyorSound.playPick();

      // Show floating item preview
      const themeList = this.themes[this.currentTheme];
      const itemId = targetBox.items[clickedItemSlot];
      const def = themeList.find(t => t.id === itemId) || { icon: '❓' };
      this.dom.floatingItem.textContent = def.icon;
      this.dom.floatingItem.classList.remove('hidden');

      if (e.clientX && e.clientY) {
        this.dom.floatingItem.style.left = `${e.clientX}px`;
        this.dom.floatingItem.style.top = `${e.clientY - 45}px`;
      }

      this.render();
    } else {
      const fromBoxIdx = this.selected.boxIdx;
      const fromSlotIdx = this.selected.slotIdx;

      // Deselect if clicking same item
      if (fromBoxIdx === boxIdx && fromSlotIdx === clickedItemSlot) {
        this.clearFloatingPreview();
        this.render();
        return;
      }

      // Switch selection if tapping another item
      if (clickedItemSlot !== null && (fromBoxIdx !== boxIdx || fromSlotIdx !== clickedItemSlot)) {
        this.selected = { boxIdx, slotIdx: clickedItemSlot };
        window.conveyorSound.playPick();
        const themeList = this.themes[this.currentTheme];
        const itemId = targetBox.items[clickedItemSlot];
        const def = themeList.find(t => t.id === itemId) || { icon: '❓' };
        this.dom.floatingItem.textContent = def.icon;
        this.render();
        return;
      }

      // Check if target box has room
      const emptySlots = [0, 1, 2].filter(s => targetBox.items[s] === null);
      if (emptySlots.length === 0) {
        window.conveyorSound.playInvalid();
        return;
      }

      const toSlotIdx = (clickedEmptySlot !== null && targetBox.items[clickedEmptySlot] === null)
        ? clickedEmptySlot
        : emptySlots[0];

      // Execute drop
      this.executeMove(fromBoxIdx, fromSlotIdx, boxIdx, toSlotIdx);
    }
  }

  async executeMove(fromBoxIdx, fromSlotIdx, toBoxIdx, toSlotIdx) {
    const item = this.boxes[fromBoxIdx].items[fromSlotIdx];
    this.boxes[fromBoxIdx].items[fromSlotIdx] = null;
    this.boxes[toBoxIdx].items[toSlotIdx] = item;
    this.clearFloatingPreview();
    this.moveCount++;

    window.conveyorSound.playDrop();
    this.shiftBeltsOnMove();
    this.render();

    // Check if target box now has 3 identical items
    const targetBox = this.boxes[toBoxIdx];
    let matched = false;

    if (targetBox.items[0] !== null && 
        targetBox.items[0] === targetBox.items[1] && 
        targetBox.items[1] === targetBox.items[2]) {
      matched = true;
    }

    this.moveHistory.push({
      fromBox: fromBoxIdx,
      fromSlot: fromSlotIdx,
      toBox: toBoxIdx,
      toSlot: toSlotIdx,
      item: item,
      matched: matched
    });
    this.updateUndoButton();

    if (matched) {
      await this.handleTripleMatch(toBoxIdx);
    } else {
      this.isLocked = false;
      this.updateCounts();
    }
  }

  async handleTripleMatch(boxIdx) {
    const boardVersion = this.boardVersion;
    this.isLocked = true;
    window.conveyorSound.playMatchPoof();

    const boxEl = this.boxElements && this.boxElements[boxIdx];
    if (boxEl) {
      const itemEls = boxEl.querySelectorAll('.item');
      itemEls.forEach(el => el.classList.add('poofing'));

      const rect = boxEl.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      this.spawnPuffParticles(cx, cy);
    }

    await this.sleep(380);
    if (boardVersion !== this.boardVersion) return;

    this.boxes[boxIdx].isClosed = true;
    this.boxesPacked++;
    this.updateCounts();
    this.isLocked = false;
    this.render();

    if (this.boxesPacked >= this.targetPackedBoxes) {
      setTimeout(() => {
        if (boardVersion === this.boardVersion && this.boxesPacked >= this.targetPackedBoxes) {
          this.handleWin();
        }
      }, 250);
    }
  }

  spawnPuffParticles(x, y) {
    const sparkles = ['✨', '⭐', '💨', '✨'];
    for (let i = 0; i < 8; i++) {
      const p = document.createElement('div');
      p.className = 'puff-particle';
      p.textContent = sparkles[Math.floor(Math.random() * sparkles.length)];

      const angle = (Math.PI * 2 / 8) * i + (Math.random() * 0.4);
      const dist = 50 + Math.random() * 40;
      const tx = Math.cos(angle) * dist;
      const ty = Math.sin(angle) * dist;

      p.style.left = `${x}px`;
      p.style.top = `${y}px`;
      p.style.setProperty('--tx', `${tx}px`);
      p.style.setProperty('--ty', `${ty}px`);

      document.body.appendChild(p);
      setTimeout(() => p.remove(), 550);
    }
  }

  clearFloatingPreview() {
    this.selected = null;
    this.dom.floatingItem.classList.add('hidden');
  }

  undoMove() {
    if (this.isLocked || this.moveHistory.length === 0) return;

    this.clearFloatingPreview();
    const last = this.moveHistory.pop();

    if (last.matched) {
      this.boxes[last.toBox].isClosed = false;
      this.boxesPacked--;
    }

    this.boxes[last.toBox].items[last.toSlot] = null;
    this.boxes[last.fromBox].items[last.fromSlot] = last.item;

    window.conveyorSound.playDrop();
    this.updateUndoButton();
    this.updateCounts();
    this.render();
  }

  handleWin() {
    window.conveyorSound.playWin();
    this.dom.winStats.innerHTML = `
      <div><strong>${this.moveCount}</strong>Moves</div>
      <div><strong>${this.boxesPacked}</strong>Boxes Packed</div>
    `;
    this.dom.winModal.classList.remove('hidden');
  }

  sleep(ms) {
    return new Promise(res => setTimeout(res, ms));
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.movingGame = new MovingThreeGame();
});
