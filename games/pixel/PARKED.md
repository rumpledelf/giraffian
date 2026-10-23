# Parked: Pixel Unravel pictures (2026-10-22)

Uncommitted on purpose. Pick up another day.

## Uncommitted change

- `pictures.js` + `pictures/patchwork-quilt.png`: Patchwork Quilt re-rolled so the four diagonal splits run both ways (top and left `/`, right and bottom `\`). Same colours as the committed version (`90640a0`), where all four ran `\`. Commit it when you're happy with it.

## Next: a couple of pictures from fern-placeholder

`/home/robyn/Sites/fern/fern-placeholder` makes seeded flat-fill SVGs with a chosen set of colours and dimensions. It needs a small script that calls its generator library.

- **Good fits:** Geometry, Sunburst, Waves, Hills & trees. These are big flat regions with clean edges.
- **Careful:** Circles and Cogs have a minimum radius of 4% of the canvas height, which is under one cell at 12×12 (8.3%). Raise the minimum, or expect stray pixels at small sizes.
- **Palette:** pass only Pixel's palette (hexes in `parked-tools/reduce.py`, matching `palette` in `game.js`). Challenging pictures need 8 or more colours, easy ones 5 or fewer, and each colour needs a big region.
- **Rendering:** render large (around 1200px) and let the reducer shrink it. Rendering straight at grid size blends edges into the wrong colours.

## Next: make the speed control obvious

The existing speed setting is enough. It just isn't discoverable: the clickable "Speed: ⚡ Steady" text (`index.php:52`) doesn't look tappable. Make it a proper button (for example a pill like the header's pause, sound and settings buttons, showing 1× / 2×) that cycles the existing `speedMode` modes in `game.js`. No new speed logic is needed.

## Tools (`parked-tools/`, copied from the session scratchpad)

- `reduce.py`: decodes a PNG without Pillow, snaps each pixel to the palette, and gives each cell its most common colour. Pass the picture's own palette if known, because the full palette can snap dark green to ink.
- `depair.py`: merges islands of 1–2 same-coloured cells into the colour around them.
- `import_pics.py <dir> games/pixel [--write]`: `<dir>` holds `<id>.png` files plus `prompts.json` (`[{id, title, prompt, palette?}]`). It shrinks each picture to 12/20/28/48/100, cleans it up, and writes `review.html` (a contact sheet). With `--write` it also updates `pictures.js`, `pictures/<id>.png` and `ARTWORK.md`. Run it with `python3 -I`, as all of the tools need.
- `quilt.py <seed>`: the Patchwork Quilt generator (seed 2 is the one in use).

SVG to PNG: `/usr/bin/google-chrome --headless=new --screenshot=out.png --window-size=1200,1200 file://…/pic.svg`

Codex on this box: its sandbox can't run shell commands, so brief it to only call `image_gen` and collect the results from `~/.codex/generated_images/<session>/`.
