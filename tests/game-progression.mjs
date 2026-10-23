// Run with: node tests/game-progression.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const context = vm.createContext({
  window: { addEventListener() {} }, document: { addEventListener() {}, body: { insertAdjacentHTML() {} } },
  performance, console
});
vm.runInContext(fs.readFileSync(new URL('../games/tilepile/game.js', import.meta.url), 'utf8') +
  '\nglobalThis.Game = TilePileGame;', context);
const game = Object.create(context.Game.prototype);
game.themes = { pantry: { items: ['a','b','c','d','e','f','g','h','i','j'] } };
game.themeKey = 'pantry';
const assign = game.assignSolvableSymbols;
let witness;
game.assignSolvableSymbols = function (slots, ...args) {
  witness = [];
  // Record the generator's intended legal order, then independently play it.
  for (const slot of slots) {
    let symbol;
    Object.defineProperty(slot, 'symbol', {
      get: () => symbol,
      set: value => { symbol = value; witness.push(slot); },
      enumerable: true
    });
  }
  assign.call(this, slots, ...args);
};
let boards = 0;
for (const level of [1,2,3,4,5,8,9,12,13,16,17,24,100]) {
  for (let attempt = 0; attempt < 20; attempt++) {
    game.level = level;
    const tiles = game.generatePile(level);
    const remaining = new Set(witness);
    const tray = [];
    assert.equal(tiles.length % 3, 0);
    assert.equal(witness.length, tiles.length);
    for (const tile of witness) {
      assert.ok(![...remaining].some(top => game.tileCovers(top, tile)), `covered tile at level ${level}`);
      assert.ok(tray.length < 7, `tray jam at level ${level}`);
      remaining.delete(tile);
      tray.push(tile.symbol);
      if (tray.filter(s => s === tile.symbol).length === 3) {
        for (let i = tray.length - 1; i >= 0; i--) if (tray[i] === tile.symbol) tray.splice(i, 1);
      }
    }
    assert.equal(tray.length, 0);
    boards++;
  }
}
console.log(`${boards} Tile Pile boards: legal removal order, seven-slot tray limit, complete triplets.`);
