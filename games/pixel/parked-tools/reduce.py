"""Reduce a full-resolution flat-colour PNG to palette letter grids.

Each grid cell takes the most common palette colour among the pixels it
covers (after snapping each pixel to the nearest palette colour), so soft
anti-aliased edges never average into a third colour.
"""
import json, struct, sys, zlib
from collections import Counter

PALETTE = {
    'R': '#ec8d6f', 'G': '#589a56', 'B': '#3a7ede', 'Y': '#f7e55f', 'P': '#dcb0ed',
    'D': '#2b2d42', 'W': '#fffdf5', 'O': '#efad48', 'C': '#39a7a0', 'N': '#db5f96', 'V': '#8354ac',
}
RGB = {k: tuple(int(v[i:i + 2], 16) for i in (1, 3, 5)) for k, v in PALETTE.items()}


def read_png(path):
    data = open(path, 'rb').read()
    assert data[:8] == b'\x89PNG\r\n\x1a\n'
    pos, idat = 8, b''
    while pos < len(data):
        length, kind = struct.unpack('>I4s', data[pos:pos + 8])
        body = data[pos + 8:pos + 8 + length]
        if kind == b'IHDR':
            w, h, depth, ctype, _, _, interlace = struct.unpack('>IIBBBBB', body)
            assert depth == 8 and ctype in (2, 6) and not interlace, (depth, ctype, interlace)
        elif kind == b'IDAT':
            idat += body
        pos += 12 + length
    bpp = 3 if ctype == 2 else 4
    raw = zlib.decompress(idat)
    stride = w * bpp
    rows, prev = [], bytearray(stride)
    for y in range(h):
        f = raw[y * (stride + 1)]
        line = bytearray(raw[y * (stride + 1) + 1:(y + 1) * (stride + 1)])
        for i in range(stride):
            a = line[i - bpp] if i >= bpp else 0
            b = prev[i]
            c = prev[i - bpp] if i >= bpp else 0
            if f == 1: line[i] = (line[i] + a) & 255
            elif f == 2: line[i] = (line[i] + b) & 255
            elif f == 3: line[i] = (line[i] + (a + b) // 2) & 255
            elif f == 4:
                p = a + b - c
                pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                line[i] = (line[i] + (a if pa <= pb and pa <= pc else b if pb <= pc else c)) & 255
        rows.append([tuple(line[x * bpp:x * bpp + 3]) for x in range(w)])
        prev = line
    return rows


def snap_image(rows, allowed):
    cache = {}
    def snap(px):
        if px not in cache:
            cache[px] = min(allowed, key=lambda k: sum((px[i] - RGB[k][i]) ** 2 for i in range(3)))
        return cache[px]
    return [[snap(px) for px in row] for row in rows]


def reduce_grid(letters, size):
    h, w = len(letters), len(letters[0])
    out = []
    for r in range(size):
        y0, y1 = r * h // size, (r + 1) * h // size
        line = ''
        for c in range(size):
            x0, x1 = c * w // size, (c + 1) * w // size
            # Sample a centred sub-grid; edges of a cell are where anti-aliasing lives
            ys = range(y0, y1, max(1, (y1 - y0) // 12))
            xs = range(x0, x1, max(1, (x1 - x0) // 12))
            line += Counter(letters[y][x] for y in ys for x in xs).most_common(1)[0][0]
        out.append(line)
    return out


def palette_of(letters, min_share=0.004):
    """Palette colours that cover a real area of the image, not just edge fringes."""
    counts = Counter(ch for row in letters[::4] for ch in row[::4])
    total = sum(counts.values())
    return [k for k, n in counts.items() if n / total >= min_share]


if __name__ == '__main__':
    path = sys.argv[1]
    rows = read_png(path)
    first = snap_image(rows, list(RGB))
    allowed = palette_of(first)
    letters = snap_image(rows, allowed)
    json.dump({'colours': sorted(allowed), 'grids': {s: reduce_grid(letters, s) for s in (12, 20, 28, 48, 100)}},
              sys.stdout)
