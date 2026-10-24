// Run with: node tests/colorchutes-solvability.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const mockDOM = {
  app: {},
  boardFrame: {},
  boardGrid: { innerHTML: '', appendChild() {} },
  tilesRemaining: {},
  spacesOpen: {},
  movesCount: {},
  levelBadge: {},
  btnSound: { addEventListener() {} },
  soundOnIcon: { classList: { toggle() {} } },
  soundOffIcon: { classList: { toggle() {} } },
  btnSettings: { addEventListener() {} },
  settingsModal: { classList: { add() {}, remove() {} } },
  sizeSelect: { value: '4' },
  btnCloseSettings: { addEventListener() {} },
  btnApplySettings: { addEventListener() {} },
  btnRestart: { addEventListener() {} },
  btnUndo: { addEventListener() {} },
  btnHint: { addEventListener() {} },
  btnNew: { addEventListener() {} },
  winModal: { classList: { add() {}, remove() {} } },
  winStats: { innerHTML: '' },
  btnNextLevel: { addEventListener() {} },
  countTop: {},
  countBottom: {},
  countLeft: {},
  countRight: {}
};

const context = vm.createContext({
  window: {
    addEventListener() {},
    location: { search: '' }
  },
  document: {
    getElementById(id) {
      if (id === 'grow-difficulty') return { checked: true };
      if (id === 'btn-reset-progress') return { addEventListener() {} };
      if (id === 'save-status') return {};
      return mockDOM[id] || { addEventListener() {}, classList: { add() {}, remove() {}, toggle() {} } };
    },
    addEventListener() {},
    createElement() {
      return {
        classList: { add() {}, remove() {} },
        style: {},
        dataset: {},
        appendChild() {},
        remove() {}
      };
    }
  },
  localStorage: {
    getItem() { return null; },
    setItem() {},
    removeItem() {}
  },
  requestAnimationFrame(fn) { setTimeout(fn, 0); },
  setInterval() {},
  setTimeout,
  clearTimeout,
  console
});

// Load storage.js, audio.js, and game.js
const storageSrc = fs.readFileSync(new URL('../games/colorchutes/storage.js', import.meta.url), 'utf8');
const audioSrc = fs.readFileSync(new URL('../games/colorchutes/audio.js', import.meta.url), 'utf8');
const gameSrc = fs.readFileSync(new URL('../games/colorchutes/game.js', import.meta.url), 'utf8');

vm.runInContext(storageSrc + '\n' + audioSrc + '\n' + gameSrc, context);

const ColorChutesGame = context.window.ColorChutesGame;
const PALETTE = context.window.PALETTE;

// Verify logo red is properly registered
assert.equal(PALETTE.red.hex, '#ad4242', 'Logo red #ad4242 must be registered in PALETTE');
console.log('✓ Palette verified: red is logo #ad4242');

let testCount = 0;
// Test board generation across grid sizes and levels
for (const size of [4, 5, 6]) {
  for (const level of [1, 2, 5, 10]) {
    const game = Object.create(ColorChutesGame.prototype);
    game.gridSize = size;
    game.level = level;
    game.dom = mockDOM;
    game.audio = { playSlide() {}, playChuteExit() {}, playBlocked() {}, playUndo() {}, playWin() {}, isMuted() { return true; } };

    game.generateSolvableBoard();

    const expectedTiles = (size * size) - 1;
    assert.equal(game.tiles.size, expectedTiles, `Must have ${expectedTiles} tiles for ${size}x${size}`);

    // Verify grid occupancy: exactly 1 null, every other cell has a valid tile ID
    let nullCount = 0;
    const tileIds = new Set();
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const val = game.grid[r][c];
        if (val === null) {
          nullCount++;
        } else {
          assert.ok(game.tiles.has(val), `Grid contains unknown tile ID ${val}`);
          tileIds.add(val);
          const t = game.tiles.get(val);
          assert.equal(t.r, r);
          assert.equal(t.c, c);
        }
      }
    }

    assert.equal(nullCount, 1, `Must have exactly 1 empty cell on the board at start`);
    assert.equal(tileIds.size, expectedTiles, `All tile IDs must be placed on the grid`);
    testCount++;
  }
}

console.log(`✓ Passed ${testCount} board generation and coordinate integrity tests across 4x4, 5x5, and 6x6 sizes.`);

// Test Move Mechanics & Undo
{
  const game = Object.create(ColorChutesGame.prototype);
  game.gridSize = 4;
  game.level = 1;
  game.dom = mockDOM;
  game.audio = { playSlide() {}, playChuteExit() {}, playBlocked() {}, playUndo() {}, playWin() {}, isMuted() { return true; } };
  game.undoStack = [];
  game.moveCount = 0;
  game.generateSolvableBoard();

  // Find tile adjacent to empty cell
  let emptyR = -1, emptyC = -1;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (game.grid[r][c] === null) { emptyR = r; emptyC = c; break; }
    }
  }

  const neighborPos = [
    { r: emptyR - 1, c: emptyC },
    { r: emptyR + 1, c: emptyC },
    { r: emptyR, c: emptyC - 1 },
    { r: emptyR, c: emptyC + 1 }
  ].find(n => game.isValidCell(n.r, n.c) && game.grid[n.r][n.c] !== null);

  const tileToMove = game.tiles.get(game.grid[neighborPos.r][neighborPos.c]);
  const origR = tileToMove.r, origC = tileToMove.c;

  // Slide tile to empty
  game.slideTileToEmpty(tileToMove, emptyR, emptyC);
  assert.equal(tileToMove.r, emptyR);
  assert.equal(tileToMove.c, emptyC);
  assert.equal(game.grid[origR][origC], null);
  assert.equal(game.moveCount, 1);
  assert.equal(game.undoStack.length, 1);

  // Undo move
  game.undo();
  assert.equal(game.moveCount, 0);
  const restoredTile = game.tiles.get(tileToMove.id);
  assert.equal(restoredTile.r, origR);
  assert.equal(restoredTile.c, origC);
  assert.equal(game.grid[emptyR][emptyC], null);
  console.log('✓ Slide mechanics and Undo verified.');

  // Test Restart
  game.slideTileToEmpty(tileToMove, emptyR, emptyC);
  assert.equal(game.moveCount, 1);
  game.restartGame();
  assert.equal(game.moveCount, 0);
  assert.equal(game.undoStack.length, 0);
  const restartedTile = game.tiles.get(tileToMove.id);
  assert.equal(restartedTile.r, origR);
  assert.equal(restartedTile.c, origC);
  console.log('✓ Restart restored initial board and reset move count.');

  // Test Arrow-Direction Tap Logic
  // Tap should strictly move in pal.dir if empty, or stay in place if blocked
  const pal = PALETTE[tileToMove.color];
  let expectedDr = 0, expectedDc = 0;
  if (pal.dir === 'up') expectedDr = -1;
  else if (pal.dir === 'down') expectedDr = 1;
  else if (pal.dir === 'left') expectedDc = -1;
  else if (pal.dir === 'right') expectedDc = 1;

  const arrowTargetR = tileToMove.r + expectedDr;
  const arrowTargetC = tileToMove.c + expectedDc;
  const isArrowTargetEmpty = game.isValidCell(arrowTargetR, arrowTargetC) && game.grid[arrowTargetR][arrowTargetC] === null;

  const preTapR = tileToMove.r, preTapC = tileToMove.c;
  game.handleTileTap(tileToMove);

  if (isArrowTargetEmpty) {
    assert.equal(tileToMove.r, arrowTargetR);
    assert.equal(tileToMove.c, arrowTargetC);
    console.log('✓ Arrow tap stepped forward in arrow direction.');
  } else {
    // Should NOT jump sideways or backwards into other empty spaces!
    assert.equal(tileToMove.r, preTapR);
    assert.equal(tileToMove.c, preTapC);
    console.log('✓ Blocked arrow tap remained in place without random sideways jumping.');
  }

  // Test Dragging Out Through Exit Edge
  let edgeTile = null;
  for (const t of game.tiles.values()) {
    if (!t.evacuated && game.isAtHomeChute(t)) { edgeTile = t; break; }
  }
  if (!edgeTile) {
    const mouthCell = game.getExitCells('red')[0];
    const occupant = game.grid[mouthCell.r][mouthCell.c];
    edgeTile = game.tiles.get(occupant) || Array.from(game.tiles.values()).find(t => !t.evacuated);
    game.grid[edgeTile.r][edgeTile.c] = null;
    edgeTile.color = 'red';
    edgeTile.r = mouthCell.r;
    edgeTile.c = mouthCell.c;
    game.grid[mouthCell.r][mouthCell.c] = edgeTile.id;
  }
  const edgeDir = PALETTE[edgeTile.color].dir;
  const edgeR = edgeTile.r, edgeC = edgeTile.c;
  game.handleTileSwipe(edgeTile, edgeDir);
  assert.ok(edgeTile.evacuated, 'Tile dragged toward exit edge must evacuate');
  assert.equal(game.grid[edgeR][edgeC], null, 'Evacuated tile space becomes empty');
  console.log('✓ Dragging out across colored exit edge evacuates tile.');
}

// Chute mouths narrow with level and only mouth cells lead out
{
  const game = Object.create(ColorChutesGame.prototype);
  assert.equal(game.exitWidthForLevel(4, 1), 4, 'Level 1 opens the whole side');
  assert.equal(game.exitWidthForLevel(5, 4), 4);
  assert.equal(game.exitWidthForLevel(6, 10), 2);
  assert.equal(game.exitWidthForLevel(4, 99), 2, 'Mouths never close below two cells');
  for (let level = 2; level < 30; level++) {
    assert.ok(game.exitWidthForLevel(6, level) <= game.exitWidthForLevel(6, level - 1), 'Mouths never widen');
  }

  for (const size of [4, 5, 6]) {
    for (const level of [1, 3, 8, 20]) {
      const g = Object.create(ColorChutesGame.prototype);
      g.gridSize = size;
      g.level = level;
      g.generateSolvableBoard();
      for (const [color, exit] of Object.entries(g.exits)) {
        assert.equal(exit.width, g.exitWidthForLevel(size, level));
        assert.ok(exit.start >= 0 && exit.start + exit.width <= size, `${color} mouth stays on its side`);
      }
    }
  }

  const g = Object.create(ColorChutesGame.prototype);
  g.gridSize = 6;
  g.exits = { red: { start: 2, width: 2 }, blue: { start: 0, width: 6 }, green: { start: 0, width: 6 }, yellow: { start: 0, width: 6 } };
  assert.ok(g.isAtHomeChute({ color: 'red', r: 0, c: 3 }), 'Red inside its mouth exits');
  assert.ok(!g.isAtHomeChute({ color: 'red', r: 0, c: 0 }), 'Red against the wall beside its mouth stays');
  assert.ok(!g.isAtHomeChute({ color: 'red', r: 1, c: 3 }), 'Red one row in stays');
  console.log('✓ Chute mouths narrow with level and only mouth cells evacuate.');
}

// A restored board (no generator run) must still evacuate with real audio arguments
{
  const game = Object.create(ColorChutesGame.prototype);
  game.gridSize = 4;
  game.level = 9;
  game.dom = mockDOM;
  game.undoStack = [];
  game.moveCount = 0;
  game.generateSolvableBoard();
  const saved = JSON.parse(JSON.stringify(game.captureState()));

  const restored = Object.create(ColorChutesGame.prototype);
  restored.dom = mockDOM;
  restored.undoStack = [];
  restored.audio = { playChuteExit(combo) { assert.ok(Number.isFinite(combo), 'Exit chime needs a finite combo'); }, playWin() {} };
  restored.restoreState(saved);
  assert.equal(JSON.stringify(restored.exits), JSON.stringify(game.exits), 'Mouth positions survive save and reload');

  const tile = Array.from(restored.tiles.values())[0];
  restored.evacuateTile(tile);
  assert.ok(tile.evacuated);
  console.log('✓ Restored boards keep their mouths and evacuate without an audio crash.');
}

// Dragging carries a tile through empty cells and out of its mouth as one move
{
  const game = Object.create(ColorChutesGame.prototype);
  game.gridSize = 4;
  game.dom = mockDOM;
  game.undoStack = [];
  game.moveCount = 0;
  game.audio = { playSlide() {}, playChuteExit() {}, playWin() {} };
  game.exits = { red: { start: 2, width: 2 }, blue: { start: 0, width: 4 }, green: { start: 0, width: 4 }, yellow: { start: 0, width: 4 } };
  game.grid = Array.from({ length: 4 }, () => Array(4).fill(null));
  game.tiles = new Map();
  const red = { id: 1, color: 'red', r: 3, c: 0, evacuated: false, el: null };
  const wall = { id: 2, color: 'blue', r: 2, c: 0, evacuated: false, el: null };
  for (const t of [red, wall]) { game.tiles.set(t.id, t); game.grid[t.r][t.c] = t.id; }

  assert.ok(game.dragTileToward(red, 3, 3, true), 'Drag along the bottom row');
  assert.deepEqual([red.r, red.c], [3, 3]);
  game.dragTileToward(red, 1, 3, false);
  assert.deepEqual([red.r, red.c], [1, 3], 'Drag up the right column');
  game.dragTileToward(red, 0, 0, false);
  assert.ok(!red.evacuated, 'Red on the top wall outside its mouth stays');
  game.dragTileToward(red, -1, red.c, false);
  assert.ok(!red.evacuated && red.r === 0, 'Pulling up against the wall does nothing');
  game.dragTileToward(red, 0, 2, false);
  game.dragTileToward(red, -1, 2, false);
  assert.ok(red.evacuated, 'Pulling up through the mouth exits');
  assert.equal(game.moveCount, 1, 'One drag counts as one move');
  assert.equal(game.undoStack.length, 1, 'One drag is one undo');
  console.log('✓ Dragging steers a tile through empty cells and out of its mouth as one move.');
}
