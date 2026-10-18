<?php define("TITLE", "Conveyor Match 3"); ?>
<?php include $_SERVER['DOCUMENT_ROOT'] . '/includes/header.php'; ?>

<link rel="stylesheet" href="/games/moving3/style.css">

<div id="game-app">
  <div class="game-header">
    <div class="title-group">
      <h1>Conveyor Match 3</h1>
      <span class="level-badge button yellow" id="level-badge">Level 1</span>
    </div>

    <div class="header-actions">
      <button id="btn-pause" class="button yellow icon-btn" title="Pause / Resume Conveyor">
        <svg id="icon-pause" viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
          <rect x="6" y="4" width="4" height="16" rx="1.5"></rect>
          <rect x="14" y="4" width="4" height="16" rx="1.5"></rect>
        </svg>
        <svg id="icon-play" class="hidden" viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
          <polygon points="6 4 20 12 6 20 6 4"></polygon>
        </svg>
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
    Tap an item to pick it up, then tap an open box scrolling past on any belt. Match 3 identical items in any box to pack it shut!
  </div>

  <div class="status-bar">
    <div>Boxes Packed: <strong id="boxes-cleared-count">0</strong></div>
    <div>Remaining Items: <strong id="items-left-count">0</strong></div>
  </div>

  <!-- Active Floating Selected Item Preview -->
  <div id="floating-selected-item" class="floating-item hidden"></div>

  <main class="conveyor-container">
    <div class="conveyor-stage" id="conveyor-stage">
      <!-- 3 Animated Conveyor Tracks -->
      <div class="conveyor-track track-0" id="track-0">
        <div class="track-rail"></div>
        <div class="track-belt" id="belt-0"></div>
      </div>

      <div class="conveyor-track track-1" id="track-1">
        <div class="track-rail"></div>
        <div class="track-belt" id="belt-1"></div>
      </div>

      <div class="conveyor-track track-2" id="track-2">
        <div class="track-rail"></div>
        <div class="track-belt" id="belt-2"></div>
      </div>
    </div>
  </main>

  <footer class="toolbar">
    <button id="btn-restart" class="button grey" title="Restart this conveyor">↺ Restart</button>
    <button id="btn-undo" class="button yellow" title="Undo Move">↶ Undo (<span id="undo-count">0</span>)</button>
    <button id="btn-speed" class="button aqua" title="Toggle Speed">⚡ Cruise</button>
    <button id="btn-advance" class="button aqua hidden" title="Bring more boxes into view">Advance belts ➔</button>
    <button id="btn-new" class="button green" title="New Puzzle">★ New Conveyor</button>
  </footer>

  <!-- Win Modal -->
  <div id="win-modal" class="modal-backdrop hidden">
    <div class="modal-card">
      <div class="celebration-icon">🚂✨📦</div>
      <h2>Conveyor Cleared!</h2>
      <p class="modal-subtext">All moving boxes packed and sorted cleanly.</p>
      <div class="modal-stats" id="win-stats"></div>
      <button id="btn-next-level" class="button green">Next Conveyor ➔</button>
    </div>
  </div>

  <!-- Settings Dialog -->
  <div id="settings-modal" class="modal-backdrop hidden">
    <div class="modal-card settings-card">
      <h2>Conveyor Settings</h2>
      <div class="setting-row">
        <label for="speed-select">Conveyor Speed:</label>
        <select id="speed-select">
          <option value="slow" selected>Bedtime Cruise (Gentle & relaxing)</option>
          <option value="medium">Steady Pace (Standard)</option>
          <option value="fast">Swift Express (Challenge)</option>
          <option value="shift">Shift on Move (Moves only when you play)</option>
        </select>
      </div>
      <div class="setting-row">
        <label for="length-select">Conveyor Loop Size:</label>
        <select id="length-select">
          <option value="4">4 per track (12 boxes total - Quick)</option>
          <option value="5" selected>5 per track (15 boxes - Relaxed)</option>
          <option value="6">6 per track (18 boxes - Deep search!)</option>
        </select>
      </div>
      <div class="setting-row">
        <label for="theme-select">Visual Theme:</label>
        <select id="theme-select">
          <option value="pantry" selected>Pantry Treats (Mushroom 🍄, Jam, Croissant...)</option>
          <option value="shapes">Zen Crystals (Diamonds, Stars, Orbs)</option>
        </select>
      </div>
      <div class="modal-actions">
        <button id="btn-close-settings" class="button grey">Cancel</button>
        <button id="btn-apply-settings" class="button green">Apply & New Game</button>
      </div>
    </div>
  </div>
</div>

<script src="/games/moving3/audio.js"></script>
<script src="/games/moving3/game.js"></script>

<?php include $_SERVER['DOCUMENT_ROOT'] . '/includes/footer.php'; ?>
