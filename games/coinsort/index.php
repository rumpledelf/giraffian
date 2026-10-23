<?php define("TITLE", "Coin Sort"); ?>
<?php include $_SERVER['DOCUMENT_ROOT'] . '/includes/header.php'; ?>

<link rel="stylesheet" href="/games/coinsort/style.css?v=<?= filemtime(__DIR__ . '/style.css') ?>">

<div id="game-app">
  <!-- Header Bar -->
  <div class="game-header">
    <div class="title-group">
      <h1>Coin Sort</h1>
      <span id="level-badge" class="button yellow level-badge">Level 1</span>
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
    Tap a stack, then tap another slot to move its top coins. Ten matching coins in one slot merge into the next colour up.
  </p>

  <!-- Status Bar -->
  <div class="status-bar">
    <div id="goal-label">Goal: <span id="goal-coin" class="coin-chip"></span></div>
    <div>Top coin: <span id="best-coin" class="coin-chip"></span></div>
  </div>

  <!-- Playfield: Board Frame & Slots -->
  <div class="playfield-container">
    <div class="board-frame">
      <div id="coin-board" class="coin-board" aria-label="Coin slots"></div>
    </div>
  </div>

  <button id="btn-deal" class="button green deal-btn" title="Deal more coins (D)">＋ Deal Coins</button>

  <!-- Toolbar Controls -->
  <footer class="toolbar">
    <button id="btn-restart" class="button grey" title="Restart this level (R)">↺ Restart</button>
    <button id="btn-undo" class="button yellow" title="Undo last move (U)">↶ Undo</button>
    <button id="btn-new" class="button aqua" title="Fresh board, same level">★ New Board</button>
  </footer>
</div>

<!-- Victory Modal -->
<div id="win-modal" class="modal-backdrop hidden">
  <div class="modal-card">
    <div class="celebration-icon"><span id="win-coin" class="coin-chip coin-chip-big"></span></div>
    <h2>Level Complete!</h2>
    <p class="modal-subtext">You made the goal coin.</p>
    <div class="modal-stats" id="win-stats"></div>
    <div class="modal-actions">
      <button id="btn-next-level" class="button green">Next Level &rarr;</button>
    </div>
  </div>
</div>

<!-- Jammed Modal -->
<div id="jam-modal" class="modal-backdrop hidden">
  <div class="modal-card">
    <h2>No room left!</h2>
    <p class="modal-subtext">Every slot is full. Tidy Up sorts the coins into neat stacks, for free.</p>
    <div class="modal-actions">
      <button id="btn-jam-tidy" class="button aqua">Tidy Up</button>
      <button id="btn-jam-undo" class="button yellow">↶ Undo</button>
      <button id="btn-jam-restart" class="button grey">↺ Restart</button>
    </div>
  </div>
</div>

<!-- Settings Modal -->
<div id="settings-modal" class="modal-backdrop hidden">
  <div class="modal-card settings-card">
    <h2>Coin Sort Settings</h2>
    <div class="setting-row">
      <label for="slots-select">Slots:</label>
      <select id="slots-select">
        <option value="6">6 slots</option>
        <option value="8" selected>8 slots</option>
        <option value="10">10 slots</option>
      </select>
    </div>
    <div class="setting-row">
      <label for="mode-select">Mode:</label>
      <select id="mode-select">
        <option value="levels" selected>Levels: make the goal coin</option>
        <option value="endless">Endless: just keep merging</option>
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

<script src="/games/coinsort/storage.js?v=<?= filemtime(__DIR__ . '/storage.js') ?>"></script>
<script src="/games/coinsort/audio.js?v=<?= filemtime(__DIR__ . '/audio.js') ?>"></script>
<script src="/games/coinsort/game.js?v=<?= filemtime(__DIR__ . '/game.js') ?>"></script>

<?php include $_SERVER['DOCUMENT_ROOT'] . '/includes/footer.php'; ?>
