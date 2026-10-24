<?php define("TITLE", "Color Chutes"); ?>
<?php define("DESCRIPTION", "Slide and evacuate colored blocks into perimeter chutes in this bottleneck-to-avalanche logic puzzle.");?>
<?php define("GAME_STRUCTURED_DATA", true); ?>
<?php include $_SERVER['DOCUMENT_ROOT'] . '/includes/header.php'; ?>

<link rel="stylesheet" href="/games/colorchutes/style.css?v=<?= filemtime(__DIR__ . '/style.css') ?>">

<section id="game-unit" class="game-unit google-anno-skip">
<div id="game-app">
  <!-- Header Bar -->
  <div class="game-header">
    <div class="title-group">
      <h1>Color Chutes</h1>
      <span id="level-badge" class="button yellow level-badge">Level 1: 4×4</span>
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
    Drag tiles through empty spaces to the coloured openings on their side of the board. Tap a tile to nudge it the way its arrow points. Each tile that exits opens up more room!
  </p>

  <!-- Status Bar -->
  <div class="status-bar">
    <div>Tiles Left: <strong id="tiles-remaining-count">0</strong></div>
    <div>Empty Spaces: <strong id="spaces-open-count">1</strong></div>
    <div>Moves: <strong id="moves-count">0</strong></div>
  </div>

  <!-- Playfield: Board Frame & Chutes -->
  <div class="playfield-container">
    <div class="board-wrapper" id="board-frame">
      <!-- Top-Left Corner -->
      <div class="chute-corner corner-tl"></div>

      <!-- Top Chute (Red / Up) -->
      <div class="chute-zone chute-top" title="Red Chute: exit upwards">
        <div class="chute-mouth">
          <span class="chute-arrows"></span>
          <span id="chute-count-top" class="chute-badge" title="Red evacuated">0</span>
        </div>
      </div>

      <!-- Top-Right Corner -->
      <div class="chute-corner corner-tr"></div>

      <!-- Left Chute (Green / Left) -->
      <div class="chute-zone chute-left" title="Green Chute: exit leftwards">
        <div class="chute-mouth">
          <span class="chute-arrows"></span>
          <span id="chute-count-left" class="chute-badge" title="Green evacuated">0</span>
        </div>
      </div>

      <!-- Central Stage -->
      <div class="board-stage">
        <div id="board-grid" class="board-grid"></div>
      </div>

      <!-- Right Chute (Yellow / Right) -->
      <div class="chute-zone chute-right" title="Yellow Chute: exit rightwards">
        <div class="chute-mouth">
          <span class="chute-arrows"></span>
          <span id="chute-count-right" class="chute-badge" title="Yellow evacuated">0</span>
        </div>
      </div>

      <!-- Bottom-Left Corner -->
      <div class="chute-corner corner-bl"></div>

      <!-- Bottom Chute (Blue / Down) -->
      <div class="chute-zone chute-bottom" title="Blue Chute: exit downwards">
        <div class="chute-mouth">
          <span class="chute-arrows"></span>
          <span id="chute-count-bottom" class="chute-badge" title="Blue evacuated">0</span>
        </div>
      </div>

      <!-- Bottom-Right Corner -->
      <div class="chute-corner corner-br"></div>
    </div>
  </div>

  <!-- Toolbar Controls -->
  <footer class="toolbar">
    <button id="btn-restart" class="button grey" title="Restart current puzzle">↺ Restart</button>
    <button id="btn-undo" class="button yellow" title="Undo last move (U)">↶ Undo</button>
    <button id="btn-hint" class="button aqua" title="Show hint (H)">💡 Hint</button>
    <button id="btn-new" class="button green" title="New Puzzle (N)">★ New Puzzle</button>
  </footer>
</div>

<!-- Victory Modal -->
<div id="win-modal" class="modal-backdrop hidden">
  <div class="modal-card">
    <div class="celebration-icon">🎯</div>
    <h2>Board Cleared!</h2>
    <p class="modal-subtext">Every single block found its exit chute.</p>
    <div class="modal-stats" id="win-stats"></div>
    <div class="modal-actions">
      <button id="btn-next-level" class="button green">Next Level &rarr;</button>
    </div>
  </div>
</div>

<!-- Settings Modal -->
<div id="settings-modal" class="modal-backdrop hidden">
  <div class="modal-card settings-card">
    <h2>Color Chutes Settings</h2>
    <div class="setting-row">
      <label for="size-select">Grid Size:</label>
      <select id="size-select">
        <option value="4" selected>4×4 (Classic)</option>
        <option value="5">5×5 (Challenging)</option>
        <option value="6">6×6 (Master)</option>
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

</section>

<script src="/games/colorchutes/storage.js?v=<?= filemtime(__DIR__ . '/storage.js') ?>"></script>
<script src="/games/colorchutes/audio.js?v=<?= filemtime(__DIR__ . '/audio.js') ?>"></script>
<script src="/games/colorchutes/game.js?v=<?= filemtime(__DIR__ . '/game.js') ?>"></script>

<?php include $_SERVER['DOCUMENT_ROOT'] . '/includes/footer.php'; ?>
