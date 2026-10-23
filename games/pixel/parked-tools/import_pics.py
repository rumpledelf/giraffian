"""Import Codex's source art into Pixel Unravel.

usage: python3 -I import_pics.py <codex-out dir> <games/pixel dir> [--write]
Without --write it only builds review.html in the codex-out dir.
"""
import json, os, re, struct, sys, zlib
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from reduce import read_png, snap_image, reduce_grid, palette_of, PALETTE, RGB
from depair import merge_small, islands

SIZES = (12, 20, 28, 48, 100)
src, game = sys.argv[1], sys.argv[2]
write = '--write' in sys.argv
prompts = json.load(open(os.path.join(src, 'prompts.json')))


def write_png(path, grid):
    raw = b''.join(b'\x00' + bytes(v for ch in row for v in RGB[ch]) for row in grid)
    def chunk(kind, body):
        return struct.pack('>I', len(body)) + kind + body + struct.pack('>I', zlib.crc32(kind + body))
    n = len(grid)
    open(path, 'wb').write(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', n, n, 8, 2, 0, 0, 0))
                           + chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b''))


def svg(rows, px=200):
    n = len(rows); c = px / n
    out = f'<svg width="{px}" height="{px}" style="margin:3px;border:1px solid #999">'
    for r, row in enumerate(rows):
        for x, ch in enumerate(row):
            out += f'<rect x="{x * c:.2f}" y="{r * c:.2f}" width="{c + .3:.2f}" height="{c + .3:.2f}" fill="{PALETTE[ch]}"/>'
    return out + '</svg>'


results, html = [], ['<body style="margin:8px;font:13px sans-serif">']
for p in prompts:
    rows = read_png(os.path.join(src, p['id'] + '.png'))
    # A known palette (from an existing picture) beats guessing: off-palette shades snap to the wrong colour
    allowed = list(p['palette']) if p.get('palette') else palette_of(snap_image(rows, list(RGB)))
    letters = snap_image(rows, allowed)
    grids = {s: merge_small(reduce_grid(letters, s)) for s in SIZES}
    counts = {s: len(set(''.join(g))) for s, g in grids.items()}
    assert all(not [c for c in islands(g) if len(c) <= 2] for g in grids.values())
    results.append((p, grids))
    html.append(f'<div><b>{p["title"]}</b> ({p["id"]}), colours per size: '
                + ', '.join(f'{s}: {n}' for s, n in counts.items())
                + '<br>' + ''.join(svg(grids[s], 160) for s in (12, 20, 28, 100)) + '</div>')
    print(f'{p["id"]:16}', counts)
open(os.path.join(src, 'review.html'), 'w').write('\n'.join(html))

if write:
    path = os.path.join(game, 'pictures.js')
    s = open(path).read(); i, j = s.index('['), s.rindex(']') + 1
    pics = json.loads(s[i:j])
    for p, grids in results:
        entries = [{'id': f'{p["id"]}-{n}', 'title': p['title'], 'artwork': p['id'], 'size': n, 'data': grids[n]}
                   for n in SIZES]
        at = [k for k, e in enumerate(pics) if e['artwork'] == p['id']]
        if at:
            pics[at[0]:at[-1] + 1] = entries
        else:
            pics.extend(entries)
        write_png(os.path.join(game, 'pictures', p['id'] + '.png'), grids[100])
    open(path, 'w').write(s[:i] + json.dumps(pics, indent=2, ensure_ascii=False) + s[j:])

    art = os.path.join(game, 'pictures', 'ARTWORK.md')
    md = open(art).read()
    for p, _ in results:
        section = f'## {p["title"]}\n\nFile: {p["id"]}.png\n\nPrompt: {p["prompt"]}\n'
        m = re.search(rf'## [^\n]+\n\nFile: {re.escape(p["id"])}\.png\n\nPrompt: [^\n]*\n', md)
        md = md[:m.start()] + section + md[m.end():] if m else md.rstrip('\n') + '\n\n' + section
    open(art, 'w').write(md)
    print('pictures', len({e['artwork'] for e in pics}))
