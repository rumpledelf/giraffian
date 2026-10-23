"""Generate the Patchwork Quilt picture: a 3x3 patch grid, edge-middle patches split diagonally."""
import json, random, sys

COLOURS = list('RGBYPWOCNV')  # every palette colour except ink
SPLIT = {(0, 1), (1, 0), (1, 2), (2, 1)}
SIZES = (12, 20, 28, 48, 100)


def bounds(n):
    edge = round(n / 3)
    return [0, edge, n - edge, n]


def design(seed):
    rnd = random.Random(seed)
    for _ in range(10000):
        base = dict(zip([(r, c) for r in range(3) for c in range(3)], rnd.sample(COLOURS, 9)))
        second, ok = {}, True
        for cell in sorted(SPLIT):
            # The second colour must differ from every colour in this patch and the 8 around it
            near = {base[(cell[0] + dr, cell[1] + dc)] for dr in (-1, 0, 1) for dc in (-1, 0, 1)
                    if (cell[0] + dr, cell[1] + dc) in base}
            near |= {second[k] for k in second if abs(k[0] - cell[0]) <= 1 and abs(k[1] - cell[1]) <= 1}
            options = [c for c in COLOURS if c not in near]
            if not options:
                ok = False
                break
            second[cell] = rnd.choice(options)
        if ok:
            # Reroll until both directions appear, so the splits read as random rather than uniform
            while True:
                slant = {cell: rnd.choice('/\\') for cell in sorted(SPLIT)}
                if len(set(slant.values())) == 2:
                    return base, second, slant
    raise RuntimeError('no layout')


def grid(n, base, second, slant, split=True):
    b = bounds(n)
    rows = []
    for y in range(n):
        pr = next(i for i in range(3) if b[i] <= y < b[i + 1])
        row = ''
        for x in range(n):
            pc = next(i for i in range(3) if b[i] <= x < b[i + 1])
            cell = (pr, pc)
            colour = base[cell]
            if split and cell in second:
                h, w = b[pr + 1] - b[pr], b[pc + 1] - b[pc]
                u, v = (x - b[pc] + .5) / w, (y - b[pr] + .5) / h
                if (u + v > 1) if slant[cell] == '/' else (u > v):
                    colour = second[cell]
            row += colour
        rows.append(row)
    return rows


if __name__ == '__main__':
    base, second, slant = design(int(sys.argv[1]))
    json.dump({n: grid(n, base, second, slant, split=n > 12) for n in SIZES}, sys.stdout)
