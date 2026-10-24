<?php define("TITLE", "Boxes of 3"); ?>
<?php define("GAME_STRUCTURED_DATA", true); ?>
<?php include $_SERVER['DOCUMENT_ROOT'] . '/includes/header.php'; ?>

<link rel="stylesheet" href="/games/boxesof3/style.css?v=<?= filemtime(__DIR__ . '/style.css') ?>">

<section id="game-unit" class="game-unit google-anno-skip">
<div id="game-app">
  <div class="game-header">
    <div class="title-group">
      <h1>Boxes of 3</h1>
      <span class="level-badge button yellow" id="level-badge">Level 1</span>
    </div>

    <div class="header-actions">
      <button class="button yellow theme-toggle-btn" id="btn-theme-toggle" title="Switch Theme (Pantry / Crystals)">
        <span id="theme-icon">🍯</span>
      </button>
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
      <button id="btn-settings" class="button grey icon-btn" title="Options" aria-label="Settings">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
      </button>
    </div>
  </div>

  <div class="game-instructions">
    Tap an item to pick it up, then tap an open box with space to move it. Match 3 identical items in any box to pack and seal it!
  </div>

  <div class="status-bar">
    <div>Items left: <strong id="items-left-count">0</strong></div>
    <div>Boxes packed: <strong id="boxes-cleared-count">0</strong></div>
  </div>

  <main class="game-area">
    <div id="pantry-grid" class="pantry-grid"></div>
  </main>

  <footer class="toolbar">
    <button id="btn-restart" class="button grey" title="Restart this puzzle">↺ Restart</button>
    <button id="btn-undo" class="button yellow" title="Undo Move">↶ Undo (<span id="undo-count">0</span>)</button>
    <button id="btn-hint" class="button aqua" title="Show Hint">💡 Hint</button>
    <button id="btn-new" class="button green" title="New Puzzle">★ New Puzzle</button>
  </footer>

  <!-- Win Modal -->
  <div id="win-modal" class="modal-backdrop hidden">
    <div class="modal-card">
      <div class="celebration-icon">✨📦✨</div>
      <h2>Pantry Packed!</h2>
      <p class="modal-subtext">Every triplet matched and neatly packed away.</p>
      <div class="modal-stats" id="win-stats"></div>
      <button id="btn-next-level" class="button green">Next Puzzle ➔</button>
    </div>
  </div>

  <!-- Settings Dialog -->
  <div id="settings-modal" class="modal-backdrop hidden">
    <div class="modal-card settings-card">
      <h2>Customise Pantry</h2>
      <div class="setting-row">
        <label for="item-types-select">Starting shelf grid:</label>
        <select id="item-types-select">
          <option value="6">6 Boxes (2 rows of 3)</option>
          <option value="9" selected>9 Boxes (3 rows of 3)</option>
          <option value="12">12 Boxes (4 rows of 3)</option>
          <option value="15">15 Boxes (5 rows of 3)</option>
          <option value="18">18 Boxes (6 rows of 3)</option>
        </select>
      </div>
      <div class="setting-row">
        <label for="theme-select">Theme:</label>
        <select id="theme-select">
          <option value="pantry" selected>Pantry (Jam, Honey, Bread, Fruit)</option>
          <option value="shapes">Crystals (Gems, Stars, Moons)</option>
        </select>
      </div>
      <p><label><input type="checkbox" id="grow-difficulty" checked> Grow puzzle size as I finish levels</label></p>
    <p id="save-status" role="status">Your board and progress are saved in this browser.</p>
    <p class="center"><button id="btn-reset-progress" class="button grey" type="button">Reset progress</button></p>
    <div class="modal-actions">
        <button id="btn-close-settings" class="button grey">Cancel</button>
        <button id="btn-apply-settings" class="button green">Apply & New Game</button>
      </div>
    </div>
  </div>
</div>

</section>

<script src="/games/boxesof3/storage.js?v=<?= filemtime(__DIR__ . '/storage.js') ?>"></script>
<script src="/games/boxesof3/audio.js?v=<?= filemtime(__DIR__ . '/audio.js') ?>"></script>
<script src="/games/boxesof3/game.js?v=<?= filemtime(__DIR__ . '/game.js') ?>"></script>

<?php include $_SERVER['DOCUMENT_ROOT'] . '/includes/footer.php'; ?>
