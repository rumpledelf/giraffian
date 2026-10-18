<?php define("TITLE", "Pixel Unravel"); ?>
<?php include $_SERVER['DOCUMENT_ROOT'] . '/includes/header.php'; ?>

<link rel="stylesheet" href="/games/pixel/style.css">

<div id="game-app">
  <!-- Header Bar -->
  <div class="game-header">
    <div class="title-group">
      <h1>Pixel Unravel</h1>
      <span id="level-badge" class="button yellow level-badge">Level 1: Strawberry</span>
    </div>
    <div class="header-actions">
      <button id="btn-pause" class="button aqua icon-btn" title="Pause / Play" aria-label="Pause">
        <svg id="icon-pause" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="6" y="4" width="4" height="16"></rect>
          <rect x="14" y="4" width="4" height="16"></rect>
        </svg>
        <svg id="icon-play" class="hidden" viewBox="0 0 24 24" width="22" height="22" fill="currentColor" stroke="none">
          <polygon points="5 3 19 12 5 21 5 3"></polygon>
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

      <button id="btn-settings" class="button grey icon-btn" title="Settings" aria-label="Settings">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
      </button>
    </div>
  </div>

  <p class="game-instructions">
    Tap a shuttle from the queue heads to launch it into orbit. The vacuum slurp scoops up matching exposed pixels from the outside in! Don't let your staging bays jam.
  </p>

  <!-- Status Bar -->
  <div class="status-bar">
    <div>Pixels Left: <strong id="items-left-count">0</strong></div>
    <div>Speed: <strong id="btn-speed" style="cursor:pointer;">⚡ Steady</strong></div>
  </div>

  <!-- Playfield: Orbit Stage with Pixel Grid & Moving Shuttle -->
  <div class="playfield-container">
    <div id="orbit-stage" class="orbit-stage">
      <div class="orbit-rail"></div>

      <!-- Canvas Wrap -->
      <div class="pixel-canvas-wrap">
        <canvas id="pixel-canvas" width="256" height="256"></canvas>
      </div>

      <!-- Orbital Vacuum Shuttles Layer -->
      <div id="orbit-shuttles-layer" class="orbit-shuttles-layer"></div>

      <!-- Laser / Vacuum Beam SVG Layer -->
      <svg id="vacuum-beam-svg" class="vacuum-beam-svg"></svg>
    </div>
  </div>

  <!-- Staging Area (Parking Bays) -->
  <div class="staging-section">
    <div class="section-label">Staging Bays (Parking)</div>
    <div id="staging-bays-grid" class="staging-bays-grid"></div>
  </div>

  <!-- Queues (Incoming Shuttles) -->
  <div class="queues-section">
    <div class="section-label">Incoming Queues (Pick from Top)</div>
    <div id="queues-lanes-grid" class="queues-lanes-grid"></div>
  </div>

  <!-- Toolbar Controls -->
  <footer class="toolbar">
    <button id="btn-restart" class="button grey" title="Restart current puzzle">↺ Restart</button>
    <button id="btn-undo" class="button yellow" title="Undo last shuttle move">↶ Undo</button>
    <button id="btn-new" class="button green" title="New Picture">★ New Picture</button>
  </footer>
</div>

<!-- Victory Modal -->
<div id="win-modal" class="modal-backdrop hidden">
  <div class="modal-card">
    <h2>✨ Pixel Unraveled! ✨</h2>
    <p>You stripped away every single layer cleanly with your vacuum shuttles!</p>
    <div class="modal-actions">
      <button id="btn-next-level" class="button green">Next Picture &rarr;</button>
    </div>
  </div>
</div>

<!-- Jammed Modal -->
<div id="jam-modal" class="modal-backdrop hidden">
  <div class="modal-card">
    <h2>No moves left!</h2>
    <p>No shuttle can reach a matching pixel. Swap your fullest parked shuttle with a random one from the queues, undo a move, or try again.</p>
    <div class="modal-actions">
      <button id="btn-jam-rescue" class="button aqua">⇄ Swap Shuttle</button>
      <button id="btn-jam-undo" class="button yellow">↶ Undo Move</button>
      <button id="btn-jam-restart" class="button grey">↺ Restart</button>
    </div>
  </div>
</div>

<!-- Settings Modal -->
<div id="settings-modal" class="modal-backdrop hidden">
  <div class="modal-card settings-card">
    <h2>Game Settings</h2>
    <div class="setting-row">
      <label for="difficulty-select">Difficulty:</label>
      <select id="difficulty-select">
        <option value="challenging" selected>Challenging (8–10 colours)</option>
        <option value="easy">Easy (3–5 colours)</option>
      </select>
    </div>
    <div class="setting-row">
      <label for="size-select">Picture Size / Complexity:</label>
      <select id="size-select">
        <option value="12" selected>12×12</option>
        <option value="20">20×20</option>
        <option value="28">28×28</option>
        <option value="48">48×48</option>
        <option value="100">100×100</option>
      </select>
    </div>
    <div class="setting-row">
      <label for="speed-select">Shuttle Speed:</label>
      <select id="speed-select">
        <option value="slow">Slow</option>
        <option value="normal" selected>Normal</option>
        <option value="fast">Fast</option>
      </select>
    </div>
    <div class="modal-actions">
      <button id="btn-close-settings" class="button grey">Cancel</button>
      <button id="btn-apply-settings" class="button green">Apply & New Game</button>
    </div>
  </div>
</div>

<script src="/games/pixel/audio.js"></script>
<script src="/games/pixel/pictures.js"></script>
<script src="/games/pixel/game.js"></script>

<?php include $_SERVER['DOCUMENT_ROOT'] . '/includes/footer.php'; ?>
