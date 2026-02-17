"""
Road Segment Mapping Cleanup Script for Amaravati Capital City Map

Validates and cleans the SEGMENT_TO_ROAD mapping by:
1. Using user-authoritative segments (from Excel) as ground truth anchors
2. Defining road corridors from anchor positions
3. Validating auto-discovered segments against corridors
4. Filtering out internal roads (small area, wrong position)
5. Finding NEW valid segments along each corridor

Run: python scripts/clean_road_mapping.py
Output: prints report + writes src/utils/roadSegmentMapping.js
"""

import json
import math
import os
from pathlib import Path

# --- Configuration ---
PROJECT_DIR = Path(__file__).parent.parent
GEOJSON_PATH = PROJECT_DIR / "public" / "data" / "plots_wgs84.geojson"
OUTPUT_JS = PROJECT_DIR / "src" / "utils" / "roadSegmentMapping.js"

ROAD_RESERVE_SYMBOLOGIES = {
    'U2 - Road reserve zone',
    'U2- Road reserve zone',
    'SU2 - Road Network',
    'U2-Road Reserve Zone',
}

# Corridor tolerance in degrees (~100m latitude, ~100m longitude at this latitude)
CORRIDOR_TOLERANCE = 0.001  # ~110m
# Minimum area in sq meters for a segment to be considered a grid road
MIN_AREA_SQM = 500
# Maximum gap between segments to consider them contiguous (meters)
MAX_GAP_M = 120

# --- User-authoritative segments from Excel Book1.xlsx ---
# These are the ground truth anchor points for each road.
USER_SEGMENTS = {
    # E-series (East-West roads)
    3745: 'E1', 3735: 'E1', 3403: 'E1',
    3655: 'E2',
    2524: 'E3',
    3130: 'E4',
    2439: 'E5',
    2702: 'E6',
    2303: 'E7',
    1733: 'E8',
    1194: 'E9',
    856: 'E10',
    620: 'E11',
    503: 'E12',
    362: 'E13',
    208: 'E14',
    90: 'E15',
    16: 'E16',
    # N-series (North-South roads)
    1067: 'N1',
    1701: 'N2',
    1744: 'N3A',
    608: 'N3B',
    1233: 'N4',
    # N5 has no segment ID in Excel (entire road not clickable)
    72: 'N6',
    95: 'N7',
    91: 'N8',
    2641: 'N9',
    107: 'N10', 270: 'N10', 410: 'N10', 772: 'N10', 1436: 'N10',
    2057: 'N10', 2537: 'N10', 2851: 'N10', 3135: 'N10', 3300: 'N10',
    1029: 'N11', 1336: 'N11', 2084: 'N11', 2563: 'N11',
    2867: 'N11', 3183: 'N11', 3410: 'N11', 3606: 'N11',
    1488: 'N12',
    1420: 'N13',
    1479: 'N14',
    2705: 'N15',
    2701: 'N16',
    3318: 'N17',
    1497: 'N18',
}


def compute_centroid(geometry):
    """Compute centroid as average of exterior ring coordinates."""
    if not geometry or not geometry.get('coordinates'):
        return None
    gtype = geometry['type']
    if gtype == 'Polygon':
        ring = geometry['coordinates'][0]
    elif gtype == 'MultiPolygon':
        ring = geometry['coordinates'][0][0]
    else:
        return None
    if not ring or len(ring) == 0:
        return None
    sum_lon = sum(c[0] for c in ring)
    sum_lat = sum(c[1] for c in ring)
    n = len(ring)
    return [
        round(sum_lon / n, 6),
        round(sum_lat / n, 6),
    ]


def compute_area_m2(geometry):
    """Approximate area in sq meters using shoelace on lat/lon."""
    if not geometry or not geometry.get('coordinates'):
        return 0
    gtype = geometry['type']
    if gtype == 'Polygon':
        ring = geometry['coordinates'][0]
    elif gtype == 'MultiPolygon':
        ring = geometry['coordinates'][0][0]
    else:
        return 0
    if len(ring) < 3:
        return 0
    mean_lat = sum(c[1] for c in ring) / len(ring)
    cos_lat = math.cos(math.radians(mean_lat))
    x = [(c[0] - ring[0][0]) * 111320 * cos_lat for c in ring]
    y = [(c[1] - ring[0][1]) * 110540 for c in ring]
    area = 0
    for i in range(len(ring) - 1):
        area += x[i] * y[i + 1] - x[i + 1] * y[i]
    return abs(area) / 2


def compute_bbox_dims_m(geometry):
    """Return (width_m, height_m) of bounding box."""
    if not geometry or not geometry.get('coordinates'):
        return 0, 0
    gtype = geometry['type']
    if gtype == 'Polygon':
        ring = geometry['coordinates'][0]
    elif gtype == 'MultiPolygon':
        ring = geometry['coordinates'][0][0]
    else:
        return 0, 0
    lons = [c[0] for c in ring]
    lats = [c[1] for c in ring]
    mean_lat = sum(lats) / len(lats)
    cos_lat = math.cos(math.radians(mean_lat))
    width_m = (max(lons) - min(lons)) * 111320 * cos_lat
    height_m = (max(lats) - min(lats)) * 110540
    return width_m, height_m


def distance_m(lon1, lat1, lon2, lat2):
    """Approximate distance in meters between two lat/lon points."""
    cos_lat = math.cos(math.radians((lat1 + lat2) / 2))
    dx = (lon2 - lon1) * 111320 * cos_lat
    dy = (lat2 - lat1) * 110540
    return math.sqrt(dx * dx + dy * dy)


def main():
    print("Loading GeoJSON...")
    with open(GEOJSON_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    features = data['features']
    print(f"Total features: {len(features)}")

    # Build road segment index (same sort as JS buildRoadSegmentIndex)
    print("Building segment index...")
    road_feats = []
    for i, feat in enumerate(features):
        sym = feat['properties'].get('symbology', '')
        if sym not in ROAD_RESERVE_SYMBOLOGIES:
            continue
        centroid = compute_centroid(feat['geometry'])
        if not centroid:
            continue
        road_feats.append({
            'feat_idx': i,
            'centroid': centroid,
            'geometry': feat['geometry'],
            'area_m2': compute_area_m2(feat['geometry']),
        })

    # Sort south->north, then west->east (same as JS)
    road_feats.sort(key=lambda s: (
        round(s['centroid'][1], 4),
        round(s['centroid'][0], 4),
    ))

    # Assign segment IDs
    for seg_id, seg in enumerate(road_feats):
        seg['seg_id'] = seg_id

    print(f"Total road reserve segments: {len(road_feats)}")

    # Build lookup: seg_id -> segment data
    seg_by_id = {s['seg_id']: s for s in road_feats}

    # Validate user segments exist
    missing_user = []
    for seg_id, road_name in USER_SEGMENTS.items():
        if seg_id not in seg_by_id:
            missing_user.append((seg_id, road_name))
    if missing_user:
        print(f"\nWARNING: {len(missing_user)} user segments not found in index:")
        for sid, rn in missing_user:
            print(f"  Seg {sid} -> {rn}")

    # Group user segments by road
    user_by_road = {}
    for seg_id, road_name in USER_SEGMENTS.items():
        if seg_id not in seg_by_id:
            continue
        if road_name not in user_by_road:
            user_by_road[road_name] = []
        user_by_road[road_name].append(seg_by_id[seg_id])

    # Define corridors from user anchors
    print("\n=== CORRIDOR DEFINITIONS ===")
    corridors = {}
    for road_name in sorted(user_by_road.keys()):
        segs = user_by_road[road_name]
        is_n = road_name.startswith('N')

        centroids = [s['centroid'] for s in segs]
        lons = [c[0] for c in centroids]
        lats = [c[1] for c in centroids]

        if is_n:
            # N-roads run north-south: fixed longitude, variable latitude
            median_lon = sorted(lons)[len(lons) // 2]
            corridors[road_name] = {
                'type': 'N',
                'fixed_coord': median_lon,
                'min_var': min(lats) - 0.005,  # extend ~550m beyond anchors
                'max_var': max(lats) + 0.005,
                'anchor_count': len(segs),
            }
            spread_m = (max(lons) - min(lons)) * 111320 * math.cos(math.radians(sum(lats) / len(lats)))
            print(f"  {road_name:5s}: N-S corridor at lon={median_lon:.6f}, lat=[{min(lats):.4f}, {max(lats):.4f}], {len(segs)} anchors, spread={spread_m:.0f}m")
        else:
            # E-roads run east-west: fixed latitude, variable longitude
            median_lat = sorted(lats)[len(lats) // 2]
            corridors[road_name] = {
                'type': 'E',
                'fixed_coord': median_lat,
                'min_var': min(lons) - 0.005,
                'max_var': max(lons) + 0.005,
                'anchor_count': len(segs),
            }
            spread_m = (max(lats) - min(lats)) * 110540
            print(f"  {road_name:5s}: E-W corridor at lat={median_lat:.6f}, lon=[{min(lons):.4f}, {max(lons):.4f}], {len(segs)} anchors, spread={spread_m:.0f}m")

    # Validate and discover segments
    print("\n=== SEGMENT VALIDATION & DISCOVERY ===")
    final_mapping = dict(USER_SEGMENTS)  # Start with user segments
    discovery_count = {}
    removed_count = {}

    for road_name in sorted(corridors.keys()):
        corr = corridors[road_name]
        is_n = corr['type'] == 'N'

        # Get user anchor segment IDs for this road
        anchor_ids = {s['seg_id'] for s in user_by_road.get(road_name, [])}

        # Build the anchor chain (centroids of user segments)
        anchor_centroids = [seg_by_id[sid]['centroid'] for sid in anchor_ids if sid in seg_by_id]

        # Scan ALL road reserve segments to find candidates
        candidates = []
        for seg in road_feats:
            if seg['seg_id'] in anchor_ids:
                continue  # Skip anchors (already in mapping)
            if seg['area_m2'] < MIN_AREA_SQM:
                continue  # Too small - internal road

            cx, cy = seg['centroid']

            # Check if segment is in the corridor band
            if is_n:
                # N-road: check longitude alignment
                dist_from_corridor = abs(cx - corr['fixed_coord']) * 111320 * math.cos(math.radians(cy))
                in_var_range = corr['min_var'] <= cy <= corr['max_var']
            else:
                # E-road: check latitude alignment
                dist_from_corridor = abs(cy - corr['fixed_coord']) * 110540
                in_var_range = corr['min_var'] <= cx <= corr['max_var']

            if dist_from_corridor > CORRIDOR_TOLERANCE * 111320 and dist_from_corridor > 110:
                continue  # Too far from corridor center
            if not in_var_range:
                continue  # Outside the road's extent

            # Check spatial contiguity: must be within MAX_GAP_M of at least one anchor
            min_dist = float('inf')
            for ac in anchor_centroids:
                d = distance_m(cx, cy, ac[0], ac[1])
                min_dist = min(min_dist, d)

            candidates.append({
                'seg': seg,
                'dist_from_corridor': dist_from_corridor,
                'min_dist_to_anchor': min_dist,
            })

        # Chain-based validation: iteratively add candidates that are close to existing chain
        chain_centroids = list(anchor_centroids)
        chain_ids = set(anchor_ids)
        added = True
        while added:
            added = False
            for cand in candidates:
                if cand['seg']['seg_id'] in chain_ids:
                    continue
                # Check if close enough to any segment in the chain
                cx, cy = cand['seg']['centroid']
                min_d = float('inf')
                for cc in chain_centroids:
                    d = distance_m(cx, cy, cc[0], cc[1])
                    min_d = min(min_d, d)
                if min_d <= MAX_GAP_M:
                    chain_ids.add(cand['seg']['seg_id'])
                    chain_centroids.append(cand['seg']['centroid'])
                    final_mapping[cand['seg']['seg_id']] = road_name
                    added = True

        discovered = len(chain_ids) - len(anchor_ids)
        discovery_count[road_name] = discovered
        if discovered > 0:
            print(f"  {road_name:5s}: {len(anchor_ids)} anchors + {discovered} discovered = {len(chain_ids)} total")
        else:
            print(f"  {road_name:5s}: {len(anchor_ids)} anchors, no new segments found nearby")

    # Report: what was removed from old mapping
    print("\n=== CLEANUP SUMMARY ===")
    total_user = len([sid for sid in USER_SEGMENTS if sid in seg_by_id])
    total_discovered = sum(discovery_count.values())
    total_final = len(final_mapping)
    print(f"User-authoritative segments: {total_user}")
    print(f"Validated auto-discoveries:  {total_discovered}")
    print(f"Total clean mapping:         {total_final}")
    print(f"Removed from old mapping:    {333 - total_final} (were {333} before)")

    # Generate JS output
    print(f"\nWriting clean mapping to {OUTPUT_JS}...")

    # Group by road name for organized output
    road_groups = {}
    for seg_id, road_name in sorted(final_mapping.items()):
        if road_name not in road_groups:
            road_groups[road_name] = []
        road_groups[road_name].append(seg_id)

    lines = []
    lines.append("/**")
    lines.append(" * Amaravati Capital City - Road Segment to Road Name Mapping")
    lines.append(" *")
    lines.append(f" * Total: {total_final} segments across {len(road_groups)} named roads")
    lines.append(f" * User-provided: {total_user} segments (from Excel Book1.xlsx)")
    lines.append(f" * Validated discoveries: {total_discovered} segments (corridor-validated)")
    lines.append(" *")
    lines.append(" * Generated by scripts/clean_road_mapping.py")
    lines.append(" */")
    lines.append("")
    lines.append("export const SEGMENT_TO_ROAD = {")

    for road_name in sorted(road_groups.keys()):
        seg_ids = sorted(road_groups[road_name])
        lines.append(f"  // {road_name} ({len(seg_ids)} segments)")
        # Write in compact format, ~10 per line
        chunks = []
        for i in range(0, len(seg_ids), 10):
            chunk = seg_ids[i:i+10]
            parts = [f"{sid}: '{road_name}'" for sid in chunk]
            chunks.append("  " + ", ".join(parts) + ",")
        lines.extend(chunks)

    lines.append("}")
    lines.append("")

    with open(OUTPUT_JS, 'w', encoding='utf-8') as f:
        f.write("\n".join(lines))

    print(f"Done! Written {total_final} segments to {OUTPUT_JS}")

    # Per-road summary table
    print("\n=== PER-ROAD SUMMARY ===")
    print(f"{'Road':>5s} {'Anchors':>8s} {'Discovered':>11s} {'Total':>6s}")
    print("-" * 35)
    for road_name in sorted(road_groups.keys()):
        anchors = len([sid for sid in road_groups[road_name] if sid in USER_SEGMENTS])
        disc = discovery_count.get(road_name, 0)
        total = len(road_groups[road_name])
        print(f"{road_name:>5s} {anchors:>8d} {disc:>11d} {total:>6d}")


if __name__ == '__main__':
    main()
