# Amaravati — Real-World Context & Intelligence Base

**Compiled 2026-06-29 from 9 parallel web-research streams.** This is the sourced, dated, confidence-flagged knowledge base that feeds (a) the named-roads layer (L1) and (b) the land-value / desirability engine (L2–L4: anchors, proximity, scoring, freshness). Companion to `UNDERSTANDING.md`.

> **Golden rule for the model:** weight by **status** — `operational` > `under-construction` > `committed/land-allotted` > `MoU/proposal/planned`. Many 2014–19 MoUs never built. Government completion dates are targets and historically optimistic. Broker prices are promotional. Flag, don't trust.

---

## 0. Timeline, funding & the freshness frame (why "status" matters)

- Conceived **2015** (TDP/Naidu); master plan by **Foster + Partners** (217 km², 9 themed "Navaratna" cities, green spine, ~30% green/blue).
- Built 2015–19 → **FROZEN 2019–2024** (YSRCP "three-capitals": legislative=Amaravati, executive=Visakhapatnam, judicial=Kurnool) → **REVIVED June 2024** when TDP-NDA returned and reaffirmed Amaravati as sole capital.
- **Restart markers:** Naidu puja **19 Oct 2024**; **PM Modi foundation-laying relaunch 2 May 2025** (₹57,962 cr works package — *foundation stones, not inaugurations*; flagship buildings were **restarting**, not finishing).
- **Funding (high confidence):** World Bank **$800M** (20 Dec 2024) + ADB **$788.8M** → **~$1.6B Phase-I**; HUDCO ₹11,000 cr; NABFID ₹7,500 cr. Program ~$3.6–6B over **2025–2029**. Phase-I = **Zones 1–7 & 10, ~92 km²**. WB 1st tranche (~$207M) disbursed Mar 2025.
- **Targets:** govt claims Phase-1 / High Court ~**2027**; Government Complex ~**Mar 2028**. Realistic = **2028+**.
- **RISKS (encode as a global discount):** (1) **political reversal** — next AP election ~**2029**; a YSRCP return could re-freeze; (2) **litigation** overhang (land-pooling / three-capitals); (3) **farmer LPS grievances** (~33,000 acres pooled, returnable plots delayed; Phase-2 ~44,000 acres drew "Land Grab 2.0" protests, Jan 2026); (4) **Phase-2 LPS** announcement caused a **short-term price DIP** — prices are *not* monotonic.
- **Credibility flags (haircut the official narrative):** Singapore consortium (Ascendas-Singbridge/Sembcorp) **exited** the Startup Area master-developer deal in 2019 (that parcel is now Quantum Valley). **CAG** flagged **~₹2,244 cr wasteful expenditure** + ~70% of land pooled "against expert advice." A **TISS audit's independence is questioned** (CRDA funds it; seen as optics to unlock WB/ADB loans). **2022–23 CRDA land auctions FAILED for lack of bidders** (base ₹5.41–5.94 cr/acre); the **₹20 cr/acre × 4,000-acre = ₹80,000 cr** monetisation is a **2025 policy target, not realized** (analysts: "could take 15 years"). AP may revive **Amaravati Bonds** (2018 tranche, 10.32% coupon, matures Aug 2027) to fund completion. Official **IGRS guidance values were NOT revised for the capital area** — the secondary-market spike is broker-driven.

---

## 1. Themed cities → village mapping (the spatial backbone)

Themed-city boundaries are master-plan-soft, but their **village anchors** are well-sourced and JOIN to our plot data (`village` field). Use villages as the region key.

| Themed city | Purpose | Key villages (in our data) |
|---|---|---|
| **Government City** (core) | Secretariat, Assembly, HC, govt housing | **Velagapudi, Rayapudi, Lingayapalem** |
| **Justice City** | Judiciary, Law University | (adjacent to Govt core) |
| **Finance City** | "India's first Integrated Financial City" | (core, near Govt City) |
| **Knowledge / Education City** | Universities | **Neerukonda, Inavolu (Ainavolu), Kuragallu, Mandadam, Venkatapalem, Sakhamuru, Nidamarru** |
| **Health City / Medicity** | Hospitals | **Thullur, Nidamarru, Nowluru, Krishnayapalem** |
| **Electronics City** | IT/electronics (~6,582 ac) | **Nidamarru/Nadamarru** belt |
| **Sports City** (original) | Sports hub (stalled) | **Thullur, Ananthavaram, Pitchakalapalem** |
| **Tourism City** | Tourism/leisure (~531 ha) | near **Undavalli**, Krishna riverfront |
| **Media City** | Media/cultural | near Ananthavaram (low confidence) |

---

## 2. Roads & transport (feeds L1 + proximity)

**Grid (World Bank RAP, HIGH):** E-series = **E–W (E1–E16)**, N-series = **N–S (N1–N18)** — *confirmed*. Core = **1 km × 1 km arterial grid**; nested **500 m × 500 m** neighbourhood cells (the "250 m sub-block" is **unconfirmed** — don't use). Government Complex = 5.5 km × 1 km band.

**ROW hierarchy (World Bank EIA-EMP, HIGH) — corrects our data:**

| Class | Count | ROW | Total length | BRT |
|---|---|---|---|---|
| Major Arterial | 3 | **60 m** | 44 km | — |
| Arterial | 17 | **50 m** | 107 km | — |
| Sub-Arterial | 17 | **50 m** | 145 km | yes (4-lane + 2 BRT on some) |
| Collector | — | **25 m** | 277 km | — |

> 🛠 **`roadAttributes.js` corrections to make:** (1) ROW — **arterials are 50 m, only major-arterials are 60 m** (our file has several arterials at 60 m). (2) **E3 = Major Arterial seed road, ~60 m, 8–9 lane, *with* BRT** (our file says "4+0+4, no BRT"). (3) E-roads that connect to NH-16 = **E5, E7, E9, E11, E13, E15** (not the current set). Apply with owner sign-off — these change road colors/panel values.

**Per-road specifics (HIGH = World Bank EIA, 2018; the cleanest per-road source):**

| Road | Class | ROW | Lanes | Len km | Villages it runs through |
|---|---|---|---|---|---|
| N4 | sub-art | 50 | 4 | 7.17 | Penumaka, Nowluru, Krishnayapalem, Venkatapalem |
| N9 | sub-art | 50 | 4+2 BRT | 12.5 | Nidamarru, Kuragallu, Mandadam, Malkapuram, Velagapudi |
| N11 | sub-art | 50 | 4+2 BRT | 8.66 | Ayinavolu, Kondamarajupalem, Nelapadu, Sakhamuru, Rayapudi, Velagapudi, Lingayapalem |
| N14 | sub-art | 50 | 4 | 8.27 | Borupalem, Abbarajupalem, Thullur, Sakhamuru |
| N16 | sub-art | 50 | 4 | 7.36 | Borupalem, Pichukalapalem, Thullur, Ananthavaram, Nekkallu |
| E6 | sub-art | 50 | 4+2 BRT | 9.84 | Ananthavaram, Nelapadu, Thullur, Velagapudi |
| E8 | sub-art | 50 | 4+2 BRT | 14.96 | Nekkallu, Thullur, Sakhamuru, Velagapudi, Malkapuram, Mandadam, Venkatapalem, Krishnayapalem |
| E10 | sub-art | 50 | 4 | 7.81 | Inavolu, Mandadam, Venkatapalem, Kuragallu, Krishnayapalem, Nowluru, Penumaka |
| E12 | sub-art | 50 | 4+2 BRT | 6.79 | Kuragallu, Nowluru |
| E14 | sub-art | 50 | 4 | 7.36 | Kuragallu, Nowluru, Nidamarru |

*(Single-segment grid roads span ~7–15 km. Ignore the 50–72 km figures some sources give — those are package aggregates. The rest of N/E lack clean per-road specs in HIGH sources; the APCRDA road-network deck holds them but is paywalled.)*

- **E3 — Seed Capital / Seed Access Road** (Major Arterial, ~21 km, 8–9 lane **with BRT**): Dondapadu→Venkatapalem→Penumaka→Undavalli; NH-16 link at **Kanakadurga Varadhi** via Phase-III **320 m cable bridge** (₹593 cr). **Ph1 (18.3 km) COMPLETE/operational**; Ph2 started Sep 2025; Ph3 underway. *(Distinct from the "Iconic Bridge" below.)*
- **NH-16 links:** **E5, E7, E9, E11, E13, E15** connect to NH-16 (E5/E7/E9 without land acquisition; E11 in front of AIIMS, E13 behind it). E13/E15 extensions tendered. **N13/E5/E13 = elevated corridors** (major arterial).
- **Iconic Bridge:** separate ~5 km 6-lane cable-stayed Krishna bridge, **Rayapudi ↔ Muktyala/Mulapadu**, linking NH-65/NH-16 — **planned/DPR**, seeking central funds.
- **IRR:** **96.2 km, 75 m ROW, 8-lane, PPP**; Phase-1 (67.6 km Kethanakonda→Nunna) DPR ready, land pooling underway; trunk roads targeted **~April 2027**.
- **ORR:** **~189 km, 6-lane, NHAI**, 140 m ROW approved (May 2025); land acquisition pending; ~₹16,000–24,791 cr (conflicting). Realistic start 2028+.
- **Rail:** new **Errupalem–Amaravati–Namburu line** (57 km, ₹2,245 cr, Cabinet Oct 2024, 9 stations, ~3.2 km Krishna bridge) — the first line *into* the capital. Plus proposed **~104 km semi-high-speed circular rail** (Vijayawada–Guntur–Tenali, ₹10–12k cr, in-principle Railways approval). **No station inside Amaravati yet** (served by Guntur Jn ~32 km, Krishna Canal Jn).
- **Metro:** Vijayawada Metro Phase-2 corridor (PNBS→Amaravati Reservoir, ~27.75 km) reaches the capital (planned). No dedicated Finance-City/Govt-Complex MRT line confirmed.
- **Air:** **Vijayawada/Gannavaram (~41 km)** is the gateway (new ₹611 cr terminal ~2025-26). A greenfield **Amaravati airport** is **pre-feasibility only** (APADCL RFP Apr 2025 — no site, no DPR).
- **Highways:** NH-16 runs **north of the Krishna** (capital is south bank); grid roads + Seed Road cross to it at Vijayawada. **Hyderabad–Amaravati greenfield expressway** (298 km, 6-lane, ~₹25,000 cr) Centre-approved Apr 2025, DPR stage.

---

## 3. Anchor catalog (the core valuation input)

Each anchor: **status · village/zone**. Status legend: 🟢 operational · 🟡 under-construction · 🔵 committed/land-allotted · ⚪ MoU/proposal/planned.

### Government core (the #1 value driver — dominant anchor)
- 🟢 **Velagapudi Interim Secretariat** (working govt seat since 2016) — Velagapudi
- 🟢 **Interim High Court** (2019) — Nelapadu
- 🟡 **Legislative Assembly** (Foster; L&T ₹617 cr; ~Mar 2028) — Govt Complex / Super Block E, near Rayapudi
- 🟡 **Permanent High Court** (Foster; NCC ₹786–1,048 cr; ~end-2027) — Justice City
- 🟡 **Secretariat GAD Tower** (NCC ₹882 cr) + **HoD Towers 1–4** (Shapoorji ₹1,487 cr; L&T ₹1,304 cr) — near Rayapudi
- 🟡 **MLA/MLC quarters** (288 units, near handover 2026), **IAS/IPS housing** (144 units), **ministers' bungalows** (35), **CM residence** (Velagapudi, near E9) — Govt residential zone
- 🔵 **Lok Bhavan / Raj Bhavan** (Cabinet L1 Dec 2025)

### Iconic residential
- 🟡 **Happy Nest** (12 towers, 1,200 flats; NCC ₹930 cr) — **Nelapadu** (14.46 ac)

### Education (Knowledge City — strong operational anchors)
- 🟢 **SRM University-AP** (2017) — Neerukonda
- 🟢 **VIT-AP** (2017) — Inavolu, beside Secretariat
- 🟢 **Amrita Vishwa Vidyapeetham** (2021) — Kuragallu
- 🟢 **NID-AP** (permanent campus 2024) — Sakhamuru
- 🟡 **XLRI** (~₹300 cr) — Inavolu, next to VIT-AP
- 🔵 **BITS Pilani "AI+" campus** (₹1,000 cr, ~70 ac, intake ~2027) — Mandadam/Venkatapalem/Thullur
- 🔵 **India Intl University of Legal Education** (55 ac) — Justice/Knowledge City
- 🟡 **Govt International Model School** (₹15 cr) — Nidamarru
- ⚪ **Indo-UK Institute of Health (IUIH)** — announced 2017, **never built / dormant** (clearest casualty)
- ⚠️ NOT in Amaravati: Central University of AP (Anantapur), DSNLU (Vizag), SPA (Vijayawada). Purdue/Anna campuses unconfirmed.

### Health (Health City / Medicity)
- 🟢 **AIIMS Mangalagiri** (OPD 2019, ~500–650 beds, PM inaug. Feb 2024) — Mangalagiri (edge)
- 🟢 **NRI Academy of Medical Sciences** (~1,280 beds) — Chinakakani
- 🟡 **Basavatarakam Indo-American Cancer Hospital** (₹750 cr, 500→1,000 beds, ~2028) — **Thullur** (21 ac)
- 🟡 **KIMS Hospital + Bollineni Skill University** (500-bed + 1,000-bed teaching, ~2027) — **Nidamarru** (25 ac)
- ⚪ **Mega Global Medicity** (200 ac, PPP, Qatar interest) — zone TBD *(may overlap the IUIH "Health City" vision)*

### Tech / data (the genuine tech anchors)
- 🟢 **Pi Datacenters** (India's 1st Tier-IV, 60 MW) — **Mangalagiri** *(only operational DC)*
- 🟡 **Amaravati Quantum Valley** (IBM + TCS + L&T; foundation Feb 2026, IBM Heron op. target Dec 2026) — **Uddandarayunipalem** (50 ac) *(highest-value tech anchor)*
- 🟡 **L&T IT Tower** (first allotment in Electronics City) — **Nidamarru/Nadamarru**
- ⚪ **Microsoft** quantum (MoU stage)

### Finance
- 🟡 **Integrated Financial City** — 15+ bank/insurer regional HQs (RBI, SBI, BoB, Canara, PNB, Union, Indian Bank, HDFC, NABARD, LIC, etc.); FM Sitharaman foundation Nov 2025 — Finance City (core)

### Hospitality (committed cluster — land allotted, pre-construction)
- 🟡 **Marriott** (Southern Globe, ₹200 cr, ~2029) — **Lingayapalem** (opposite APCRDA office)
- 🔵 **Hyatt + Convention Centre** (6.5 ac) — **Thullur**; plus **DoubleTree, Novotel, Vivanta (Taj), Westin, Crowne Plaza, Holiday Inn, Daspalla, GreenPark, GRT, Ginger, IRCTC** — land allotted, capital core
- ⚪ **Taj, Oberoi** — requested land, not allotted

### Parks, riverfront, sports, tourism
- 🟡 **Sakhamuru Central Park + reservoir** (~300 ac) — **Sakhamuru** *(most advanced green item; UC)*
- 🔵 **Biodiversity Park** (200 ac) — **Kuragallu**; **Lung-space Park** (31 ac) — **Ananthavaram**; **Malkapuram Park** (21 ac); **Rainforest** (Sakhamuru, ₹17.58 cr, tendered)
- ⚪ **Krishna Riverfront** (~27 km; marina approved Jan 2026; master-plan/DPR tender Feb 2026) — riverfront edge near Undavalli *(planned, high value-signal, low build certainty)*
- ⚪ **Green Spine** (5.5 km × 1 km) through govt core
- 🟡 **Tree-lining** underway on 22 trunk roads (Dec 2025)
- 🟢 **ACA Cricket Stadium** (~90% built) — Navuluru/Mangalagiri (edge, NOT in land-pool)

### Other allotments (🔵 land-allotted, Jul 2025 CRDA list — committed, mostly pre-build)
- **Tech/edu:** 🔵 **NIELIT** "Quantum & AI University" (first South-India campus, MoU Feb 2026); ⚪ **UN-affiliated AI Centre of Excellence** (MoU 2026)
- **Schools (K-12):** Podar Intl, Chinmaya Mission, Glendale, Kendriya Vidyalaya, St Mathew's, DAV
- **Banks/PSU/govt offices:** RBI, SBI, NABARD, Union Bank, BoB, BoI, Canara, Indian Bank, LIC, HUDCO, CAG, CPWD, Dept of Posts, HPCL, MEA, **IGNOU**, ESIC, Zoological Survey of India, State Forensic Lab, APNRT
- **Religious/charitable:** **TTD** (Tirumala Tirupati Devasthanams), Ramakrishna Mission, Brahmakumaris
- **Skilling:** L&T Construction Skills Institute, CITD
- *Allotment aggregates (conflict by date/scope): 71 orgs/1,050 ac (May 2025) · 130 institutions/1,660 ac/₹677 cr (Aug 2025). "Allotted/willing to start" ≠ built.*
- *Note: many of these names already appear in our `allocated_lands.geojson` labels (IGNOU, CAG, CPWD, ESIC, TTD, Ramakrishna Mission, banks) — so they're geocodable to actual parcels in our data.*

---

## 4. Real-estate market (indicative — broker-sourced, treat as ordering not truth)

**Price gradient, mid-2025 (₹/sq.yd, broker/portal — promotional):**

| Tier | Villages | ₹/sq.yd |
|---|---|---|
| Top (govt core) | **Velagapudi, Rayapudi** | 45,000–60,000 |
| High | **Mandadam** | 40,000–50,000 |
| High | **Thullur, Penumaka, Undavalli** | 35,000–45,000 |
| Mid (E3 frontage premium) | **Venkatapalem** | 31,000–55,000 |
| Mid | **Nidamarru, Krishnayapalem, Uddandarayunipalem** | ~30,000–40,000 |
| Outer | **Nowluru, Nelapadu** | ~20,000–35,000 |
| Outer (large parcels) | **Ananthavaram, Abbarajupalem** | ₹2–4 cr/acre |
| Entry (lowest) | **Dondapadu** | ~28,000 |

- **CRDA monetisation benchmark:** prime land pegged ~**₹20 cr/acre** (~₹41,000/sq.yd) to raise ~₹80,000 cr. Best available *official-intent* price signal.
- **Premium drivers (broker-asserted, directional):** Govt-Complex proximity = top band (+15–25%); **E3 seed-road frontage roughly doubles the floor price**; institution adjacency (BITS/universities); riverfront/bridge access.
- ⚠️ **No reliable transaction registry; specific CRDA e-auction clearing rates not found.** Every ₹ figure is promotional.

---

## 5. Utilities & flood risk

- **Trunk utilities** bundled into WB/ADB packages (Phase-I Zones 1–7 & 10): bulk water ring main (45 km), sewerage (13 zones, ~330 MLD), reuse-water network, power + ICT ducts, STPs. **NCC Zone-12** awarded (₹2,129 cr, Mar 2025).
- **Water:** 190 MLD WTP (₹560 cr, tender May 2025) — **Krishnayapalem** (E5–N4 junction); source = Krishna River; demand 468 MLD@15yr.
- **Power:** transmission push + 400/220 kV substations + undergrounding (figures mostly social-media-sourced ⚠️ unverified).
- **District Cooling** (Govt Complex, 5,000→20,000 TR) — re-tendered 2026.
- 🚩 **FLOOD DOWNSIDE FLAG:** **Kondaveeti Vagu inundated the capital region Aug 2025 (2nd time in a year)**; mitigation reservoirs/canals (₹1,585 cr) still in tendering. **Low-lying plots near Kondaveeti Vagu / Undavalli / Penumaka carry flood risk** — encode as a negative factor.

---

## 6. EXCLUSIONS (do NOT raise plot values for these)

| Item | Why excluded |
|---|---|
| **Google $15B AI hub, Adani 1GW DC, Reliance-Brookfield $11B DC, ArcelorMittal steel** | All in **Visakhapatnam / Anakapalli (~350 km)** — same state, NOT Amaravati. The single biggest press-confusion trap. |
| **New "Global Sports City" + 1.3-lakh stadium** | Location contested; leading 2025 site is **across the Krishna at Moolapadu (NTR district)** — likely outside our plot dataset. |
| **Amaravati Maha Stupa, ASI Museum, Dharanikota** | The ancient heritage cluster is **~21 km away (Palnadu)** — the capital borrowed the brand; don't weight heritage proximity for capital plots. |
| **Buddhavanam theme park** | In **Telangana**, not AP capital region. |

**Edge anchors (real but off the core land-pool):** AIIMS & ACA stadium (Mangalagiri edge), Undavalli Caves (riverfront near Vijayawada), Pi Datacenters (Mangalagiri).

---

## 7. Implications for the valuation engine (L4)

**Factors to encode (proximity unless noted):**
1. **Government Complex** (Rayapudi/Velagapudi core) — the **dominant anchor**; strongest premium.
2. **Operational anchors** — universities (Neerukonda/Inavolu/Kuragallu/Sakhamuru), Quantum Valley (Uddandarayunipalem), Pi DC/AIIMS (Mangalagiri edge). Weight by status.
3. **E3 seed road + arterial/BRT frontage** — frontage ~doubles floor value; use `max_frontage_m` + named-road distance.
4. **Krishna riverfront** — future premium (planned).
5. **Institution adjacency** (hospitals, hotels cluster, Finance City).
6. **Zoning + plot characteristics** (official zoning = commercial/residential lens; size; frontage).
7. **High-density zone proximity.**

**Status-weighting & dominance:** discount MoU/planned heavily vs operational; a single strong *built* anchor (university, govt complex) can dominate an otherwise-average plot (the "dominant-anchor" effect).

**Downside factors:** flood-prone low-lying near Kondaveeti Vagu/Undavalli/Penumaka; outer/entry villages (Dondapadu, Abbarajupalem); global political-reversal discount.

**Region scoring (1km grid / village):** robust gradient — Velagapudi/Rayapudi > Thullur/Mandadam > Krishnayapalem/Nidamarru/Venkatapalem > Undavalli/Penumaka > Ananthavaram/Abbarajupalem/Dondapadu.

---

## 8. Confidence & gaps
- **High confidence:** WB/ADB docs, contractor releases (L&T/NCC/Shapoorji), operational universities/AIIMS/Pi DC, E3 Ph1, the freeze→revival timeline.
- **Medium:** under-construction govt complex + housing + Basavatarakam/KIMS + Quantum Valley (govt/IBM-sourced).
- **Low / verify before relying:** all broker land prices; CRDA e-auction rates (not found); power capacity/cost figures (X/Twitter); exact Phase-1 budget; per-building village tags (approximate — verify vs APCRDA allotment records); per-road N/E lengths (roads research stream still pending).
- **Open data join:** map anchor→village→plots using APCRDA allotment records, not news alone.

*Sources: ~9 research streams, June 2026. Key primary docs: World Bank Technical Assessment (P507508), ADB 58395-001, Foster + Partners master plan, APCRDA. Full URLs in research transcripts.*
