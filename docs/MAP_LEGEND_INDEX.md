# Amaravati Land Explorer — Map Legend & Index Reference

**Purpose:** the single source of truth for *everything drawn on the map* and *every
category that needs a visual treatment*. This is the reference the design brief
(`DESIGN_BRIEF.md`) points to. It does **not** prescribe colours — it defines the
taxonomy, what each thing means, how many there are, and how it's drawn today.

**Product:** an intelligent land-value explorer for Amaravati (Andhra Pradesh's
greenfield capital). Audience: general public, urbanism enthusiasts, real-estate
investors, journalists. Data is authoritative — scraped live from APCRDA's GIS
(`gis.apcrda.org`). The map is the primary surface; panels/search sit over it.

**Medium:** web map, MapLibre GL, rendered on a **flat dark canvas with no basemap**
(the plots *are* the content). Everything is `fill`, `line`, or `symbol` layers.
Zoom range 10–19. ~95k plot polygons + overlays.

---

## 1. Rendering stack (bottom → top, today)
1. Background canvas (dark)
2. Plot fills (zoning colour)        ← the bulk of the map
3. Plot outlines (subtle)
4. Water bodies
5. Allotted-lands fill + outline + labels (overlay)
6. Named trunk roads: fill + outline (+ highlight + labels)
7. Selected-plot / selected-road highlight
8. Region & label symbols

---

## 2. Category taxonomy (what needs colour / styling)

### A. Land-use ZONES — the plots (official APCRDA 2015 Zoning Regulations)
The dominant visual. ~95k polygons across these families. Counts ≈ share of map.

- **Residential (R)** — the largest family by far
  - R1 Village Planning Zone · R2 Low Density · **R3 Medium-to-High Density (~48%, the single biggest class)** · R4 High Density · R5 Affordable/EWS Housing
- **Commercial (C)**
  - C1 Mixed Use · **C2 General Commercial (~33%, second biggest)** · C3 Neighbourhood Centre · C4 Town Centre · C5 Regional Centre · C6 Central Business District
- **Industrial (I)**
  - I1 Business Park · I2 Logistics · I3 Non-polluting Industry
- **Public / Semi-public (S)**
  - S1 Government · S2 Education · S3 Special · (+ sub-zone variants: Cultural, Health & Wellness)
- **Recreation / Open space (P + greens)**
  - P1 Passive (parks/gardens) · P2 Active (sports/recreation) · P3 Protected (incl. hills) · PGN-G (green/walkway) · PGN-V (village green) · RAA (Road Affected Area)
- **Utilities / Reserve (U)**
  - U1 Reserve · U2 Road Reserve (the generic road-reserve plots beneath the named grid)
- **Other** — Burial Ground
- **Special / sub-zones (S-prefixed master-plan variants)** — SC1a/b Mixed Use, SR2/SR4 housing, SP1/2/3, SU1/2, SS1/2a/2b/2c/3. Lower-density, can fold into their parent family if the palette runs out of distinct hues.

> **Status modifier (orthogonal to zone):** plots are **Vacant** vs **Returnable/allotted**
> (LPS land returned to farmers vs assigned). Today only "Residential Vacant" /
> "Commercial Vacant" are distinguished. The design should treat status as a *modifier*
> (e.g. texture / lightness) on top of the zone hue, not a separate hue.

### B. ROADS
- **Named trunk grid (N1–N18, E1–E16; 35 roads)** — authentic APCRDA polygons. Classes:
  - Major Arterial (60 m ROW) · Arterial (50 m) · Sub-Arterial (50 m) · Seed Access Road (E3, the 60 m spine) · Collector (25 m)
  - Modifiers: BRT corridor · connects to NH-16
  - **Today: one gold fill + subtle outline for all.** Owner is open to rethinking this
    (fill vs cased line vs pattern). They want roads to read clearly as roads over the
    coloured plots, ONE treatment for all named roads (not per-class colours), with class
    shown on click.
- **Wider road network (context, optional layers):** LPS collectors (~2,867), existing
  roads, National Highways / NH-16, Inner Ring Road (IRR), railway lines.

### C. ALLOTTED LANDS (named institutions — overlay on zoned plots)
118 real allotments. An allotment is a **named entity** sitting *on* a zoned plot — it is
NOT a separate land-use. Categories (count):
- Govt of India (23) · Govt of India PSU (19) · Govt of AP (13) · Govt of AP PSU (2)
- University (8) · School (9) · Healthcare (2) · Sports (2) · Spiritual/Religious (3)
- Hotel (14) · PPP/Private (4) · Housing (4) · Other (15)
- Each also carries **FSI** (development intensity) and the **zone it occupies**.
- Design question: should allotments be one overlay treatment (so they read as "allotted")
  with category shown on click, or category-coloured? (Owner's pain: a university currently
  reads inconsistently as "allotted" vs "education zone" — the design should make the
  two facts legible without competing.)

### D. WATER / ENVIRONMENT
- River Krishna + water bodies. Plus protected greens / hills (overlaps P3 above).

### E. ADMINISTRATIVE BOUNDARIES & REGIONS
- Capital Planning Boundary (1) · AGC (Govt Complex) Boundary · Seed Capital Boundary
- Authentic hierarchy: Townships (28) · **Sectors (145, official)** · Colony (571) · Blocks (3,767) · Villages (27)
- **Custom grid Region — "Node" (NEW):** each cell bounded by two adjacent N roads (W–E)
  and two adjacent E roads (S–N), labelled **`Node {lowerN}·{lowerE}`** — e.g.
  `Node 7·3` = the cell between N7–N8 and E3–E4 (`Node 12·10` at two-digit edges; the dot
  disambiguates). Bounding roads shown on click. A site-custom region for orientation/
  search — distinct from the 145 official APCRDA Sectors. Needs a subtle cell-boundary +
  small code-label treatment that doesn't fight the zoning fills.

### F. SPECIAL AREAS (context overlays / scoring anchors)
- Amaravati Government Complex (AGC) · Seed Capital Area · Industrial Area · Land for
  Monetization · Land under R5 · Land mortgaged to HUDCO. These drive desirability
  (e.g. Govt-Complex proximity = premium) and may get accent/boundary treatments.

### G. LABELS (symbol layers)
- Zone labels (on click/panel) · Road names (N/E) · Allotment names · Region codes ·
  Landmark/place names · admin labels. Need a legible hierarchy on the dark canvas
  (size/weight/halo) — roads vs regions vs institutions shouldn't all look the same.

### H. INTERACTION STATES (each needs a defined treatment)
- Default · Hover · **Selected / highlighted** (plot + road) · Search result (fly-to + mark)
  · Dimmed / filtered-out (when a zoning filter hides categories) · Disabled.

### I. COLOUR / DATA MODES (the map re-encodes the same plots several ways)
These should feel like a coherent family, not three unrelated palettes.
1. **Zoning** (default) — categorical land-use (the taxonomy in §A).
2. **Plot-area heatmap** — sequential, plot size (Sq. Yards).
3. **Land-value / desirability score** (planned scoring engine) — sequential/diverging.
4. (Possible) **Status** — vacant vs allotted vs built.

---

## 3. Per-plot data available (for future encodings)
`symbology`/`lu_code` (zone), official zone name, area (Sq.Yards), frontage (m), polygon
dims, FSI (via allotments/available-lands), village/township/sector/block, region code,
vacant/allotted status, and (planned) a computed desirability score. Any of these can be
a visual encoding — the design should leave room for the score heatmap especially.

---

## 4. Hard constraints for any palette
- Reads on a **dark** canvas (no basemap); owner open to a light variant as a proposal.
- Must distinguish **~20 zone categories simultaneously** — needs hue *families* with
  intra-family steps, not 20 unrelated hues.
- **Colour-blind safe** (deuteranopia/protanopia) for the categorical zoning at least.
- Legible at zoom 10 (whole city, sub-pixel plots) → 19 (single plot).
- Works across **fills (plots), thin polygons/lines (roads), symbols (labels)** and the
  **selected/hover** states without muddiness.
- Output must map to MapLibre paint props (fill-color, fill-opacity, line-color, etc.).
