---
id: adr-008-scoring-engine
title: Explainable land-value scoring — a dominant-anchor model over the 1km road grid
date: 2026-07-16
status: accepted
tags: [product, scoring, model, curated, cat:product]
---

## Context

Success criteria #101/#102 require an **explainable, relative** desirability score at the
**1 km-grid region level**, with commercial and residential shown **separately**. A standing
non-goal forbids ingesting transaction prices ("relative index only"), and no reliable
transaction registry exists anyway.

`AMARAVATI_CONTEXT.md` establishes what actually moves value here:

- Proximity to **status-weighted anchors**, with the **Government Complex dominant**.
- The **dominant-anchor effect**: a plot can be average on everything yet sit beside a huge
  *already-built* anchor (a university, the Secretariat) and command a premium. So the model
  must **not** be a flat weighted sum (`UNDERSTANDING.md` §2 states this explicitly).
- Broker prices are **promotional** — usable as *ordering*, never as truth.
- **Flood risk** near Kondaveeti Vagu / Undavalli / Penumaka is a real downside factor.
- Many 2014–19 MoUs **never got built** → status must be weighted, not assumed.

Constraint: the authoritative plot-mosaic reprocess (#136) is deferred (owner, 2026-07-16),
so scoring must run on data already on the server.

## Decision

Score the **1 km-grid "Node" cells** — the region unit confirmed in `UNDERSTANDING.md` §2 —
computed from the authentic trunk-road axes exactly as the client's `computeNode` does.
(Owner locked *"1km-grid Node, as specced"* over the village alternative on 2026-07-16.)

**Model**

1. **Two lenses:** `commercial_score` and `residential_score`, each a 0–100 relative index,
   min–max normalised across cells.
2. **Dominant-anchor blend — explicitly not a flat weighted sum:**
   `raw = α·max(influence) + (1−α)·aggregate`, with **α = 0.6**, so one strong nearby built
   anchor sets a floor an otherwise-average cell cannot wash out.
   `aggregate = 1 − Π(1 − influence_i)` over the **top-5** anchors only (noisy-OR). A plain
   `Σ` was the original intent but saturates — see Amendments.
3. `anchor_influence = base_weight(type, lens) × status_multiplier × distance_decay(d)`.
4. **Status multipliers (the golden rule):** operational **1.0** · under-construction **0.7** ·
   committed/allotted **0.4** · MoU/planned **0.2**.
5. **Anchor catalog: 32 entries** transcribed from `AMARAVATI_CONTEXT.md` §3 — **27 resolved**,
   5 skipped (village absent from the plot data; see Amendments). Each is located at its
   **village centroid**, derived offline from `search.json` plot coordinates.
6. **Lens factors:** commercial → Government Complex, Finance City, arterial/E3 frontage,
   NH-16 access. Residential → universities/schools, parks, quieter zones, moderate core
   proximity. Both → road/BRT proximity and a **flood penalty**.
7. **Explainability:** each cell stores its **top 3 drivers**, surfaced in the plot panel.
8. The **global political-reversal risk is a constant** discount — it cannot change relative
   ordering, so it is excluded from the score and surfaced as a **UI caveat** instead.

**Data flow**

Offline `pipeline/10_scoring.mjs` → `public/data/region_scores.json`. The client renders a
**Value** colour mode by reproducing the Node assignment as a MapLibre
`step → concat → match` expression over the per-feature `lat`/`lon`, so **no tile
regeneration is required** — which is what keeps this shippable while #136 is deferred.

## Consequences

- **Positive:** runs entirely on data already on the server (unblocked by #136); explainable
  by construction (drivers per cell); cheap to re-tune (weights live in one file); ships the
  Value mode without tippecanoe.
- **Accepted trade-off — zoning mix deferred:** `search.json` carries no per-plot zoning, so
  the lens split comes from anchor/factor weighting rather than per-region zoning
  composition. Revisit when #136 lands and per-plot `lu_code` is available.
- **Accepted trade-off — cell granularity:** every plot in a Node cell shares one colour;
  per-plot differentiation by frontage/size is a later refinement.
- **Accepted trade-off — anchor precision:** anchor → village-centroid is an approximation;
  exact anchor coordinates would sharpen the distance decay.
- **Sanity gate:** the index is checked against the documented price gradient — see the
  amendments below for what that gate actually became once it met the data.

## Amendments — 2026-07-16 (during build; owner-adjudicated)

The gate did its job: it caught two real model bugs before anything shipped, then exposed a
problem in its own reference. Recorded here so the ADR matches what was built.

**Bugs the gate caught (fixed):**
1. **Noisy-OR saturation.** Aggregating ~27 anchors at a 2.0km decay pushed *every* cell —
   including remote ones — to ~0.75, flattening the field and letting road/FSI extras
   dominate. Fixed: decay tightened to 1.5km and the aggregate restricted to the **top-5**
   anchors (the "nearby cluster" the dominant-anchor effect actually means).
2. **The existing city was missing entirely.** Penumaka/Krishnayapalem/Venkatapalem scored
   far below their §4 bands because every anchor was a *capital* anchor. §4 prices that whole
   southern corridor on **Vijayawada access** via the Kanakadurga Varadhi crossing. Added a
   `gateway` anchor at Undavalli, with a **per-type decay (4.0km)** — a metro's pull does not
   decay like a campus's. Penumaka 14→41 (band 40), Krishnayapalem 15→32 (35),
   Venkatapalem 21→34 (43).

**§4 (price table) outranks §7 (prose gradient).** They genuinely contradict: §4 puts
Undavalli/Penumaka at 35–45k (High, level with Thullur); §7 ranks them *below*
Krishnayapalem/Nidamarru. Gating on §7 would have required inflating the flood discount until
the model contradicted §4's own prices. Owner adjudicated for §4. Ananthavaram/Abbarajupalem
were **dropped from the reference**: §4 quotes them in ₹cr/acre (bulk farmland), not ₹/sq.yd
(serviced plots) — a product mismatch, not a lower price.

**Gate downgraded from hard-fail to reported warning.** The reference proved too weak to fail a
build on: explicitly promotional, internally contradictory, unit-mixed, n=12. Its largest
disagreements are where the model is defensibly **right** and the band is lagging —
Uddandarayunipalem (Quantum Valley, "the highest-value tech anchor") and Nelapadu (operational
+ permanent High Court). Forcing ρ upward would mean damping real anchors to match marketing
data. The pipeline now **prints the full price comparison and ρ on every run** and ships;
`region_scores.json` carries `price_reference_rho` and a `price_caveat`, and the UI states the
index may diverge from asking prices. Current ρ = **0.398**.

**Nelapadu divergence accepted (owner).** Its High Court anchors legitimately outrank its stale
20–35k broker band. The score is a forward-looking desirability index, not a price estimate.

**Gateway + riverfront merged.** Both resolved to the identical Undavalli centroid, so two
entries double-counted one place. Collapsed into a single `gateway` anchor.

**Village aggregation fixed.** Village means now attribute each plot to its **own** village
rather than to its cell's plurality label — a 1km cell straddles villages, and a core-adjacent
mixed cell was inflating whichever village happened to be its modal label (Abbarajupalem).

**Anchors skipped, not invented (5).** SRM University-AP (Neerukonda), AIIMS Mangalagiri, Pi
Datacenters, NRI Academy (Chinakakani), ACA Stadium (Navuluru) — their villages are absent from
the plot data (§6 flags that cluster as real but off the core land-pool). No coordinates were
fabricated; the pipeline reports the skips on every run. Supplying real coordinates for these
would sharpen the southern/edge scores.

---

## Amendment — 2026-08-09: flood downside retired

**The flood factor was removed from the model.** It is gone, not disabled.

§5 of `AMARAVATI_CONTEXT.md` flags a real downside: Kondaveeti Vagu inundated the capital
region twice in a year, and low-lying land near **Undavalli / Penumaka** carries genuine flood
risk. The model encoded that as a village allowlist — `FLOOD_VILLAGES = {undavalli, penumaka}`
— discounting matched cells by `FLOOD_C = 0.12` (commercial) / `FLOOD_R = 0.18` (residential).

The move to the authoritative **LPSMosaicDec2024** (#136) removed both villages from the
dataset entirely: APCRDA's LPS mosaic contains **no plots** in Undavalli or Penumaka. Measured
2026-08-09 — Penumaka 3,970 plots and Undavalli 1,124 in the previous scrape, **0 and 0** in
the mosaic. The penalty therefore matched **0 of 161 cells**, and no cell has ever carried the
`flood-prone (−)` driver since the reprocess, while the model docstring still advertised
`− floodPenalty` as part of the formula. A factor that cannot fire is worse than no factor: it
reads as covered risk that is not covered.

**Removal is numerically inert.** Verified by regenerating `region_scores.json` and diffing all
161 cells before/after: 0 cells changed on `c`, `r`, or `drivers`; ρ unchanged at 0.455.

**Why not re-target it instead.** Flood exposure is geography, not village membership — it
belongs to low-lying ground along the Kondaveeti Vagu alignment, which crosses villages that
*are* in the dataset. Re-deriving it needs the vagu geometry plus elevation, which we do not
currently hold. Rebuilding it on a fresh village allowlist would repeat the original mistake at
a different address. Filed as a to-do rather than guessed at.

**Price reference corrected alongside.** `PRICE_REF` still carried `penumaka: 40` and
`undavalli: 40`. Both were silently skipped at gate time, which had quietly shrunk the
reference from **n=12 to n=10** without ever saying so — the run log claimed only "n=10". The
dead rows are removed, the log now prints `n=<used>/<total>`, and any future reference village
with no plots is reported by name instead of vanishing. The §4-vs-§7 contradiction over
Undavalli/Penumaka that this ADR previously adjudicated is now **moot**: neither village has
plots to score.

**Stale figure corrected.** This ADR previously recorded ρ = 0.398; the current value is
**0.455** (n=10/10, reported not enforced).
