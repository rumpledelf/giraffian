import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../games/ants/game.js', import.meta.url), 'utf8');
const listeners = new Map();
let fanfares = 0;

const context = vm.createContext({
  console,
  confirm: () => false,
  gameStorage: {
    getItem(key) {
      if (key === 'ants_size') return '12';
      if (key === 'ants_grow') return 'false';
      return null;
    },
    setItem() {},
  },
  document: {
    addEventListener(name, callback) { listeners.set(name, callback); },
    getElementById() { return null; },
  },
  window: {
    addEventListener(name, callback) { listeners.set(name, callback); },
    antsAudio: { playWin() { fanfares++; } },
  },
  localStorage: {},
  setInterval() {},
});

vm.runInContext(source, context);
const AntsGame = vm.runInContext('AntsGame', context);

const modalClasses = new Set(['hidden']);
const game = Object.assign(Object.create(AntsGame.prototype), {
  gridSize: 1,
  grid: [[null]],
  activeBugs: [],
  stagingBays: [{ remaining: 0 }, null, null, null, null, null],
  isComplete: false,
  renderStaging() {},
  dom: {
    winModal: {
      classList: {
        remove(name) { modalClasses.delete(name); },
      },
    },
  },
});

game.checkWinCondition();
game.checkWinCondition();
game.checkWinCondition();

assert.equal(fanfares, 1, 'a completed board should play exactly one fanfare');
assert.equal(game.isComplete, true);
assert.equal(modalClasses.has('hidden'), false);
assert.deepEqual(game.stagingBays, [null, null, null, null, null, null]);

game.grid = [['R']];
game.checkWinCondition();
assert.equal(game.isComplete, false, 'a non-empty board should reset completion state');

game.grid = [[null]];
game.checkWinCondition();
assert.equal(fanfares, 2, 'a newly completed board should be allowed one fanfare');

console.log('Pixel Ants completion fanfare is one-shot per completed board.');

context.window.pixelPictures = [
  { id: 'one', size: 12, data: ['RGB...', '......'] },
  { id: 'two', size: 12, data: ['RGBY..', '......'] },
  { id: 'three', size: 12, data: ['RGBYO.', '......'] },
];

const modelGame = Object.assign(Object.create(AntsGame.prototype), {
  level: 1,
  selectedSize: 12,
  difficulty: 'easy',
  currentModelId: 'one',
});
modelGame.models = modelGame.initModels();
modelGame.loadPicture = model => { modelGame.currentModelId = model.id; };

assert.deepEqual(
  Array.from(modelGame.models, model => model.colorCount),
  [3, 4, 5],
  'transparent cells should not count as picture colours',
);

modelGame.loadRandomPictureForSize(12, true);
assert.equal(modelGame.currentModelId, 'two');
modelGame.loadRandomPictureForSize(12, true);
assert.equal(modelGame.currentModelId, 'three');
modelGame.loadRandomPictureForSize(12, true);
assert.equal(modelGame.currentModelId, 'one', 'New Picture should cycle through every eligible picture');

console.log('Pixel Ants picture colour counts and New Picture rotation are consistent.');

let layoutReads = 0;
const rect = values => ({
  getBoundingClientRect() {
    layoutReads++;
    return { width: 600, height: 600, left: 0, top: 0, right: 600, bottom: 600, ...values };
  },
});
const pathGame = Object.assign(Object.create(AntsGame.prototype), {
  gridSize: 100,
  cellSize: 6,
  grid: Array.from({ length: 100 }, () => Array(100).fill('R')),
  reservedPixels: new Set(),
  dom: {
    boardWrap: rect({ width: 728, height: 800 }),
    pixelCanvas: rect({ width: 600, height: 600, left: 64, top: 64, right: 664, bottom: 664 }),
    stagingBaysGrid: { children: [rect({ width: 80, height: 64, left: 20, top: 700, right: 100, bottom: 764 })] },
    orbitRail: rect({ width: 684, height: 684, left: 22, top: 22, right: 706, bottom: 706 }),
    antStage: null,
    bugCanvas: { width: 728, height: 800 },
  },
});

assert.ok(pathGame.findPathFromShuttleToClosestPixel(0, 'R'));
assert.ok(layoutReads <= 4, `one path search should capture layout once, not per border cell (read ${layoutReads} times)`);

console.log('Pixel Ants pathfinding captures DOM geometry once per dispatched ant.');
