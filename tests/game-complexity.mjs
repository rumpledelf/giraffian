import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = file => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

const ballSource = read('games/sortingballs/game.js');
const ballMarkup = read('games/sortingballs/index.php');
const ballStyles = read('games/sortingballs/style.css');
const ballContext = vm.createContext({
  console,
  document: { addEventListener() {} },
  window: { addEventListener() {} },
  localStorage: {},
  setInterval() {},
});
vm.runInContext(ballSource, ballContext);
const BallSortGame = vm.runInContext('BallSortGame', ballContext);
const ballGame = Object.assign(Object.create(BallSortGame.prototype), {
  colorCount: 16,
  vialCapacity: 8,
  emptyVials: 6,
});
const largeBallBoard = ballGame.generateSolvableLevel();
assert.equal(largeBallBoard.length, 22);
for (let color = 1; color <= 16; color++) {
  assert.equal(largeBallBoard.flat().filter(value => value === color).length, 8);
}
assert.match(ballMarkup, /<option value="16">16<\/option>/);
assert.match(ballMarkup, /<option value="8">8 balls<\/option>/);
assert.match(ballMarkup, /<option value="6">6 spares<\/option>/);
assert.match(ballStyles, /\.ball-color-16/);
assert.match(ballStyles, /\.ball-color-1[^}]+#ad4242/, 'Ball Sort should use the Giraffian logo red');

const pantrySource = read('games/boxesof3/game.js');
const pantryMarkup = read('games/boxesof3/index.php');
assert.match(pantrySource, /Math\.min\(18,/);
assert.match(pantrySource, /id: 18, name: 'Grapes'/);
assert.match(pantrySource, /id: 18, name: 'Shield'/);
assert.match(pantryMarkup, /<option value="18">18 Boxes/);

const conveyorSource = read('games/moving3/game.js');
const conveyorMarkup = read('games/moving3/index.php');
assert.match(conveyorSource, /this\.trackCount \* this\.boxesPerTrack/);
assert.match(conveyorSource, /track < this\.trackCount/);
assert.match(conveyorSource, /\[3,4\]\.includes\(s\.trackCount\)/);
assert.match(conveyorMarkup, /id="belt-3"/);
assert.match(conveyorMarkup, /<option value="4">4 tracks<\/option>/);

console.log('Expanded complexity caps verified: 16×8 Ball Sort with 6 spares, 18-box Pantry, and 4×6 Conveyors.');
