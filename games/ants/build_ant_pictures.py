import json, math, random

# Full Giraffian palette colors
PALETTE_ALL = ['R', 'G', 'B', 'Y', 'P', 'W', 'O', 'C', 'N', 'V']
PALETTE_WARM = ['R', 'Y', 'O', 'W', 'P', 'N']
PALETTE_GARDEN = ['G', 'C', 'Y', 'R', 'P', 'W', 'O']
PALETTE_GENTLE = ['R', 'Y', 'B', 'G', 'W']

SIZES = [12, 20, 28, 48, 100]

def picnic_tartan(n, pal):
    """Interwoven threads and crossing checks in a rich tartan."""
    grid = []
    stripe_w = max(1, n // 8)
    for r in range(n):
        row = []
        for c in range(n):
            v_band = (c // stripe_w) % len(pal)
            h_band = (r // stripe_w) % len(pal)
            sub_check = ((r % 2) + (c % 2)) % 2
            diag = ((r + c) // max(1, stripe_w // 2)) % 2
            if sub_check == 0:
                col = pal[v_band]
            elif diag == 0:
                col = pal[h_band]
            else:
                col = pal[(v_band + h_band + 1) % len(pal)]
            row.append(col)
        grid.append(''.join(row))
    return grid

def pixel_mandala(n, pal):
    """8-fold symmetric kaleidoscopic rings and micro-petals."""
    grid = []
    cx = (n - 1) / 2.0
    cy = (n - 1) / 2.0
    for r in range(n):
        row = []
        for c in range(n):
            dx = c - cx
            dy = r - cy
            dist = math.hypot(dx, dy)
            angle = math.atan2(dy, dx)
            sym_angle = abs((angle % (math.pi / 4)) - math.pi / 8)
            ring = int(dist * 2.5 / (n / 12.0))
            petal = int(sym_angle * 16 / math.pi)
            wedge = int(abs(dx) + abs(dy)) % max(2, n // 8)
            val = (ring * 3 + petal * 2 + wedge) % len(pal)
            row.append(pal[val])
        grid.append(''.join(row))
    return grid

def honeycomb_pantry(n, pal):
    """Hexagonal and triangular cells filled with honey, pollen and comb."""
    grid = []
    scale = max(1.8, n / 7.0)
    for r in range(n):
        row = []
        for c in range(n):
            hx = c / scale
            hy = r / (scale * 0.866)
            if int(hy) % 2 == 1:
                hx += 0.5
            cell_x = int(hx)
            cell_y = int(hy)
            dx = (hx - cell_x - 0.5)
            dy = (hy - cell_y - 0.5)
            dist_sq = dx * dx + dy * dy
            fine = (r + c) % 2
            if dist_sq < 0.07:
                val = (cell_x * 3 + cell_y * 7) % len(pal)
            elif dist_sq < 0.20:
                val = (cell_x * 5 + cell_y * 11 + fine) % len(pal)
            else:
                val = (cell_x * 2 + cell_y * 4 + 1) % len(pal)
            row.append(pal[val])
        grid.append(''.join(row))
    return grid

def moorish_mosaic(n, pal):
    """Intricate Islamic geometric star tiles and interlocking crosses."""
    grid = []
    step = max(2, n // 6)
    for r in range(n):
        row = []
        for c in range(n):
            br = r // step
            bc = c // step
            lr = r % step
            lc = c % step
            # Diamond / star shape within each block
            d = abs(lr - (step - 1) / 2) + abs(lc - (step - 1) / 2)
            corner = min(lr, step - 1 - lr) + min(lc, step - 1 - lc)
            if d <= step / 4:
                val = (br * 2 + bc * 3) % len(pal)
            elif d <= step / 2:
                val = (br * 5 + bc * 7 + 1) % len(pal)
            elif corner <= 1:
                val = (br + bc + 2) % len(pal)
            else:
                val = (br * 4 + bc + 3) % len(pal)
            row.append(pal[val])
        grid.append(''.join(row))
    return grid

def wildflower_meadow(n, pal):
    """Dense scattered blossoms, petals, leaves and stippled garden soil."""
    rnd = random.Random(42 + n)
    grid = []
    # Seed dense floral points
    scale = max(2, n // 5)
    for r in range(n):
        row = []
        for c in range(n):
            block_r = r // scale
            block_c = c // scale
            in_r = r % scale
            in_c = c % scale
            # Blossom center
            if in_r == scale // 2 and in_c == scale // 2:
                val = pal[(block_r * 3 + block_c * 5) % len(pal)]
            # Petals around center
            elif abs(in_r - scale // 2) + abs(in_c - scale // 2) == 1:
                val = pal[(block_r * 4 + block_c * 2 + 1) % len(pal)]
            # Leaves and grass
            elif (r + 2 * c) % 3 == 0:
                val = 'G' if 'G' in pal else pal[0]
            elif (2 * r + c) % 4 == 0:
                val = 'C' if 'C' in pal else pal[1 % len(pal)]
            else:
                # Earth / background crumb
                val = pal[(block_r + block_c + in_r + in_c) % len(pal)]
            row.append(val)
        grid.append(''.join(row))
    return grid

def sprinkle_feast(n, pal):
    """Hundreds of confetti sprinkles and sugar crystals on pastry."""
    rnd = random.Random(101 + n)
    grid = []
    base_color = 'W' if 'W' in pal else pal[0]
    sprinkle_colors = [c for c in pal if c != base_color] or pal
    # Fill with base pastry
    raw = [[base_color for _ in range(n)] for _ in range(n)]
    # Lay dense 2-cell sprinkle sticks
    num_sprinkles = (n * n) // 5
    for _ in range(num_sprinkles):
        sr = rnd.randint(0, n - 2)
        sc = rnd.randint(0, n - 2)
        col = rnd.choice(sprinkle_colors)
        orient = rnd.choice(['H', 'V', 'D1', 'D2'])
        raw[sr][sc] = col
        if orient == 'H' and sc + 1 < n:
            raw[sr][sc + 1] = col
        elif orient == 'V' and sr + 1 < n:
            raw[sr + 1][sc] = col
        elif orient == 'D1' and sr + 1 < n and sc + 1 < n:
            raw[sr + 1][sc + 1] = col
        elif orient == 'D2' and sr + 1 < n and sc - 1 >= 0:
            raw[sr + 1][sc - 1] = col

    for row in raw:
        grid.append(''.join(row))
    return grid

def garden_labyrinth(n, pal):
    """Winding labyrinth corridors with alternating hedges and blossoms."""
    grid = []
    cx = (n - 1) / 2.0
    cy = (n - 1) / 2.0
    for r in range(n):
        row = []
        for c in range(n):
            ring = int(max(abs(r - cy), abs(c - cx)))
            diag = (r + c) % 3
            corner = ((r < cy) ^ (c < cx))
            quad = (0 if r < cy else 2) + (0 if c < cx else 1)
            val = (ring * 2 + diag + quad * 3) % len(pal)
            row.append(pal[val])
        grid.append(''.join(row))
    return grid

def persian_tapestry(n, pal):
    """Dense oriental rug borders, fine interlaced rosettes and medallion."""
    grid = []
    border_w = max(1, n // 10)
    for r in range(n):
        row = []
        for c in range(n):
            dist_edge = min(r, n - 1 - r, c, n - 1 - c)
            if dist_edge < border_w:
                # Outer guard stripe
                idx = (dist_edge * 2 + (r + c) % 2) % len(pal)
            elif dist_edge < border_w * 2:
                # Main running border band
                idx = ((r // border_w) + (c // border_w) + (r * c) % 3) % len(pal)
            else:
                # Central field: diamond trellis
                dx = abs(c - (n - 1) / 2)
                dy = abs(r - (n - 1) / 2)
                diamond = int((dx + dy) // max(1, n // 12))
                radial = int(math.hypot(dx, dy) // max(1, n // 14))
                idx = (diamond * 3 + radial * 2 + (r % 2)) % len(pal)
            row.append(pal[idx])
        grid.append(''.join(row))
    return grid

def anthill_chambers(n, pal):
    """Subterranean maze of chambers, tunnels, and seed granaries."""
    grid = []
    scale = max(2, n // 7)
    for r in range(n):
        row = []
        for c in range(n):
            cr = r // scale
            cc = c // scale
            ir = r % scale
            ic = c % scale
            # Chamber centers vs tunnels
            is_center = (ir == scale // 2 and ic == scale // 2)
            is_corridor = (ir == scale // 2 or ic == scale // 2)
            fine = (r * 3 + c * 5) % 4
            if is_center:
                idx = (cr * 7 + cc * 11) % len(pal)
            elif is_corridor:
                idx = (cr * 2 + cc * 3 + fine) % len(pal)
            else:
                # Surrounding soil strata
                stratum = (r // max(1, n // 8))
                idx = (stratum + cc + (r + c) % 2) % len(pal)
            row.append(pal[idx])
        grid.append(''.join(row))
    return grid

def stained_glass(n, pal):
    """Fine leaded jewel facets radiating from multiple rosettes."""
    grid = []
    # 4 focal rosette hubs
    q1 = n / 4.0
    q3 = 3 * n / 4.0
    hubs = [(q1, q1), (q1, q3), (q3, q1), (q3, q3)]
    for r in range(n):
        row = []
        for c in range(n):
            # Find nearest hub
            dists = [math.hypot(r - hr, c - hc) for hr, hc in hubs]
            min_d = min(dists)
            nearest_idx = dists.index(min_d)
            angle = math.atan2(r - hubs[nearest_idx][0], c - hubs[nearest_idx][1])
            wedge = int((angle + math.pi) / (math.pi / 4))
            ring = int(min_d // max(1, n // 10))
            fine_check = ((r % 2) ^ (c % 2))
            val = (nearest_idx * 3 + wedge * 2 + ring + fine_check) % len(pal)
            row.append(pal[val])
        grid.append(''.join(row))
    return grid

DESIGN_GENERATORS = [
    ("picnic-tartan", "Picnic Tartan", picnic_tartan, PALETTE_ALL),
    ("pixel-mandala", "Pixel Mandala", pixel_mandala, PALETTE_ALL),
    ("wildflower-meadow", "Wildflower Meadow", wildflower_meadow, PALETTE_GARDEN),
    ("honeycomb-pantry", "Honeycomb Pantry", honeycomb_pantry, PALETTE_WARM),
    ("moorish-mosaic", "Moorish Mosaic", moorish_mosaic, PALETTE_ALL),
    ("sprinkle-feast", "Sprinkle Feast", sprinkle_feast, PALETTE_ALL),
    ("garden-labyrinth", "Garden Labyrinth", garden_labyrinth, PALETTE_GARDEN),
    ("persian-tapestry", "Persian Tapestry", persian_tapestry, PALETTE_ALL),
    ("anthill-chambers", "Anthill Chambers", anthill_chambers, PALETTE_WARM),
    ("stained-glass", "Stained Glass", stained_glass, PALETTE_ALL),
]

all_models = []
for artwork_id, title, func, palette in DESIGN_GENERATORS:
    for size in SIZES:
        grid_data = func(size, palette)
        model = {
            "id": f"{artwork_id}-{size}",
            "title": title,
            "artwork": artwork_id,
            "size": size,
            "data": grid_data
        }
        all_models.append(model)

output_js = "// Intricate, busy pixel art patterns specifically crafted for Pixel Ants.\n"
output_js += "// Highly detailed with small color clusters so ants uncover winding corridors.\n"
output_js += "window.pixelPictures = " + json.dumps(all_models, indent=2) + ";\n"

with open("games/ants/pictures.js", "w") as f:
    f.write(output_js)

print(f"Generated {len(all_models)} busy picture models into games/ants/pictures.js")
