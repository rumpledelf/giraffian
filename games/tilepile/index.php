<?php define("TITLE", "Tile Pile Match"); ?>
<?php define("DESCRIPTION", "Relaxing, ad-free puzzle: match triplets of layered tiles into a 7-slot tray to clear the pile."); ?>
<?php include $_SERVER['DOCUMENT_ROOT'] . '/includes/header.php'; ?>

<link rel="stylesheet" href="/games/tilepile/style.css?v=<?= filemtime(__DIR__ . '/style.css') ?>">

<div id="game-app">
  <!-- Header Bar -->
  <div class="game-header">
    <div class="title-group">
      <h1>Tile Pile</h1>
      <span id="level-badge" class="button yellow level-badge">Level 1</span>
    </div>

    <div class="header-actions">
      <button id="btn-theme-toggle" class="button yellow theme-toggle-btn" title="Switch Theme">
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

      <button id="btn-settings" class="button grey icon-btn" title="Settings" aria-label="Settings">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
      </button>
    </div>
  </div>

  <p class="game-instructions">
    Tap free, uncovered tiles to place them into the tray. Match 3 of the same item to clear them!
  </p>

  <!-- Status Bar -->
  <div class="status-bar">
    <div>Tiles remaining: <strong id="tiles-left">0</strong></div>
    <div>Sets cleared: <strong id="matches-cleared">0</strong></div>
  </div>

  <!-- Playfield: Board Frame & Pile Stage -->
  <div class="playfield-container">
    <div class="board-frame" id="board-frame">
      <div id="pile-stage" class="pile-stage" aria-label="Tile Pile area"></div>
    </div>
  </div>

  <!-- Holding Tray (7 Slots) -->
  <div class="tray-container">
    <div class="tray-frame">
      <div id="tile-tray" class="tile-tray" aria-label="7-slot holding tray"></div>
    </div>
  </div>

  <!-- Toolbar Controls -->
  <footer class="toolbar">
    <button id="btn-restart" class="button grey" title="Restart this puzzle (R)">↺ Restart</button>
    <button id="btn-undo" class="button yellow" title="Undo last pick (U)">↶ Undo</button>
    <button id="btn-shuffle" class="button purple" title="Shuffle free tiles (S)">⇄ Shuffle</button>
    <button id="btn-new" class="button green" title="New board (N)">★ New Board</button>
  </footer>
</div>

<!-- Victory Modal -->
<div id="win-modal" class="modal-backdrop hidden">
  <div class="modal-card">
    <div class="celebration-icon">✨🏆✨</div>
    <h2>Pile Cleared!</h2>
    <p class="modal-subtext">Every triplet found and cleared from the board.</p>
    <div class="modal-stats" id="win-stats"></div>
    <div class="modal-actions">
      <button id="btn-next-level" class="button green">Next Level &rarr;</button>
    </div>
  </div>
</div>

<!-- Jammed / Full Tray Modal -->
<div id="jam-modal" class="modal-backdrop hidden">
  <div class="modal-card">
    <div class="celebration-icon">📦⚠️</div>
    <h2>Tray is Full!</h2>
    <p class="modal-subtext">All 7 slots are filled without a triplet match. Pick a free un-stick option below:</p>
    <div class="modal-actions">
      <button id="btn-jam-tidy" class="button aqua">Tidy Up (Return 3)</button>
      <button id="btn-jam-shuffle" class="button purple">⇄ Shuffle Pile</button>
      <button id="btn-jam-undo" class="button yellow">↶ Undo</button>
      <button id="btn-jam-restart" class="button grey">↺ Restart</button>
    </div>
  </div>
</div>

<!-- Settings Modal -->
<div id="settings-modal" class="modal-backdrop hidden">
  <div class="modal-card settings-card">
    <h2>Tile Pile Settings</h2>
    <div class="setting-row">
      <label for="theme-select">Theme:</label>
      <select id="theme-select">
        <option value="pantry" selected>Pantry (Honey, Fruit, Bakery)</option>
        <option value="nature">Nature (Butterflies, Flowers, Garden)</option>
        <option value="seaside">Seaside (Shells, Boats, Tropical)</option>
        <option value="crystals">Crystals (Gems, Moons, Stars)</option>
      </select>
    </div>
    <div class="setting-row">
      <label for="mode-select">Game Mode:</label>
      <select id="mode-select">
        <option value="levels" selected>Progressive Levels</option>
        <option value="endless">Endless Play</option>
      </select>
    </div>
    <div class="modal-actions">
      <button id="btn-close-settings" class="button grey">Cancel</button>
      <button id="btn-apply-settings" class="button green">Apply & New Game</button>
    </div>
  </div>
</div>

<script src="/games/tilepile/audio.js?v=<?= filemtime(__DIR__ . '/audio.js') ?>"></script>
<script src="/games/tilepile/game.js?v=<?= filemtime(__DIR__ . '/game.js') ?>"></script>

<?php include $_SERVER['DOCUMENT_ROOT'] . '/includes/footer.php'; ?>
