#!/usr/bin/env bash
# Pipeline stage 03 — TILES (PMTiles via tippecanoe in Docker on VAULT7A)
#
# Local has no tippecanoe/Docker; the server has Docker. We tile there and pull
# the result back for local dev. The same plots.pmtiles is later served from the
# deployed nginx (see Dockerfile / P9).
#
# No official prebuilt felt/tippecanoe image exists, so we use a two-step path:
#   1. klokantech/tippecanoe  (GeoJSON -> MBTiles)
#   2. protomaps/go-pmtiles    (MBTiles -> PMTiles)
#
# Input:  public/data/plots.enriched.geojson  (built by 02_grid.mjs)
# Output: public/data/plots.pmtiles           (gitignored; ~31MB, range-served)
#
# Usage (from repo root):  bash pipeline/03_tiles.sh
set -euo pipefail

SERVER="pdsv@192.0.2.10"
WORK="/tmp/capa-tiling"
LOCAL_IN="public/data/plots.enriched.geojson"
LOCAL_OUT="public/data/plots.pmtiles"

echo "[tiles] prepping server workdir"
ssh "$SERVER" "mkdir -p $WORK"

echo "[tiles] uploading enriched GeoJSON"
scp "$LOCAL_IN" "$SERVER:$WORK/plots.enriched.geojson"

echo "[tiles] step 1/2: tippecanoe -> MBTiles"
ssh "$SERVER" "docker run --rm -v $WORK:/data klokantech/tippecanoe:latest \
  tippecanoe -o /data/plots.mbtiles -l plots \
    -Z6 -z16 \
    --drop-densest-as-needed --extend-zooms-if-still-dropping \
    --force /data/plots.enriched.geojson"

echo "[tiles] step 2/2: go-pmtiles -> PMTiles"
ssh "$SERVER" "docker run --rm -v $WORK:/data protomaps/go-pmtiles:latest \
  convert /data/plots.mbtiles /data/plots.pmtiles"

echo "[tiles] downloading plots.pmtiles"
scp "$SERVER:$WORK/plots.pmtiles" "$LOCAL_OUT"

echo "[tiles] cleaning server workdir"
ssh "$SERVER" "rm -rf $WORK"

echo "[tiles] done -> $LOCAL_OUT"
ls -lh "$LOCAL_OUT"
