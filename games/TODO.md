# Games To-Do & Idea Brainstorm

Future game concepts, shower thoughts, and prospective 3D/logic puzzles to explore for Giraffian Games:

## New Game Concepts

- [ ] **Polyomino Compactor / Grid Fitter**
  - **Concept:** Odd polyomino shapes scattered around the edges to pack into an $N \times N$ grid, using 1×1 blocks as gap fillers / grout.
  - **Sizing Note:** Keep at tactile sizes ($8 \times 8$ to $12 \times 12$). At 100×100 it becomes an unplayable pixel-art grout chore.
  - **Mechanic Ideas:** Score penalty for every 1×1 piece used (golf scoring: minimize filler usage).

- [ ] **Color Chute Evacuation (1-Gap Slider)**
  - **Concept:** A tight grid with 2 to 4 colors and matching colored exit holes/chutes along the outer perimeter.
  - **Starting State:** Solidly packed with only **one empty space** (15-puzzle style).
  - **Flow:** Shuffle tiles through the bottleneck into their matching perimeter exits. As pieces leave, more empty spaces open up, progressively easing the traffic jam from tight gridlock to a smooth endgame.
  - **Sizing Note:** Best at $4 \times 4$ to $6 \times 6$ so moves feel strategic rather than mechanical grinding.

- [ ] **Bus Jam / Passenger Queue Sort ("The Bus one")**
  - **Concept:** Color-matching passengers in a crowded parking lot / queue waiting for matching colored buses or seats.
  - **Mechanics:** Route planning, staging buffers, and clearing traffic bottlenecks so passengers can reach their ride.

## 3D Variants & Evolutions

- [ ] **Tap Out 3D**
  - **Concept:** 3D voxel / block cluster with directional arrows where blocks shoot outward when their escape path is clear.
  - **Mechanics:** 3D orbiting camera / touch rotation around the voxel mass, multi-directional clearance checks.

- [ ] **Arrows 3D**
  - **Concept:** 3D tangled path / pipe / arrow untangling puzzle.
  - **Mechanics:** Winding spatial paths across 3D coordinates; identify free outer routes and unweave the tangle step-by-step.

## Fixes & Tweaks

- [ ] **Ball Sort: better shuffle on big boards**
  - **Problem:** Large boards (e.g. 16 colours × 8 balls) start barely mixed, with many tubes already holding 6–7 balls of one colour. The reverse-walk generator only reaches about a third of the possible colour changes, before and after the recent entropy scaling.
  - **Idea:** A generator that mixes thoroughly at any size while still guaranteeing a solution, with difficulty set by level rather than limited by board size.
