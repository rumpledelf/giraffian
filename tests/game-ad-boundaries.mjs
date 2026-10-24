import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const gamesDir = new URL('../games/', import.meta.url);
const gamePages = fs.readdirSync(gamesDir, { withFileTypes: true })
  .filter(entry => entry.isDirectory())
  .map(entry => path.join(gamesDir.pathname, entry.name, 'index.php'))
  .filter(file => fs.existsSync(file) && fs.readFileSync(file, 'utf8').includes('id="game-app"'));

assert.ok(gamePages.length > 0, 'expected at least one game page');

for (const file of gamePages) {
  const source = fs.readFileSync(file, 'utf8');
  const label = path.relative(gamesDir.pathname, file);
  const gameMarker = source.indexOf('define("GAME_STRUCTURED_DATA", true)');
  const header = source.indexOf("'/includes/header.php'");
  const shellOpen = source.indexOf('<section id="game-unit" class="game-unit google-anno-skip">');
  const app = source.indexOf('id="game-app"');
  const shellClose = source.lastIndexOf('</section>');
  const firstGameScript = source.indexOf('<script src="/games/');

  assert.ok(gameMarker !== -1 && gameMarker < header, `${label} must identify itself as a game before rendering the header`);
  assert.ok(shellOpen !== -1 && shellOpen < app, `${label} must open the game boundary before #game-app`);
  assert.ok(shellClose > app, `${label} must close the game boundary after #game-app`);
  assert.ok(firstGameScript === -1 || shellClose < firstGameScript, `${label} should close the visual boundary before loading scripts`);

  for (const modal of source.matchAll(/id="[^"]+-modal"/g)) {
    assert.ok(modal.index > shellOpen && modal.index < shellClose, `${label} leaves ${modal[0]} outside the game boundary`);
  }
}

const headerSource = fs.readFileSync(new URL('../includes/header.php', import.meta.url), 'utf8');
assert.match(headerSource, /'@type' => \['VideoGame', 'WebApplication'\]/);
assert.match(headerSource, /'applicationCategory' => 'GameApplication'/);

console.log(`${gamePages.length} games expose an ad boundary and VideoGame structured data.`);
