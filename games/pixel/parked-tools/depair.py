import json, sys
from collections import Counter

ORTH = ((1, 0), (-1, 0), (0, 1), (0, -1))
MAX_ISLAND = 2


def islands(g):
    n = len(g)
    seen = set()
    for r in range(n):
        for c in range(n):
            if (r, c) in seen:
                continue
            seen.add((r, c))
            stack, cells = [(r, c)], []
            while stack:
                y, x = stack.pop()
                cells.append((y, x))
                for dy, dx in ORTH:
                    q = (y + dy, x + dx)
                    if 0 <= q[0] < n and 0 <= q[1] < n and q not in seen and g[q[0]][q[1]] == g[y][x]:
                        seen.add(q)
                        stack.append(q)
            yield cells


def merge_small(rows):
    g = [list(r) for r in rows]
    n = len(g)
    for _ in range(10):
        changed = False
        for cells in list(islands(g)):
            if len(cells) > MAX_ISLAND:
                continue
            members = set(cells)
            # Colour of the cells bordering the island, weighted by shared edges
            border = Counter(g[y + dy][x + dx] for y, x in cells for dy, dx in ORTH
                             if 0 <= y + dy < n and 0 <= x + dx < n and (y + dy, x + dx) not in members)
            if not border:
                continue
            fill = border.most_common(1)[0][0]
            for y, x in cells:
                g[y][x] = fill
            changed = True
        if not changed:
            break
    return [''.join(r) for r in g]


if __name__ == '__main__':
    path = sys.argv[1]
    s = open(path).read()
    i, j = s.index('['), s.rindex(']') + 1
    pics = json.loads(s[i:j])
    total = 0
    for p in pics:
        old = p['data']
        new = [list(r) for r in merge_small(old)]
        # Never drop a colour entirely: that would move the picture between difficulty buckets
        lost = set(''.join(old)) - set(''.join(''.join(r) for r in new))
        for r, row in enumerate(old):
            for c, ch in enumerate(row):
                if ch in lost:
                    new[r][c] = ch
        new = [''.join(r) for r in new]
        assert len(set(''.join(old))) == len(set(''.join(new)))
        changed = sum(a != b for x, y in zip(old, new) for a, b in zip(x, y))
        total += changed
        if lost:
            print('kept colours', sorted(lost), 'in', p['id'])
        p['data'] = new
    if '--write' in sys.argv:
        open(path, 'w').write(s[:i] + json.dumps(pics, indent=2, ensure_ascii=False) + s[j:])
    print('cells changed', total)
