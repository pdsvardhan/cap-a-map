"""
Complete data pipeline for Cap A website.
1. CRS conversion (EPSG:32644 -> WGS84)
2. Enrich plots with zoning_group + lat/lon
3. Process overlay GeoJSONs
4. Build search index (no farmer names)
5. Build allocated lands search index
6. Generate named roads from U2/SU2 spatial analysis
7. Generate per-village split files

Run: python scripts/process_all.py
"""

import json
import csv
import os
import re
import sys
import math
from pathlib import Path
from collections import defaultdict

# Paths
SOURCE_DIR = Path(r"C:\Users\pdsva\Desktop\CapA Data\Cap A data\data")
OUTPUT_DIR = Path(r"C:\Users\pdsva\Desktop\PROJECT cap a\public\data")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# ===== CRS CONVERSION =====
# EPSG:32644 (WGS 84 / UTM zone 44N) -> EPSG:4326 (WGS84 lat/lon)

try:
    from pyproj import Transformer
    transformer = Transformer.from_crs("EPSG:32644", "EPSG:4326", always_xy=True)

    def utm_to_wgs84(x, y):
        lon, lat = transformer.transform(x, y)
        return [round(lon, 8), round(lat, 8)]

    print("Using pyproj for CRS conversion")
except ImportError:
    print("pyproj not found, using manual UTM conversion")

    def utm_to_wgs84(x, y):
        """Manual UTM Zone 44N to WGS84 conversion."""
        zone = 44
        a = 6378137.0
        f = 1 / 298.257223563
        e = math.sqrt(2 * f - f * f)
        e_prime = e / math.sqrt(1 - e * e)
        k0 = 0.9996

        lon0 = (zone - 1) * 6 - 180 + 3  # = 81 degrees

        x_adj = x - 500000.0
        y_adj = y

        M = y_adj / k0
        mu = M / (a * (1 - e**2/4 - 3*e**4/64 - 5*e**6/256))

        e1 = (1 - math.sqrt(1 - e**2)) / (1 + math.sqrt(1 - e**2))

        phi1 = (mu + (3*e1/2 - 27*e1**3/32) * math.sin(2*mu)
                + (21*e1**2/16 - 55*e1**4/32) * math.sin(4*mu)
                + (151*e1**3/96) * math.sin(6*mu)
                + (1097*e1**4/512) * math.sin(8*mu))

        N1 = a / math.sqrt(1 - e**2 * math.sin(phi1)**2)
        T1 = math.tan(phi1)**2
        C1 = e_prime**2 * math.cos(phi1)**2
        R1 = a * (1 - e**2) / (1 - e**2 * math.sin(phi1)**2)**1.5
        D = x_adj / (N1 * k0)

        lat = phi1 - (N1 * math.tan(phi1) / R1) * (
            D**2/2
            - (5 + 3*T1 + 10*C1 - 4*C1**2 - 9*e_prime**2) * D**4/24
            + (61 + 90*T1 + 298*C1 + 45*T1**2 - 252*e_prime**2 - 3*C1**2) * D**6/720
        )

        lon = (D - (1 + 2*T1 + C1) * D**3/6
               + (5 - 2*C1 + 28*T1 - 3*C1**2 + 8*e_prime**2 + 24*T1**2) * D**5/120
              ) / math.cos(phi1)

        lat_deg = math.degrees(lat)
        lon_deg = lon0 + math.degrees(lon)

        return [round(lon_deg, 8), round(lat_deg, 8)]


def convert_coordinates(coords):
    """Recursively convert coordinate arrays from UTM to WGS84."""
    if isinstance(coords[0], (int, float)):
        return utm_to_wgs84(coords[0], coords[1])
    else:
        return [convert_coordinates(c) for c in coords]


def convert_geojson(input_path, output_path, keep_properties=None):
    """Convert a GeoJSON file from EPSG:32644 to WGS84."""
    print(f"  Converting {input_path.name}...")

    with open(input_path, 'r', encoding='utf-8-sig') as f:
        data = json.load(f)

    features = data.get('features', [])
    converted_features = []

    for i, feature in enumerate(features):
        geom = feature.get('geometry')
        if geom and geom.get('coordinates'):
            new_geom = {
                'type': geom['type'],
                'coordinates': convert_coordinates(geom['coordinates'])
            }

            props = feature.get('properties', {})
            if keep_properties:
                props = {k: v for k, v in props.items() if k in keep_properties}

            converted_features.append({
                'type': 'Feature',
                'geometry': new_geom,
                'properties': props,
            })

        if (i + 1) % 10000 == 0:
            print(f"    Converted {i + 1}/{len(features)} features...")

    output = {
        'type': 'FeatureCollection',
        'features': converted_features,
    }

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False)

    size_mb = os.path.getsize(output_path) / 1024 / 1024
    print(f"    Done: {len(converted_features)} features, {size_mb:.1f} MB")
    return output


# ===== ZONING GROUP MAPPING =====

SYMBOLOGY_TO_GROUP = {}
ZONING_GROUPS = {
    'residential-high': [
        'R3-Medium to high density zone',
        'R3 - Medium to high density zone',
        'R4-High density zone',
        'R4 - High density zone',
        'SR4 - High Density Private',
    ],
    'residential-low': [
        'R1-Village planning zone',
        'R1MP', 'R1-MP',
        'SR1 - Village Planning',
        'R2-Low density zone',
        'R2 - Low density zone',
        'SR2 Low Density Housing',
    ],
    'residential-vacant': ['Residential Vacant'],
    'commercial': [
        'C1 -Mixed use zone', 'C1 - Mixed use zone',
        'C2 - General commercial zone', 'C2- General commercial zone',
        'C3-Neighbourhood centre zone', 'C3 - Neighbourhood centre zone',
        'C4-Town centre zone', 'C4 - Town centre zone',
        'C5-Regional centre zone', 'C5 - Regional centre zone',
        'C6-Central business district zone', 'C6 - Central business district zone',
        'SC1a-Mixed Use', 'SC1a - Mixed Use',
        'SC1b - Mixed Use', 'SC1b-Mixed Use',
    ],
    'commercial-vacant': ['Commercial Vacant'],
    'parks-active': [
        'P2-Active zone', 'P2 - Active zone',
        'SP2 - Active Zone', 'SP2- Active Zone',
    ],
    'parks-passive': [
        'P1-Passive zone', 'P1 - Passive zone',
        'SP1 - Passive Zone', 'SP1- Passive Zone',
    ],
    'water': [
        'P3-Protected zone', 'P3 - Protected zone',
        'SP3-Protected Zone', 'SP3 - Protected Zone',
    ],
    'green-belt': [
        'PGN-G',
        'P3-Protected zone Hills', 'P3 - Protected zone Hills',
    ],
    'village-green': ['PGN-V'],
    'roads-infra': [
        'U1-Reserve zone', 'U1 - Reserve zone',
        'SU1-Reserve Zone', 'SU1 - Reserve Zone',
    ],
    'road-reserve': [
        'U2 - Road reserve zone', 'U2- Road reserve zone',
        'SU2 - Road Network',
    ],
    'education': [
        'S2-Education zone', 'S2 - Education zone',
        'SS2a - Education Zone', 'SS2a- Education Zone',
    ],
    'cultural': [
        'SS2b Cultural Zone', 'SS2b - Cultural Zone',
    ],
    'health': [
        'SS2c Health Zone', 'SS2c - Health Zone',
        'SS3 - Health and Wellness Zone', 'SS3-Health and Wellness Zone',
    ],
    'government': [
        'S1-Government zone', 'S1 - Government zone',
        'SS1 - Government Zone', 'SS1-Government Zone',
    ],
    'special': [
        'S3-Special zone', 'S3 - Special zone',
    ],
    'special-zone': [
        'SS3 - Special Zone', 'SS3-Special Zone',
    ],
    'industrial': [
        'I1-Business park zone', 'I1 - Business park zone',
        'I2-Logistics zone', 'I2 - Logistics zone',
        'I3-Non polluting industry zone', 'I3 - Non polluting industry zone',
        'SI1 - Business Park',
        'SI2 - Logistics Hub',
    ],
    'recreation': ['RAA', 'RARP', 'RATH'],
    'burial-ground': ['Burial Ground'],
}

for group, syms in ZONING_GROUPS.items():
    for sym in syms:
        SYMBOLOGY_TO_GROUP[sym] = group


def get_zoning_group(symbology):
    if not symbology or symbology == 'N/A':
        return 'unknown'
    return SYMBOLOGY_TO_GROUP.get(symbology, 'unknown')


# Road reserve symbologies (for named roads derivation)
ROAD_RESERVE_SYMS = {
    'U2 - Road reserve zone', 'U2- Road reserve zone', 'SU2 - Road Network',
}


# ===== STEP 1: PROCESS OVERLAY LAYERS =====
print("\n===== STEP 1: PROCESS OVERLAY LAYERS =====")

# Allocated lands
alloc_data = convert_geojson(
    SOURCE_DIR / "allocated_lands.geojson",
    OUTPUT_DIR / "allocated_lands.geojson",
)

# Roads
convert_geojson(
    SOURCE_DIR / "roads.geojson",
    OUTPUT_DIR / "roads.geojson",
)

# Burial grounds
convert_geojson(
    SOURCE_DIR / "burial_grounds.geojson",
    OUTPUT_DIR / "burial_grounds.geojson",
)

# Boundaries
convert_geojson(
    SOURCE_DIR / "boundaries.geojson",
    OUTPUT_DIR / "boundaries.geojson",
)

# Survey parcels
convert_geojson(
    SOURCE_DIR / "survey_parcels.geojson",
    OUTPUT_DIR / "survey_parcels.geojson",
)


# ===== STEP 2: BUILD SEARCH INDEX (NO FARMER NAME) =====
print("\n===== STEP 2: BUILD SEARCH INDEX =====")

search_records = []
csv_path = SOURCE_DIR / "plots_cleaned.csv"

with open(csv_path, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for i, row in enumerate(reader):
        # Extract lat/lon from googlemaplink
        lat, lon = None, None
        link = row.get('googlemaplink', '')
        if link and link != 'N/A':
            match = re.search(r'q=([\d.-]+),([\d.-]+)', link)
            if match:
                lat = round(float(match.group(1)), 6)
                lon = round(float(match.group(2)), 6)

        regcode = row.get('regcode', 'N/A')
        plot_code = row.get('plot_code', 'N/A')

        # Skip rows with no useful identifiers
        if regcode == 'N/A' and plot_code == 'N/A':
            continue

        # Compact array format: [id, regcode, plot_code, village, symbology, alloted_ex, lat, lon]
        record = [
            i,
            regcode if regcode != 'N/A' else '',
            plot_code if plot_code != 'N/A' else '',
            row.get('village', '') if row.get('village', 'N/A') != 'N/A' else '',
            row.get('symbology', '') if row.get('symbology', 'N/A') != 'N/A' else '',
            row.get('alloted_ex', 0),
            lat or 0,
            lon or 0,
        ]
        search_records.append(record)

        if (i + 1) % 20000 == 0:
            print(f"  Processed {i + 1} rows...")

search_output = OUTPUT_DIR / "search_index.json"
with open(search_output, 'w', encoding='utf-8') as f:
    json.dump(search_records, f, ensure_ascii=False, separators=(',', ':'))

size_mb = os.path.getsize(search_output) / 1024 / 1024
print(f"  Search index: {len(search_records)} records, {size_mb:.1f} MB")


# ===== STEP 2B: BUILD ALLOCATED LANDS INDEX =====
print("\n===== STEP 2B: BUILD ALLOCATED LANDS INDEX =====")

# Allocated lands categories for search
ALLOCATED_LAND_CATEGORIES = {
    'Education': ['School', 'IGNOU', 'VIT', 'SRM', 'Amrita', 'BITS', 'BES', 'XAVIER', 'Podar', 'CSI', 'DAV', 'Basil Wood', 'Law University', 'Chinmaya Mission School', 'KV-2', 'NID'],
    'Health': ['Health Center', 'Primary Health', 'Basavatarakam', 'ESIC'],
    'Civic & Social': ['Anganwadi', 'Multi Faith Funeral', 'Ramakrishna Mission'],
    'Government': ['IGC', 'APCRDA', 'CAG', 'CPWD', 'SDPO', 'DOP', 'Bureau of Immigration', 'Income Tax', 'CBI', 'VIDESH BHAVAN', 'BJP', 'AIS'],
    'Financial': ['SBI', 'BOI', 'BOB', 'CANARA', 'LIC', 'NIACL', 'Reserve Bank', 'NABARD', 'Coastal Bank', 'INB', 'UBI', 'AP Grameena', 'SIB', 'Central Bannk', 'HUDCO', 'APCOB'],
    'Infrastructure': ['400KV', 'BPCL', 'GAIL', 'HPCL', 'IRCTC', 'IRCS', 'L&T', 'QuantumValley', 'APTIDCO', 'CITD', 'APSDRFSD', 'APNART'],
    'Sports': ['Gopichand', 'Cricket Academy', 'TTD', 'NSM'],
    'Private & Commercial': ['SPLENDOR', 'MALAXMI', 'GRT', 'MANJEERA', 'SOUTHERN', 'VARUN', 'GPHRL', 'GLENDALE', 'SFSL', 'INDROYAL', 'JRGR', 'DASAPAllA', 'BISER', 'G.V. Estates', 'K. Srikanth', 'PV Sindhu', 'LVPEI'],
}


def categorize_allocated_land(label):
    if not label:
        return 'Private & Commercial'
    upper = label.upper()
    for cat, keywords in ALLOCATED_LAND_CATEGORIES.items():
        for kw in keywords:
            if kw.upper() in upper:
                return cat
    return 'Private & Commercial'


def compute_centroid(geometry):
    """Compute centroid of a GeoJSON geometry (simple average of all coordinates)."""
    coords = geometry.get('coordinates', [])
    all_points = []

    def extract_points(c):
        if isinstance(c[0], (int, float)):
            all_points.append(c)
        else:
            for sub in c:
                extract_points(sub)

    extract_points(coords)

    if not all_points:
        return None, None

    avg_lon = sum(p[0] for p in all_points) / len(all_points)
    avg_lat = sum(p[1] for p in all_points) / len(all_points)
    return round(avg_lat, 6), round(avg_lon, 6)


alloc_index = []
for feature in alloc_data.get('features', []):
    props = feature.get('properties', {})
    label = props.get('label', '') or props.get('Label', '') or props.get('name', '') or props.get('Name', '')

    if not label:
        # Try to find any string property that looks like a name
        for k, v in props.items():
            if isinstance(v, str) and len(v) > 2 and k.lower() not in ('objectid', 'shape_area', 'shape_length', 'fid'):
                label = v
                break

    if not label:
        continue

    lat, lon = compute_centroid(feature.get('geometry', {}))
    if lat is None:
        continue

    category = categorize_allocated_land(label)

    # Compact array: [name, category, lat, lon]
    alloc_index.append([label, category, lat, lon])

alloc_output = OUTPUT_DIR / "allocated_lands_index.json"
with open(alloc_output, 'w', encoding='utf-8') as f:
    json.dump(alloc_index, f, ensure_ascii=False, separators=(',', ':'))

size_kb = os.path.getsize(alloc_output) / 1024
print(f"  Allocated lands index: {len(alloc_index)} entries, {size_kb:.1f} KB")


# ===== STEP 3: CONVERT PLOTS GEOJSON + ENRICH =====
print("\n===== STEP 3: CONVERT AND ENRICH PLOTS GEOJSON =====")
print("  This will take several minutes for 95K features...")

# Build CSV lookup by objectid for enrichment
csv_lookup = {}
with open(csv_path, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        oid = row.get('objectid', '')
        csv_lookup[oid] = row

plots_source = SOURCE_DIR / "plots_cleaned.geojson"
plots_output = OUTPUT_DIR / "plots_wgs84.geojson"

print(f"  Reading {plots_source.name} (this takes a moment for 112MB)...")
with open(plots_source, 'r', encoding='utf-8-sig') as f:
    plots_data = json.load(f)

features = plots_data.get('features', [])
print(f"  Converting {len(features)} features...")

converted_plots = []
# Properties to keep for vector tiles (minimize size)
KEEP_PROPS = [
    'regcode', 'plot_code', 'farmer_n', 'village', 'township', 'sector',
    'block', 'colony', 'symbology', 'alloted_ex', 'polylength', 'polywidth',
    'nbr', 'plot_categ', 'googlemaplink', 'plot_no',
    'regcode_n', 'regcode_s', 'regcode_e', 'regcode_w',
]

for i, feature in enumerate(features):
    geom = feature.get('geometry')
    if not geom or not geom.get('coordinates'):
        continue

    try:
        new_coords = convert_coordinates(geom['coordinates'])
    except Exception as e:
        continue

    props = feature.get('properties', {})
    oid = str(props.get('objectid', ''))

    # Merge with CSV data if available
    csv_row = csv_lookup.get(oid, {})

    # Build enriched properties
    enriched = {}
    for key in KEEP_PROPS:
        val = csv_row.get(key, props.get(key, 'N/A'))
        if val is None:
            val = 'N/A'
        enriched[key] = val

    # Add zoning group
    enriched['zoning_group'] = get_zoning_group(enriched.get('symbology', ''))

    # Add lat/lon from googlemaplink
    link = enriched.get('googlemaplink', '')
    if link and link != 'N/A':
        match = re.search(r'q=([\d.-]+),([\d.-]+)', link)
        if match:
            enriched['lat'] = round(float(match.group(1)), 6)
            enriched['lon'] = round(float(match.group(2)), 6)

    # Convert numeric fields
    for num_field in ['alloted_ex', 'polylength', 'polywidth', 'plot_no', 'township', 'sector', 'block', 'colony']:
        val = enriched.get(num_field, 'N/A')
        if val and val != 'N/A':
            try:
                if num_field in ('alloted_ex', 'plot_no', 'township', 'sector', 'block', 'colony'):
                    enriched[num_field] = int(float(val))
                else:
                    enriched[num_field] = round(float(val), 2)
            except (ValueError, TypeError):
                pass

    converted_plots.append({
        'type': 'Feature',
        'geometry': {
            'type': geom['type'],
            'coordinates': new_coords,
        },
        'properties': enriched,
    })

    if (i + 1) % 10000 == 0:
        print(f"    Converted {i + 1}/{len(features)} features...")

plots_geojson = {
    'type': 'FeatureCollection',
    'features': converted_plots,
}

print(f"  Writing {plots_output.name}...")
with open(plots_output, 'w', encoding='utf-8') as f:
    json.dump(plots_geojson, f, ensure_ascii=False)

size_mb = os.path.getsize(plots_output) / 1024 / 1024
print(f"  Done: {len(converted_plots)} features, {size_mb:.1f} MB")


# ===== STEP 4: GENERATE NAMED ROADS — ANCHOR-BASED EXTRACTION =====
print("\n===== STEP 4: GENERATE NAMED ROADS (ANCHOR-BASED) =====")

try:
    # ---- Phase A: Extract anchor points from plot neighbour fields ----
    # Scan regcode_n/s/e/w for patterns like "E8 Road (50 Mt)" or "N11 Road (50 Mt)"
    road_name_pattern = re.compile(r'^(E|N)(\d+)\s*Road\s*\((\d+)\s*Mt?\)', re.IGNORECASE)

    anchors = defaultdict(list)  # road_name -> list of {lat, lon, side, width}

    print("  Phase A: Extracting anchor points from neighbour fields...")
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            for side, col in [('n', 'regcode_n'), ('s', 'regcode_s'), ('e', 'regcode_e'), ('w', 'regcode_w')]:
                val = (row.get(col) or '').strip()
                m = road_name_pattern.match(val)
                if m:
                    prefix = m.group(1).upper()
                    num = int(m.group(2))
                    width = int(m.group(3))
                    road_name = f"{prefix}{num}"

                    # Extract lat/lon from googlemaplink
                    glink = row.get('googlemaplink', '')
                    gm = re.search(r'q=([\d.]+),([\d.]+)', glink)
                    if gm:
                        lat = float(gm.group(1))
                        lon = float(gm.group(2))
                        anchors[road_name].append({
                            'lat': lat, 'lon': lon,
                            'side': side, 'width': width,
                            'regcode': row.get('regcode', ''),
                        })

    print(f"  Found {len(anchors)} named roads from anchor plots:")
    for rname in sorted(anchors.keys(), key=lambda x: (x[0], int(re.search(r'\d+', x).group()))):
        pts = anchors[rname]
        avg_lat = sum(p['lat'] for p in pts) / len(pts)
        avg_lon = sum(p['lon'] for p in pts) / len(pts)
        w = pts[0]['width']
        print(f"    {rname}: {len(pts)} anchor(s), avg ({avg_lat:.4f}, {avg_lon:.4f}), {w}m width")

    # ---- Phase B: Extract U2/SU2 road reserve polygons ----
    print("  Phase B: Extracting U2/SU2 road reserve polygons...")
    road_polygons = []
    for feature in converted_plots:
        sym = feature['properties'].get('symbology', '')
        if sym not in ROAD_RESERVE_SYMS:
            continue
        geom = feature['geometry']
        coords = geom.get('coordinates', [])
        all_pts = []
        def _extract_pts(c):
            if isinstance(c[0], (int, float)):
                all_pts.append(c)
            else:
                for sub in c:
                    _extract_pts(sub)
        _extract_pts(coords)
        if len(all_pts) < 3:
            continue

        lons = [p[0] for p in all_pts]
        lats = [p[1] for p in all_pts]
        min_lon, max_lon = min(lons), max(lons)
        min_lat, max_lat = min(lats), max(lats)
        centroid_lon = sum(lons) / len(lons)
        centroid_lat = sum(lats) / len(lats)
        width_deg = max_lon - min_lon
        height_deg = max_lat - min_lat

        # Convert width/height to approximate meters (1 deg lat ≈ 111km, 1 deg lon ≈ 102km at lat 16.5)
        width_m = width_deg * 102000
        height_m = height_deg * 111000

        road_polygons.append({
            'centroid': (centroid_lon, centroid_lat),
            'bbox': (min_lon, min_lat, max_lon, max_lat),
            'width_deg': width_deg,
            'height_deg': height_deg,
            'width_m': width_m,
            'height_m': height_m,
            'orientation': 'EW' if width_deg > height_deg * 1.2 else ('NS' if height_deg > width_deg * 1.2 else 'SQ'),
            'all_pts': all_pts,
        })

    print(f"  Found {len(road_polygons)} road reserve polygons")

    # Debug: show width distribution
    ew_polys = [p for p in road_polygons if p['orientation'] == 'EW']
    ns_polys = [p for p in road_polygons if p['orientation'] == 'NS']
    sq_polys = [p for p in road_polygons if p['orientation'] == 'SQ']
    print(f"  E-W: {len(ew_polys)}, N-S: {len(ns_polys)}, Square/intersection: {len(sq_polys)}")

    # Include square/intersection polygons in both groups (they belong to intersections)
    ew_all = ew_polys + sq_polys
    ns_all = ns_polys + sq_polys

    # ---- Phase C: Cluster into road corridors ----
    print("  Phase C: Clustering into road corridors...")

    def cluster_by_position(polys, key_fn, threshold):
        """Cluster polygons by position using threshold-based grouping."""
        if not polys:
            return []
        sorted_polys = sorted(polys, key=key_fn)
        clusters = []
        current_cluster = [sorted_polys[0]]
        current_pos = key_fn(sorted_polys[0])
        for p in sorted_polys[1:]:
            pos = key_fn(p)
            if abs(pos - current_pos) < threshold:
                current_cluster.append(p)
                current_pos = sum(key_fn(x) for x in current_cluster) / len(current_cluster)
            else:
                clusters.append(current_cluster)
                current_cluster = [p]
                current_pos = pos
        clusters.append(current_cluster)
        return clusters

    # Cluster E-W roads by latitude similarity
    # 50m road at lat 16.5 = 0.00045 deg latitude
    # Use 0.0006 deg threshold (~67m) to keep separate roads distinct
    ew_clusters = cluster_by_position(ew_all, lambda p: p['centroid'][1], 0.0006)
    ns_clusters = cluster_by_position(ns_all, lambda p: p['centroid'][0], 0.0006)

    # Filter: keep only clusters with enough segments (real roads have many polygons)
    ew_clusters = [c for c in ew_clusters if len(c) >= 8]
    ns_clusters = [c for c in ns_clusters if len(c) >= 8]

    # Compute corridor metadata
    def compute_corridor_info(cluster, direction):
        """Compute centerline and metadata for a corridor cluster."""
        if direction == 'EW':
            sorted_c = sorted(cluster, key=lambda p: p['centroid'][0])
            primary_coord = sum(p['centroid'][1] for p in cluster) / len(cluster)
        else:
            sorted_c = sorted(cluster, key=lambda p: p['centroid'][1])
            primary_coord = sum(p['centroid'][0] for p in cluster) / len(cluster)

        coords = [list(p['centroid']) for p in sorted_c]

        # Compute total length span
        if direction == 'EW':
            span_deg = max(p['centroid'][0] for p in cluster) - min(p['centroid'][0] for p in cluster)
            span_m = span_deg * 102000
        else:
            span_deg = max(p['centroid'][1] for p in cluster) - min(p['centroid'][1] for p in cluster)
            span_m = span_deg * 111000

        # Estimate road width from the 25th percentile polygon dimension
        # (cross-direction dimension of individual polygons)
        if direction == 'EW':
            cross_dims = sorted([p['height_m'] for p in cluster])
        else:
            cross_dims = sorted([p['width_m'] for p in cluster])
        # Use 25th percentile to avoid outliers from intersections
        q25_idx = max(0, len(cross_dims) // 4)
        est_width = cross_dims[q25_idx] if cross_dims else 0

        return {
            'coords': coords,
            'primary_coord': primary_coord,
            'est_width_m': est_width,
            'segments': len(cluster),
            'span_m': span_m,
        }

    ew_corridors = []
    for cluster in ew_clusters:
        info = compute_corridor_info(cluster, 'EW')
        # Keep corridors with span >= 1000m (real arterial/sub-arterial roads are long)
        if info['span_m'] >= 1000:
            ew_corridors.append(info)
    ew_corridors.sort(key=lambda c: c['primary_coord'])  # Sort south to north

    ns_corridors = []
    for cluster in ns_clusters:
        info = compute_corridor_info(cluster, 'NS')
        if info['span_m'] >= 1000:
            ns_corridors.append(info)
    ns_corridors.sort(key=lambda c: c['primary_coord'])  # Sort west to east

    print(f"  E-W corridors (>=8 segs, >=1km): {len(ew_corridors)}")
    for i, c in enumerate(ew_corridors):
        print(f"    EW-{i}: lat={c['primary_coord']:.4f}, est_w={c['est_width_m']:.0f}m, span={c['span_m']:.0f}m, segs={c['segments']}")
    print(f"  N-S corridors (>=8 segs, >=1km): {len(ns_corridors)}")
    for i, c in enumerate(ns_corridors):
        print(f"    NS-{i}: lon={c['primary_coord']:.4f}, est_w={c['est_width_m']:.0f}m, span={c['span_m']:.0f}m, segs={c['segments']}")

    # ---- Phase D: Match anchor points to corridors ----
    print("  Phase D: Matching anchors to corridors...")

    # Separate anchors by direction
    e_anchors = {k: v for k, v in anchors.items() if k.startswith('E')}
    n_anchors = {k: v for k, v in anchors.items() if k.startswith('N')}

    # For each E-road anchor, find the closest EW corridor by latitude
    ew_names = {}  # corridor_index -> road_name
    for road_name, pts in e_anchors.items():
        avg_lat = sum(p['lat'] for p in pts) / len(pts)
        # Find closest EW corridor
        best_idx = None
        best_dist = float('inf')
        for i, c in enumerate(ew_corridors):
            dist = abs(c['primary_coord'] - avg_lat)
            if dist < best_dist:
                best_dist = dist
                best_idx = i
        if best_idx is not None and best_dist < 0.005:  # Within ~550m
            if best_idx not in ew_names:
                ew_names[best_idx] = road_name
                print(f"    {road_name} -> EW corridor {best_idx} (dist={best_dist:.5f} deg)")
            else:
                # Conflict — keep the one with more anchors
                existing = ew_names[best_idx]
                if len(pts) > len(e_anchors.get(existing, [])):
                    print(f"    {road_name} replaces {existing} for EW corridor {best_idx}")
                    ew_names[best_idx] = road_name
                else:
                    print(f"    {road_name} CONFLICT with {existing} for EW corridor {best_idx} — keeping {existing}")
        else:
            print(f"    {road_name} no matching corridor (closest dist={best_dist:.5f})")

    # For each N-road anchor, find the closest NS corridor by longitude
    ns_names = {}  # corridor_index -> road_name
    for road_name, pts in n_anchors.items():
        avg_lon = sum(p['lon'] for p in pts) / len(pts)
        best_idx = None
        best_dist = float('inf')
        for i, c in enumerate(ns_corridors):
            dist = abs(c['primary_coord'] - avg_lon)
            if dist < best_dist:
                best_dist = dist
                best_idx = i
        if best_idx is not None and best_dist < 0.005:
            if best_idx not in ns_names:
                ns_names[best_idx] = road_name
                print(f"    {road_name} -> NS corridor {best_idx} (dist={best_dist:.5f} deg)")
            else:
                existing = ns_names[best_idx]
                if len(pts) > len(n_anchors.get(existing, [])):
                    print(f"    {road_name} replaces {existing} for NS corridor {best_idx}")
                    ns_names[best_idx] = road_name
                else:
                    print(f"    {road_name} CONFLICT with {existing} for NS corridor {best_idx} — keeping {existing}")
        else:
            print(f"    {road_name} no matching corridor (closest dist={best_dist:.5f})")

    # ---- Phase E+F: Output ONLY anchored roads (confirmed names) ----
    # We only output roads that matched to an anchor — no guessing/interpolation.
    # This gives us ~14 correctly named roads.
    print("  Phase E+F: Generating roads_named.geojson (anchored roads only)...")
    road_features = []

    for idx, road_name in ew_names.items():
        corridor = ew_corridors[idx]
        anchor_pts = e_anchors[road_name]
        width = anchor_pts[0]['width']  # Use the declared width from the CSV (50 or 60)
        classification = 'arterial' if width >= 55 else 'sub-arterial'

        road_features.append({
            'type': 'Feature',
            'geometry': {
                'type': 'LineString',
                'coordinates': corridor['coords'],
            },
            'properties': {
                'name': road_name,
                'direction': 'E-W',
                'classification': classification,
                'width_m': width,
                'segments': corridor['segments'],
                'span_m': round(corridor['span_m']),
                'source': 'anchor',
            },
        })

    for idx, road_name in ns_names.items():
        corridor = ns_corridors[idx]
        anchor_pts = n_anchors[road_name]
        width = anchor_pts[0]['width']
        classification = 'arterial' if width >= 55 else 'sub-arterial'

        road_features.append({
            'type': 'Feature',
            'geometry': {
                'type': 'LineString',
                'coordinates': corridor['coords'],
            },
            'properties': {
                'name': road_name,
                'direction': 'N-S',
                'classification': classification,
                'width_m': width,
                'segments': corridor['segments'],
                'span_m': round(corridor['span_m']),
                'source': 'anchor',
            },
        })

    # Sort: E-roads by number, then N-roads by number
    road_features.sort(key=lambda f: (
        0 if f['properties']['name'].startswith('E') else 1,
        int(re.search(r'\d+', f['properties']['name']).group())
    ))

    roads_named_output = OUTPUT_DIR / "roads_named.geojson"
    roads_named_geojson = {
        'type': 'FeatureCollection',
        'features': road_features,
    }
    with open(roads_named_output, 'w', encoding='utf-8') as f:
        json.dump(roads_named_geojson, f, ensure_ascii=False)

    size_kb = os.path.getsize(roads_named_output) / 1024
    ew_count = sum(1 for f in road_features if f['properties']['direction'] == 'E-W')
    ns_count = sum(1 for f in road_features if f['properties']['direction'] == 'N-S')
    anchored = sum(1 for f in road_features if f['properties']['source'] == 'anchor')
    print(f"  Named roads: {len(road_features)} total ({ew_count} E-W + {ns_count} N-S), {anchored} anchored, {size_kb:.1f} KB")
    for rf in road_features:
        p = rf['properties']
        print(f"    {p['name']}: {p['direction']}, {p['classification']}, {p['width_m']}m, {p['segments']} segs, {p['source']}")

except Exception as e:
    print(f"  Error generating named roads: {e}")
    import traceback
    traceback.print_exc()
    # Write empty file so the app doesn't error
    with open(OUTPUT_DIR / "roads_named.geojson", 'w') as f:
        json.dump({'type': 'FeatureCollection', 'features': []}, f)


# ===== STEP 5: SPLIT PLOTS BY VILLAGE =====
print("\n===== STEP 5: SPLIT PLOTS BY VILLAGE =====")

try:
    village_dir = OUTPUT_DIR / "villages"
    village_dir.mkdir(exist_ok=True)

    village_features = {}
    for feature in converted_plots:
        village = feature['properties'].get('village', 'unknown')
        if village == 'N/A':
            village = 'unknown'
        village_key = village.lower().replace(' ', '_').replace('-', '_')
        if village_key not in village_features:
            village_features[village_key] = []
        village_features[village_key].append(feature)

    village_index = {}
    for village_key, feats in village_features.items():
        village_file = village_dir / f"{village_key}.geojson"
        village_geojson = {
            'type': 'FeatureCollection',
            'features': feats,
        }
        with open(village_file, 'w', encoding='utf-8') as f:
            json.dump(village_geojson, f, ensure_ascii=False)

        size_kb = os.path.getsize(village_file) / 1024
        village_index[village_key] = {
            'name': feats[0]['properties'].get('village', village_key) if feats else village_key,
            'count': len(feats),
            'file': f"villages/{village_key}.geojson",
            'size_kb': round(size_kb, 1),
        }

    # Write village index
    with open(OUTPUT_DIR / "village_index.json", 'w', encoding='utf-8') as f:
        json.dump(village_index, f, ensure_ascii=False, indent=2)

    print(f"  Split into {len(village_features)} village files")
    for vk, vi in sorted(village_index.items(), key=lambda x: -x[1]['count']):
        print(f"    {vi['name']}: {vi['count']} plots ({vi['size_kb']} KB)")

except Exception as e:
    print(f"  Error in village split: {e}")
    import traceback
    traceback.print_exc()


print("\n===== ALL DONE =====")
print(f"Output files in: {OUTPUT_DIR}")
print("\nFiles generated:")
for f in sorted(OUTPUT_DIR.glob("*")):
    if f.is_file():
        size = f.stat().st_size
        if size > 1024 * 1024:
            print(f"  {f.name}: {size / 1024 / 1024:.1f} MB")
        else:
            print(f"  {f.name}: {size / 1024:.1f} KB")
