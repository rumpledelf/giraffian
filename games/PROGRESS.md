# Browser saves and progression

All nine games save a versioned checkpoint under `giraffian_<game>_save_v1` in localStorage. The checkpoint contains the current board, level, undo history and original restart board. Each game is standalone: its `BrowserCheckpoint` class and `storage.js` travel with it. Keep equivalent checkpoint fixes in sync across the nine copies.

Moves save before and after their complete transaction. An interrupted animation restores the last complete move rather than partially moved pieces. Visibility changes and pagehide also save; a one-second checkpoint captures continuous play. Pixel Unravel returns travelling shuttles to their staging bays with their remaining capacity, and rebuilds its boundary indexes on resume.

Reset progress in Settings clears only that game's checkpoint and level (plus Hex Sort's endless total). Preferences remain. Saving is suspended before reload so pagehide cannot recreate the deleted checkpoint. Storage failures leave the game playable and show a message in Settings. Saves belong to the current browser and origin.

New Board rerolls the current level; Next Level advances it. Existing level numbers are retained. Ball Sort, Boxes of 3, Conveyor Match 3, Tap Out, Arrows and Pixel Unravel grow from the chosen starting size every three completed levels, within their supported size limits. Players can turn that growth off in Settings.

Tile Pile adds six-tile layers each four-layout cycle (up to four extra layers). It interleaves up to three matching sets along a legal removal order, preserving a solution within the seven-slot tray. Coin Sort expands its deal colour range as levels rise. Hex Sort retains its existing rotating layouts, growing colour count and targets.

Run `node tests/game-progression.mjs` to verify Tile Pile's generated solutions across early and late levels. Browser checks should cover reload after a move and undo, reset isolation, corrupt saves, unavailable storage, mid-animation reload, and short-screen settings scrolling. Test with an isolated Chrome profile to avoid changing real saves.
