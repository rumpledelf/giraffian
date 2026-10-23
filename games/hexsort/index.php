<?php define("TITLE", "Hex Sort"); ?>
<?php define("DESCRIPTION", "Ad-free, relaxing hex stack puzzle: place layered hexagon stacks on the board, chain colour flips across neighbours, and clear stacks of 10."); ?>
<?php include $_SERVER['DOCUMENT_ROOT'] . '/includes/header.php'; ?>

<link rel="stylesheet" href="/games/hexsort/style.css?v=<?= filemtime(__DIR__ . '/style.css') ?>">

<div id="game-app">
  <!-- Header Bar -->
  <div class="game-header">
    <div class="title-group">
      <h1>Hex Sort</h1>
      <span id="level-badge" class="button yellow level-badge">Level 1: Honeycomb</span>
    </div>
    <div class="header-actions">
      <button id="btn-sound" class="button aqua icon-btn" title="Toggle Sound" aria-label="Toggle Sound">
        <svg id="sound-icon-on" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
        </svg>
        <svg id="sound-icon-off" class="hidden" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
          <line x1="23" y1="9" x2="17" y2="15"></line>
          <line x1="17" y1="9" x2="23" y2="15"></line>
        </svg>
      </button>

      <button id="btn-settings" class="button grey icon-btn" title="Settings" aria-label="Settings">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
      </button>
    </div>
  </div>

  <p class="game-instructions">
    Tap a stack in the tray, then tap an empty hex on the board (or drag it over). Neighbours with matching top colours flip together—stack 10 of one colour to clear!
  </p>

  <!-- Status Bar -->
  <div class="status-bar">
    <div id="goal-label">Tiles cleared: <strong id="tiles-cleared">0</strong><span id="target-wrap"> / <strong id="tiles-target">80</strong></span></div>
    <div>Stacks cleared: <strong id="stacks-cleared">0</strong></div>
  </div>

  <!-- Progress Bar (hidden in endless mode) -->
  <div id="progress-track" class="progress-track" aria-hidden="true">
    <div id="progress-fill" class="progress-fill"></div>
  </div>

  <!-- Playfield: Hexagonal Board -->
  <div class="playfield-container">
    <div class="board-frame" id="board-frame">
      <div id="hex-board" class="hex-board" aria-label="Hexagonal board"></div>
    </div>
  </div>

  <!-- 3-Slot Stack Tray (fixed positions, never shifts) -->
  <div class="tray-container">
    <div class="tray-frame">
      <div id="hex-tray" class="hex-tray" aria-label="Offered hex stacks"></div>
    </div>
  </div>

  <!-- Toolbar Controls -->
  <footer class="toolbar">
    <button id="btn-restart" class="button grey" title="Restart this level (R)">↺ Restart</button>
    <button id="btn-undo" class="button yellow" title="Undo last placement (U)">↶ Undo</button>
    <button id="btn-shuffle" class="button purple" title="Replace the three offered stacks (S)">⇄ Shuffle</button>
    <button id="btn-new" class="button aqua" title="Fresh board, same level (N)">★ New Board</button>
  </footer>
</div>

<!-- Victory Modal -->
<div id="win-modal" class="modal-backdrop hidden">
  <div class="modal-card">
    <div class="celebration-icon">✨⬡✨</div>
    <h2>Level Complete!</h2>
    <p class="modal-subtext">You reached the tile target with cascading hex flips.</p>
    <div class="modal-stats" id="win-stats"></div>
    <div class="modal-actions">
      <button id="btn-next-level" class="button green">Next Level &rarr;</button>
    </div>
  </div>
</div>

<!-- Jammed ("No room left!") Modal -->
<div id="jam-modal" class="modal-backdrop hidden">
  <div class="modal-card">
    <h2>No room left!</h2>
    <p class="modal-subtext">Every hex cell on the board is full. Shuffle regroups stacks and deals three fresh ones for free, or take back your last move.</p>
    <div class="modal-actions">
      <button id="btn-jam-shuffle" class="button aqua">⇄ Shuffle</button>
      <button id="btn-jam-undo" class="button yellow">↶ Undo</button>
      <button id="btn-jam-restart" class="button grey">↺ Restart</button>
    </div>
  </div>
</div>

<!-- Settings Modal -->
<div id="settings-modal" class="modal-backdrop hidden">
  <div class="modal-card settings-card">
    <h2>Hex Sort Settings</h2>
    <div class="setting-row">
      <label for="layout-select">Board Layout:</label>
      <select id="layout-select">
        <option value="auto" selected>Vary by Level (New shape each level)</option>
        <option value="small">Small Hive (7 hexes)</option>
        <option value="blossom">Blossom (13 hexes)</option>
        <option value="bridges">Twin Bridges (16 hexes)</option>
        <option value="butterfly">Butterfly (17 hexes)</option>
        <option value="hourglass">Hourglass (17 hexes)</option>
        <option value="ring">Honeycomb Ring (18 hexes)</option>
        <option value="honeycomb">Classic Honeycomb (19 hexes)</option>
        <option value="wide">Wide Hive (23 hexes)</option>
        <option value="large">Grand Hive (37 hexes)</option>
      </select>
    </div>
    <div class="setting-row">
      <label for="target-select">Tiles to Clear per Level:</label>
      <select id="target-select">
        <option value="60">Quick (60 tiles)</option>
        <option value="progressive" selected>Progressive (80 + 20 per level)</option>
        <option value="150">Long (150 tiles)</option>
        <option value="250">Marathon (250 tiles)</option>
      </select>
    </div>
    <div class="setting-row">
      <label for="mode-select">Mode:</label>
      <select id="mode-select">
        <option value="levels" selected>Levels: reach the tile target</option>
        <option value="endless">Endless: just keep clearing</option>
      </select>
    </div>
    <p id="save-status" role="status">Your board and progress are saved in this browser.</p>
    <p class="center"><button id="btn-reset-progress" class="button grey" type="button">Reset progress</button></p>
    <div class="modal-actions">
      <button id="btn-close-settings" class="button grey">Cancel</button>
      <button id="btn-apply-settings" class="button green">Apply & New Game</button>
    </div>
  </div>
</div>

<script src="/games/hexsort/storage.js?v=<?= filemtime(__DIR__ . '/storage.js') ?>"></script>
<script src="/games/hexsort/audio.js?v=<?= filemtime(__DIR__ . '/audio.js') ?>"></script>
<script src="/games/hexsort/game.js?v=<?= filemtime(__DIR__ . '/game.js') ?>"></script>

<?php include $_SERVER['DOCUMENT_ROOT'] . '/includes/footer.php'; ?>
