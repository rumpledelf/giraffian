/**
 * Boxes of 3 - Pantry / Triple Match sorting puzzle.
 * 3-per-row layout with occasional gaps.
 */

class BoxesOfThreeGame {
  constructor() {
    // Total boxes: 6 (2 rows of 3), 9 (3 rows of 3), 12 (4 rows of 3)
    this.totalBoxesCount = parseInt(localStorage.getItem('boxes3_totalBoxes') || '9', 10);
    this.currentTheme = localStorage.getItem('boxes3_theme') || 'pantry';
    this.currentLevel = parseInt(localStorage.getItem('boxes3_level') || '1', 10);

    // Pantry & Shape theme dictionaries
    this.themes = {
      pantry: [
        { id: 1, name: 'Honey', icon: '🍯' },
        { id: 2, name: 'Coffee', icon: '☕' },
        { id: 3, name: 'Jam', icon: '🍓' },
        { id: 4, name: 'Matcha', icon: '🍵' },
        { id: 5, name: 'Croissant', icon: '🥐' },
        { id: 6, name: 'Avocado', icon: '🥑' },
        { id: 7, name: 'Olive Oil', icon: '🫒' },
        { id: 8, name: 'Cheese', icon: '🧀' },
        { id: 9, name: 'Baguette', icon: '🥖' },
        { id: 10, name: 'Orange', icon: '🍊' },
        { id: 11, name: 'Teapot', icon: '🫖' },
        { id: 12, name: 'Cookie', icon: '🍪' },
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
      ]
    };

    // boxes structure: array of objects { items: [id, id, ...], isClosed: boolean }
    this.boxes = [];
    this.selected = null; // { boxIdx, itemIdx }
    this.moveHistory = [];
    this.moveCount = 0;
    this.boxesPacked = 0;
    this.targetPackedBoxes = 0;
    this.isLocked = false;

    this.dom = {
      grid: document.getElementById('pantry-grid'),
      levelBadge: document.getElementById('level-badge'),
      itemsLeft: document.getElementById('items-left-count'),
      boxesClearedCount: document.getElementById('boxes-cleared-count'),
      btnRestart: document.getElementById('btn-restart'),
      btnUndo: document.getElementById('btn-undo'),
      undoCount: document.getElementById('undo-count'),
      btnHint: document.getElementById('btn-hint'),
      btnNew: document.getElementById('btn-new'),
      btnSound: document.getElementById('btn-sound'),
      soundIconOn: document.getElementById('sound-icon-on'),
      soundIconOff: document.getElementById('sound-icon-off'),
      btnSettings: document.getElementById('btn-settings'),
      btnThemeToggle: document.getElementById('btn-theme-toggle'),
      themeIcon: document.getElementById('theme-icon'),
      winModal: document.getElementById('win-modal'),
      winStats: document.getElementById('win-stats'),
      btnNextLevel: document.getElementById('btn-next-level'),
      settingsModal: document.getElementById('settings-modal'),
      itemTypesSelect: document.getElementById('item-types-select'),
      themeSelect: document.getElementById('theme-select'),
      btnCloseSettings: document.getElementById('btn-close-settings'),
      btnApplySettings: document.getElementById('btn-apply-settings'),
    };

    this.initEvents();
    this.updateSoundIcons();
    this.updateThemeIcon();
    this.startNewGame();
  }

  initEvents() {
    this.dom.btnRestart.addEventListener('click', () => this.restartGame());
    this.dom.btnUndo.addEventListener('click', () => this.undoMove());
    this.dom.btnHint.addEventListener('click', () => this.provideHint());
    this.dom.btnNew.addEventListener('click', () => {
      this.currentLevel++;
      localStorage.setItem('boxes3_level', this.currentLevel);
      this.startNewGame();
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        if (this.selected) {
          this.selected = null;
          this.render();
        }
      }
    });

    this.dom.btnThemeToggle.addEventListener('click', () => {
      this.currentTheme = this.currentTheme === 'pantry' ? 'shapes' : 'pantry';
      localStorage.setItem('boxes3_theme', this.currentTheme);
      this.updateThemeIcon();
      this.render();
    });

    this.dom.btnSound.addEventListener('click', () => {
      window.pantrySound.toggleMute();
      this.updateSoundIcons();
    });

    this.dom.btnSettings.addEventListener('click', () => {
      this.dom.itemTypesSelect.value = this.totalBoxesCount;
      this.dom.themeSelect.value = this.currentTheme;
      this.dom.settingsModal.classList.remove('hidden');
    });

    this.dom.btnCloseSettings.addEventListener('click', () => {
      this.dom.settingsModal.classList.add('hidden');
    });

    this.dom.btnApplySettings.addEventListener('click', () => {
      this.totalBoxesCount = parseInt(this.dom.itemTypesSelect.value, 10);
      this.currentTheme = this.dom.themeSelect.value;

      localStorage.setItem('boxes3_totalBoxes', this.totalBoxesCount);
      localStorage.setItem('boxes3_theme', this.currentTheme);

      this.updateThemeIcon();
      this.dom.settingsModal.classList.add('hidden');
      this.startNewGame();
    });

    this.dom.btnNextLevel.addEventListener('click', () => {
      this.dom.winModal.classList.add('hidden');
      this.currentLevel++;
      localStorage.setItem('boxes3_level', this.currentLevel);
      this.startNewGame();
    });

    this.dom.settingsModal.addEventListener('click', (e) => {
      if (e.target === this.dom.settingsModal) {
        this.dom.settingsModal.classList.add('hidden');
      }
    });
  }

  updateSoundIcons() {
    const muted = window.pantrySound.isMuted();
    if (muted) {
      this.dom.soundIconOn.classList.add('hidden');
      this.dom.soundIconOff.classList.remove('hidden');
    } else {
      this.dom.soundIconOn.classList.remove('hidden');
      this.dom.soundIconOff.classList.add('hidden');
    }
  }

  updateThemeIcon() {
    this.dom.themeIcon.textContent = this.currentTheme === 'pantry' ? '🍯' : '💎';
  }

  /* --- Solvable Scramble Generation with Occasional Gaps --- */

  startNewGame() {
    this.boardVersion = (this.boardVersion || 0) + 1;
    this.dom.winModal.classList.add('hidden');
    this.selected = null;
    this.moveHistory = [];
    this.moveCount = 0;
    this.boxesPacked = 0;
    this.isLocked = false;
    this.updateUndoButton();

    this.dom.levelBadge.textContent = `Level ${this.currentLevel}`;

    // Total boxes is always a multiple of 3 (6, 9, or 12)
    const B = this.totalBoxesCount;
    // Number of distinct triplet types is (B - 1), leaving exactly 3 slots as working gaps!
    const T = B - 1;
    this.targetPackedBoxes = T;

    const themeList = this.themes[this.currentTheme];
    const typesInGame = themeList.slice(0, T);

    // 1. Start in solved state
    // Boxes 0 to T-1 each have 3 matching items.
    // Box B-1 is empty (3 gaps).
    const board = [];
    for (let i = 0; i < T; i++) {
      const typeId = typesInGame[i].id;
      board.push([typeId, typeId, typeId]);
    }
    board.push([null, null, null]); // 1 spare working box (3 empty slots total)

    // 2. Perform reverse random scramble walk
    // Move items between boxes with room (having null slots).
    // This disperses empty spaces randomly (including in the middle) and tiles stay in fixed slots!
    const scrambleMoves = Math.max(80, B * 14);
    let movesDone = 0;

    while (movesDone < scrambleMoves) {
      // Pick source box that has items
      const nonEmpty = [];
      for (let i = 0; i < B; i++) {
        if (board[i].some(x => x !== null)) nonEmpty.push(i);
      }
      const fromBox = nonEmpty[Math.floor(Math.random() * nonEmpty.length)];

      // Pick target box with room (< 3 non-null)
      const hasRoom = [];
      for (let j = 0; j < B; j++) {
        if (j !== fromBox && board[j].some(x => x === null)) hasRoom.push(j);
      }
      if (hasRoom.length === 0) continue;
      const toBox = hasRoom[Math.floor(Math.random() * hasRoom.length)];

      // Pick random filled slot in fromBox
      const fromSlots = [0, 1, 2].filter(s => board[fromBox][s] !== null);
      const fromSlot = fromSlots[Math.floor(Math.random() * fromSlots.length)];

      // Pick random empty slot in toBox
      const toSlots = [0, 1, 2].filter(s => board[toBox][s] === null);
      const toSlot = toSlots[Math.floor(Math.random() * toSlots.length)];

      board[toBox][toSlot] = board[fromBox][fromSlot];
      board[fromBox][fromSlot] = null;
      movesDone++;
    }

    // Ensure we don't start with any box that is already 3 of the same item!
    for (let i = 0; i < B; i++) {
      if (board[i][0] !== null && board[i][0] === board[i][1] && board[i][1] === board[i][2]) {
        // Swap one item with another box to break the pre-match
        for (let j = 0; j < B; j++) {
          if (j !== i && board[j].some(x => x !== null)) {
            const jSlot = [0, 1, 2].find(s => board[j][s] !== null);
            const temp = board[i][0];
            board[i][0] = board[j][jSlot];
            board[j][jSlot] = temp;
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
    this.selected = null;
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

  /* --- Rendering --- */

  render() {
    this.dom.grid.innerHTML = '';
    const themeList = this.themes[this.currentTheme];

    this.boxes.forEach((box, boxIdx) => {
      const boxEl = document.createElement('div');
      boxEl.className = 'box';
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
        lidEl.innerHTML = `<span>✨ Packed & Ready ✨</span>`;
        slotsEl.appendChild(lidEl);
      } else {
        // 3 fixed slots per box
        for (let slotIdx = 0; slotIdx < 3; slotIdx++) {
          const slotEl = document.createElement('div');
          slotEl.className = 'slot';
          slotEl.dataset.slotIdx = slotIdx;

          const itemId = box.items[slotIdx];
          if (itemId !== null) {
            const itemDef = themeList.find(t => t.id === itemId) || { icon: '❓', name: 'Item' };

            const itemEl = document.createElement('div');
            itemEl.className = `item item-type-${itemId}`;
            itemEl.dataset.slotIdx = slotIdx;
            itemEl.textContent = itemDef.icon;
            itemEl.title = itemDef.name;

            if (this.currentTheme === 'shapes') {
              itemEl.classList.add('shape-item', `shape-${itemId}`);
            }

            if (this.selected && this.selected.boxIdx === boxIdx && this.selected.slotIdx === slotIdx) {
              itemEl.classList.add('selected');
            }

            slotEl.appendChild(itemEl);
          } else {
            // Empty slot indicator
            slotEl.classList.add('empty');
            slotEl.title = "Empty space";
          }

          slotsEl.appendChild(slotEl);
        }
      }

      boxEl.appendChild(slotsEl);

      if (!box.isClosed) {
        boxEl.addEventListener('click', (e) => this.handleBoxClick(boxIdx, e));
      }

      this.dom.grid.appendChild(boxEl);
    });
  }

  /* --- Interaction & Moves --- */

  handleBoxClick(boxIdx, e) {
    if (this.isLocked) return;
    const targetBox = this.boxes[boxIdx];
    if (targetBox.isClosed) return;

    // Check what was clicked: item or empty slot
    const itemEl = e.target.closest('.item');
    const emptySlotEl = e.target.closest('.slot.empty');
    const clickedItemSlot = itemEl ? parseInt(itemEl.dataset.slotIdx, 10) : null;
    const clickedEmptySlot = emptySlotEl ? parseInt(emptySlotEl.dataset.slotIdx, 10) : null;

    if (!this.selected) {
      // Pick up item
      if (clickedItemSlot === null) return;
      if (targetBox.items[clickedItemSlot] === null) return;

      this.selected = { boxIdx, slotIdx: clickedItemSlot };
      window.pantrySound.playPick();
      this.render();
    } else {
      // Destination box tapped
      const fromBoxIdx = this.selected.boxIdx;
      const fromSlotIdx = this.selected.slotIdx;

      // If clicked the exact same item, deselect
      if (fromBoxIdx === boxIdx && fromSlotIdx === clickedItemSlot) {
        this.selected = null;
        this.render();
        return;
      }

      // If clicking another item, change selection to that item
      if (clickedItemSlot !== null && (fromBoxIdx !== boxIdx || fromSlotIdx !== clickedItemSlot)) {
        this.selected = { boxIdx, slotIdx: clickedItemSlot };
        window.pantrySound.playPick();
        this.render();
        return;
      }

      // If clicking an empty slot or destination box
      const emptySlots = [0, 1, 2].filter(s => targetBox.items[s] === null);
      if (emptySlots.length === 0) {
        window.pantrySound.playInvalid();
        return;
      }

      const toSlotIdx = (clickedEmptySlot !== null && targetBox.items[clickedEmptySlot] === null)
        ? clickedEmptySlot
        : emptySlots[0];

      // Execute move
      this.executeMove(fromBoxIdx, fromSlotIdx, boxIdx, toSlotIdx);
    }
  }

  async executeMove(fromBoxIdx, fromSlotIdx, toBoxIdx, toSlotIdx) {
    const item = this.boxes[fromBoxIdx].items[fromSlotIdx];
    this.boxes[fromBoxIdx].items[fromSlotIdx] = null;
    this.boxes[toBoxIdx].items[toSlotIdx] = item;
    this.selected = null;
    this.moveCount++;

    window.pantrySound.playDrop();
    this.render();

    // Check if target box now has 3 identical items!
    const targetBox = this.boxes[toBoxIdx];
    let matched = false;

    if (targetBox.items[0] !== null && 
        targetBox.items[0] === targetBox.items[1] && 
        targetBox.items[1] === targetBox.items[2]) {
      matched = true;
    }

    // Save history entry
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
    window.pantrySound.playMatchPoof();

    const boxEl = this.dom.grid.children[boxIdx];
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

    // Box is now closed and sealed!
    this.boxes[boxIdx].isClosed = true;
    this.boxesPacked++;
    this.updateCounts();
    this.isLocked = false;
    this.render();

    // Check Win: all triplet boxes are packed!
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
      setTimeout(() => p.remove(), 600);
    }
  }

  undoMove() {
    if (this.isLocked || this.moveHistory.length === 0) return;

    this.selected = null;
    const last = this.moveHistory.pop();

    if (last.matched) {
      this.boxes[last.toBox].isClosed = false;
      this.boxesPacked--;
    }

    this.boxes[last.toBox].items[last.toSlot] = null;
    this.boxes[last.fromBox].items[last.fromSlot] = last.item;

    window.pantrySound.playDrop();
    this.updateUndoButton();
    this.updateCounts();
    this.render();
  }

  provideHint() {
    if (this.isLocked) return;

    // Remove old hint highlights
    document.querySelectorAll('.box.hinted').forEach(el => el.classList.remove('hinted'));

    // Find any open box with 2 of the same item
    for (let i = 0; i < this.boxes.length; i++) {
      const b = this.boxes[i];
      if (b.isClosed) continue;
      const validItems = b.items.filter(x => x !== null);
      if (validItems.length < 2) continue;

      const counts = {};
      validItems.forEach(id => counts[id] = (counts[id] || 0) + 1);
      for (let id in counts) {
        if (counts[id] === 2) {
          const targetId = parseInt(id, 10);
          for (let j = 0; j < this.boxes.length; j++) {
            if (i !== j && !this.boxes[j].isClosed && this.boxes[j].items.includes(targetId)) {
              this.highlightBoxes(i, j);
              return;
            }
          }
        }
      }
    }

    // Otherwise find two open boxes that share an item
    for (let i = 0; i < this.boxes.length; i++) {
      if (this.boxes[i].isClosed) continue;
      const itemsI = this.boxes[i].items.filter(x => x !== null);
      if (itemsI.length === 0) continue;
      for (let j = i + 1; j < this.boxes.length; j++) {
        if (this.boxes[j].isClosed) continue;
        const itemsJ = this.boxes[j].items.filter(x => x !== null);
        if (itemsJ.length === 0) continue;
        const common = itemsI.find(item => itemsJ.includes(item));
        if (common) {
          this.highlightBoxes(i, j);
          return;
        }
      }
    }
  }

  highlightBoxes(idx1, idx2) {
    const el1 = this.dom.grid.children[idx1];
    const el2 = this.dom.grid.children[idx2];
    if (el1) el1.classList.add('hinted');
    if (el2) el2.classList.add('hinted');

    setTimeout(() => {
      if (el1) el1.classList.remove('hinted');
      if (el2) el2.classList.remove('hinted');
    }, 2500);
  }

  handleWin() {
    window.pantrySound.playWin();
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
  window.boxesGame = new BoxesOfThreeGame();
});
