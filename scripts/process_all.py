"""
Complete data pipeline for Cap A website.
1. CRS conversion (EPSG:32644 → WGS84)
2. Enrich plots with zoning_group + lat/lon
3. Process overlay GeoJSONs
4. Build search index
5. Generate PMTiles (vector tiles)

Run: python scripts/process_all.py
"""

import json
import csv
import os
import re
import sys
import math
from pathlib import Path

# Paths
SOURCE_DIR = Path(r"C:\Users\pdsva\Desktop\CapA Data\Cap A data\data")
OUTPUT_DIR = Path(r"C:\Users\pdsva\Desktop\PROJECT cap a\public\data")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# ===== CRS CONVERSION =====
# EPSG:32644 (WGS 84 / UTM zone 44N) → EPSG:4326 (WGS84 lat/lon)
# We'll use pyproj if available, otherwise manual calculation

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
        # UTM Zone 44N parameters
        zone = 44
        a = 6378137.0  # WGS84 semi-major axis
        f = 1 / 298.257223563  # WGS84 flattening
        e = math.sqrt(2 * f - f * f)
        e_prime = e / math.sqrt(1 - e * e)
        k0 = 0.9996

        # Central meridian for zone 44
        lon0 = (zone - 1) * 6 - 180 + 3  # = 81 degrees

        # Remove false easting/northing
        x_adj = x - 500000.0
        y_adj = y  # Northern hemisphere, no false northing

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
        # This is a single coordinate pair [x, y]
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
        'SR4 - High Density Private',
    ],
    'residential-low': [
        'R1-Village planning zone',
        'R1MP', 'R1-MP',
        'SR1 - Village Planning',
    ],
    'residential-vacant': ['Residential Vacant'],
    'commercial': [
        'C2 - General commercial zone', 'C2- General commercial zone',
        'C1 -Mixed use zone', 'C1 - Mixed use zone',
        'C3-Neighbourhood centre zone', 'C3 - Neighbourhood centre zone',
        'C4-Town centre zone', 'C4 - Town centre zone',
        'C5-Regional centre zone', 'C5 - Regional centre zone',
        'C6-Central business district zone', 'C6 - Central business district zone',
        'SC1a-Mixed Use', 'SC1a - Mixed Use',
        'SC1b - Mixed Use', 'SC1b-Mixed Use',
    ],
    'commercial-vacant': ['Commercial Vacant'],
    'parks-active': ['P2-Active zone', 'P2 - Active zone', 'SP2 - Active Zone'],
    'parks-passive': ['P1-Passive zone', 'P1 - Passive zone', 'SP1 - Passive Zone'],
    'parks-protected': ['P3-Protected zone', 'P3 - Protected zone', 'SP3 - Protected Zone', 'PGN-G', 'PGN-V'],
    'roads-infra': [
        'U2 - Road reserve zone', 'U2- Road reserve zone',
        'U1-Reserve zone', 'U1 - Reserve zone',
        'SU2 - Road Network', 'SU1-Reserve Zone', 'SU1 - Reserve Zone',
    ],
    'education': ['S2-Education zone', 'S2 - Education zone', 'SS2a - Education Zone', 'SS2b Cultural Zone', 'SS2b - Cultural Zone'],
    'government': ['SS1 - Government Zone', 'SS1-Government Zone'],
    'special': ['S3-Special zone', 'S3 - Special zone', 'SS3 - Health and Wellness Zone', 'SS3-Health and Wellness Zone'],
    'industrial': ['I3-Non polluting industry zone', 'I3 - Non polluting industry zone', 'SI1 - Business Park', 'SI2 - Logistics Hub'],
    'recreation': ['RAA', 'RARP', 'RATH'],
}

for group, syms in ZONING_GROUPS.items():
    for sym in syms:
        SYMBOLOGY_TO_GROUP[sym] = group


def get_zoning_group(symbology):
    if not symbology or symbology == 'N/A':
        return 'unknown'
    return SYMBOLOGY_TO_GROUP.get(symbology, 'unknown')


# ===== STEP 1: PROCESS OVERLAY LAYERS =====
print("\n===== STEP 1: PROCESS OVERLAY LAYERS =====")

# Allocated lands
convert_geojson(
    SOURCE_DIR / "allocated_lands.geojson",
    OUTPUT_DIR / "allocated_lands.geojson",
)

# Roads
convert_geojson(
    SOURCE_DIR / "roads.geojson",
    OUTPUT_DIR / "roads.geojson",
)

# Water bodies
convert_geojson(
    SOURCE_DIR / "waterbodies.geojson",
    OUTPUT_DIR / "waterbodies.geojson",
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

# ===== STEP 2: BUILD SEARCH INDEX =====
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

        record = {
            'id': i,
            'rc': regcode,          # regcode
            'pc': plot_code,        # plot_code
            'fn': row.get('farmer_n', 'N/A'),    # farmer name
            'vi': row.get('village', 'N/A'),      # village
            'tw': row.get('township', 'N/A'),     # township
            'se': row.get('sector', 'N/A'),       # sector
            'bl': row.get('block', 'N/A'),        # block
            'co': row.get('colony', 'N/A'),       # colony
            'sy': row.get('symbology', 'N/A'),    # symbology
            'ae': row.get('alloted_ex', 'N/A'),   # alloted extent
            'la': lat,                             # latitude
            'lo': lon,                             # longitude
        }
        search_records.append(record)

        if (i + 1) % 20000 == 0:
            print(f"  Processed {i + 1} rows...")

search_output = OUTPUT_DIR / "search_index.json"
with open(search_output, 'w', encoding='utf-8') as f:
    json.dump(search_records, f, ensure_ascii=False, separators=(',', ':'))

size_mb = os.path.getsize(search_output) / 1024 / 1024
print(f"  Search index: {len(search_records)} records, {size_mb:.1f} MB")


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

# ===== STEP 4: GENERATE PMTILES =====
print("\n===== STEP 4: GENERATE PMTILES =====")

try:
    # Try using the pmtiles Python package
    # We need to build vector tiles from GeoJSON
    # Since tippecanoe isn't available on Windows, we'll use a different approach:
    # Split the data into zoom-level-appropriate chunks and serve as GeoJSON directly
    # OR use a Python-based tile generation approach

    # For now, since pure Python PMTiles generation from scratch is complex,
    # we'll use an alternative approach: serve the WGS84 GeoJSON directly
    # with MapLibre's built-in GeoJSON source (which supports clustering and
    # dynamic simplification) for development.
    #
    # For production, we can later generate PMTiles using tippecanoe in WSL/Docker.

    print("  PMTiles generation requires tippecanoe (not available on Windows).")
    print("  Using GeoJSON direct loading approach instead.")
    print("  The WGS84 GeoJSON will be loaded directly by MapLibre GL JS.")
    print("  For production, PMTiles can be generated later using tippecanoe in WSL.")
    print("")
    print("  Alternative: Splitting plots into per-village GeoJSON files for faster loading...")

    # Split plots by village for on-demand loading
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
    print(f"  Error in tile generation: {e}")
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
