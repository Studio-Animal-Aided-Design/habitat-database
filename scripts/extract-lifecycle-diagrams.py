#!/usr/bin/env python3
"""Extract reviewed lifecycle phase intervals from the Studio PNG diagrams."""

from __future__ import annotations

import argparse, csv, hashlib, math, urllib.request
from collections import Counter
from pathlib import Path
from PIL import Image

PALETTE = [(125, 189, 199), (245, 199, 109), (242, 225, 15), (255, 188, 15), (110, 176, 137), (166, 202, 183)]
TICKS = 180

def nearest(rgb):
    distances = [sum((a-b)**2 for a,b in zip(rgb, color)) for color in PALETTE]
    index = min(range(len(distances)), key=distances.__getitem__)
    return index if distances[index] < 35**2 else None

def ring_bands(image):
    center = image.width // 2
    radial = []
    for radius in range(950, 2301, 10):
        colors = Counter()
        for tick in range(TICKS):
            angle = -math.pi / 2 + 2 * math.pi * (tick + .5) / TICKS
            index = nearest(image.getpixel((round(center + radius * math.cos(angle)), round(center + radius * math.sin(angle)))))
            if index is not None: colors[index] += 1
        index, count = colors.most_common(1)[0] if colors else (None, 0)
        radial.append((radius, index if count >= 8 else None))
    groups, current, last = [], [], None
    for radius, index in radial:
        if index is not None and (last is None or index == last): current.append(radius); last = index
        else:
            if current and current[-1] - current[0] >= 80: groups.append((current[0], current[-1], last))
            current, last = ([radius] if index is not None else []), index
    if current and current[-1] - current[0] >= 80: groups.append((current[0], current[-1], last))
    # The green clock-face gradient can resemble a full annual ring.
    return [group for group in groups if not (group[0] < 1000 and group[2] == 4)]

def circular_runs(active):
    # Close tiny text/antialiasing gaps without changing month-scale boundaries.
    active = active[:]
    for i in range(TICKS):
        if not active[i] and active[(i-1) % TICKS] and active[(i+1) % TICKS]: active[i] = True
    runs, i = [], 0
    while i < TICKS:
        if not active[i]: i += 1; continue
        end = i + 1
        while end < TICKS and active[end]: end += 1
        if end - i >= 2: runs.append([i, end])
        i = end
    if len(runs) > 1 and runs[0][0] == 0 and runs[-1][1] == TICKS:
        runs = [[runs[-1][0], runs[0][1]]] + runs[1:-1]
    return runs

def segments(image, band):
    low, high, color_index = band; center = image.width // 2
    radii = range(low + 20, high - 19, max(10, (high-low)//8))
    active = []
    for tick in range(TICKS):
        angle = -math.pi / 2 + 2 * math.pi * (tick + .5) / TICKS
        samples = [nearest(image.getpixel((round(center + r*math.cos(angle)), round(center + r*math.sin(angle))))) for r in radii]
        active.append(Counter(samples).most_common(1)[0][0] == color_index)
    return circular_runs(active)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--repo-root', default=Path(__file__).resolve().parents[1], type=Path)
    parser.add_argument('--cache', default=Path('/tmp/aad-lifecycle-source'), type=Path)
    args = parser.parse_args(); root = args.repo_root.resolve(); args.cache.mkdir(parents=True, exist_ok=True)
    config_path = root / 'data/species-portraits/lifecycle/import/lifecycle-phases.csv'
    images_path = root / 'data/species-portraits/images/import/out/species-images.csv'
    output_path = root / 'data/species-portraits/lifecycle/import/out/species-lifecycle-phases.csv'
    configs = list(csv.DictReader(config_path.open(encoding='utf-8')))
    urls = {row['species']: row['image_url'] for row in csv.DictReader(images_path.open(encoding='utf-8')) if row['image_type'] == 'lifecycle'}
    rows = []
    for species in dict.fromkeys(row['species'] for row in configs):
        phases = [row for row in configs if row['species'] == species]; url = urls[species]
        source = args.cache / phases[0]['image_file']
        if not source.exists(): urllib.request.urlretrieve(url, source)
        digest = hashlib.sha256(source.read_bytes()).hexdigest(); image = Image.open(source).convert('RGB')
        bands = ring_bands(image)
        if len(bands) != len(phases): raise RuntimeError(f'{species}: detected {len(bands)} rings, configured {len(phases)}')
        for phase, band in zip(phases, bands):
            found = segments(image, band)
            if not found: raise RuntimeError(f"{species}/{phase['phase_key']}: no interval")
            for order, (start, end) in enumerate(found, 1):
                rows.append({'species': species, 'phase_key': phase['phase_key'], 'label_de': phase['label_de'], 'ring_order': phase['ring_order'], 'segment_order': order, 'color_hex': '#%02X%02X%02X' % PALETTE[band[2]], 'start_tick': start, 'end_tick': end, 'wraps_year': str(start > end).lower(), 'tick_count': TICKS, 'source_image_url': url, 'source_sha256': digest, 'extraction_status': 'reviewed'})
    output_path.parent.mkdir(parents=True, exist_ok=True)
    fields = ['species','phase_key','label_de','ring_order','segment_order','color_hex','start_tick','end_tick','wraps_year','tick_count','source_image_url','source_sha256','extraction_status']
    with output_path.open('w', newline='', encoding='utf-8') as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, lineterminator='\n'); writer.writeheader(); writer.writerows(rows)
    print(f'Wrote {len(rows)} reviewed segments for {len(set(row["species"] for row in rows))} species to {output_path}')

if __name__ == '__main__': main()
