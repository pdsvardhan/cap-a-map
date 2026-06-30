# Product Research — Amaravati Land Explorer

**What this is:** a MECE research framework for a product like ours (an authoritative,
interactive land/parcel + zoning + value-intelligence map for a single fast-developing
city), followed by findings against each lens. Grounded in comparable products and current
best practice (sources at the end). Written 2026-07.

**What we're building (one line):** a neutral, complete, authoritative explorer of *every*
plot in Amaravati — zoning, roads, institutions, and a computed desirability/value score —
for the public, urbanism nerds, investors, and journalists. (Not a broker listings site.)

---

## PART 1 — The MECE framework (what to look for)

Eight mutually-exclusive, collectively-exhaustive lenses. Each lists the questions to answer.

1. **Product category & competitive landscape** — What class of product is this? Who are the
   global comparables and the local (Amaravati) players? Where's the open positioning gap?
2. **Users & jobs-to-be-done** — Who are the segments and what is each actually trying to do?
3. **Feature set** — What's table-stakes for this class vs what differentiates? What do we
   already have vs need to build?
4. **Data strategy & trust** — Sourcing, freshness/update cadence, provenance, coverage,
   accuracy, attribution. Why should a user believe us?
5. **Legal, privacy & ethics** — Using government data; personal data (farmer/owner names);
   India's DPDP regime; "not investment advice" liability; attribution/terms.
6. **UX, design & technical best practices** — Cartographic UX, cognitive load, mobile,
   performance at ~95k features, SEO-friendly architecture.
7. **Monetization / business model** — Freemium, subscription, API/data-licensing, premium
   reports, lead-gen, B2B. What fits, and in what phase. (Owner: explore, not urgent.)
8. **Go-to-market, growth & moat** — SEO/content, shareability, distribution, and what makes
   the product defensible. Plus risks & success metrics.

---

## PART 2 — Findings

### 1. Product category & competitive landscape
- **Class:** "parcel/land intelligence map" — same family as **Regrid** (160M US/Canada
  parcels; map + Property App + API/licensing), **ATTOM** (~155M parcel boundaries, enterprise
  data), **Zoneomics** (AI-standardised zoning/land-use), **Land.id** (consumer land maps).
  The proven pattern: *authoritative parcel geometry + standardised zoning + search + API/
  licensing*, sold across consumer app ↔ developer API ↔ enterprise data.
- **Local players (Amaravati):** `amaravathipropertyexperts.com`, `crda.toplinerealty.in`,
  `amaravativentures.com` — these are **broker listing sites** with a "live price index" by
  village. They sell plots; they don't offer complete, neutral, authoritative parcel data.
- **The gap (our position):** there is **no neutral, complete, authoritative explorer** of the
  full APCRDA parcel fabric + zoning + a transparent value score. Brokers have prices but not
  coverage/neutrality; the government GIS has data but not UX/intelligence. We sit in between —
  *the Regrid/Zoneomics pattern, scoped to one high-interest city, with our own scoring*.

### 2. Users & jobs-to-be-done
- **General public / curious citizens** — "what is this land near me / in the news?" → browse,
  search, understand zoning. (Largest, lowest monetisation, best for SEO/virality.)
- **Investors / buyers / NRIs-diaspora** — "is this plot/area worth it? how does it compare?"
  → score, FSI, proximity to anchors, comparables, region (Node) browsing. (Highest willingness
  to pay.)
- **Brokers / agents** — "find and present plots; generate leads." → search, export, embeddable
  maps. (B2B / lead-gen.)
- **Journalists / researchers / urbanists** — "analyse the master plan, allotments, land use."
  → layers, data export, citations, methodology. (Credibility & PR engine.)
- **(Latent) developers / govt / institutions** — programmatic access → API/data licensing.

### 3. Feature set — have vs need
- **Table-stakes (this class):** pan/zoom map, parcel boundaries, click→detail (zoning, area,
  ownership), text search, layer toggles, legend, basemap-quality cartography, mobile, deep-links.
- **We already have:** full parcel map (~95k), plot detail (official zone, area, frontage,
  owner, village/sector/block), zoning legend + filter, area heatmap, authentic named roads,
  authentic allotments (name/category/zone/FSI), search, dev comment tool.
- **Differentiators to build:**
  - **Value/desirability score** (the headline differentiator — anchors + FSI + region-relative).
  - **Region browsing & identity** (the `Node` grid cells; region pages).
  - **Comparables** ("plots like this / this region vs that").
  - **Save / watchlist / alerts** (retention + a paywall hook).
  - **Share & report export** (PDF/one-pager per plot or region — sharable + monetisable).
  - **Onboarding / explainers** (zoning literacy; first-run guidance).
  - **Authenticated accounts** (gates premium + owner-name access — see §5).
  - **API / data access** (later; B2B).

### 4. Data strategy & trust
- Our edge is **authoritative sourcing** (live APCRDA ArcGIS) — lean into it: show provenance
  ("Source: APCRDA, scraped <date>"), a **freshness indicator**, and a **methodology page** for
  the score. Trust is the product in a space full of broker spin.
- Establish an **update cadence** (re-scrape; diff & changelog). "Last updated" visible.
- **Score transparency:** show *why* a plot scores high (proximity to Govt Complex, FSI, road
  frontage) — explainability beats a black-box number and defuses "advice" risk.

### 5. Legal, privacy & ethics  ⚠️ (the most important non-obvious area)
- **Owner/farmer names are personal data.** India's **DPDP Act (Rules notified Nov 2025; most
  provisions effective ~May 2027)** broadly *exempts publicly-available personal data*, and
  land records are government-published — so re-displaying is likely *legally* defensible.
  **But** republishing thousands of named individuals on a public *valuation* site is a
  reputational/ethical risk and invites complaints regardless of strict legality. The debate is
  explicitly unsettled in India right now.
  - **Recommendation:** **don't surface owner names in the public/anonymous view.** Hide or
    coarsen them; reveal only behind authenticated, justified access (or drop entirely). This
    is low-cost insurance and good ethics.
- **Government data use:** keep clear **attribution** to APCRDA; review the portal's terms; be
  ready to take down on request. Don't imply official endorsement.
- **"Not investment advice":** the score implies value judgements. Add a clear **disclaimer**
  (informational, not financial/investment advice; verify with authorities/professionals) and
  keep the score *explainable* and *relative*, never a guaranteed price.

### 6. UX, design & technical best practices
- **Cognitive load / progressive disclosure:** "show the right info at the right time," bundle
  controls, expose complexity on demand — don't render everything at once. (This is exactly what
  the design-AI pass + the legend rework targets.)
- **Mobile-first:** simplified legend, touch targets, performance-aware rendering; a big share
  of property search is on phones.
- **Immediate interaction feedback:** selection highlights, hover, loading states (we have most;
  formalise them).
- **Visual hierarchy / cartography:** contrast + hierarchy so civic/special zones read against
  the dominant R3/C2 — the core problem in the design brief.
- **Performance:** vector tiles / PMTiles + thin client (already our architecture) is the right
  call for ~95k features.
- **SEO-able architecture:** the map is a JS app (invisible to crawlers). To win organic traffic
  we need **server-rendered, indexable pages** per plot / per region (Node) / per village, each
  with a unique URL, metadata, and structured data — linked from a content hub.

### 7. Monetization (explore-later, phased)
PropTech is large/growing (~$45B 2026 → ~$100B+ 2034). Proven models for *data* products,
roughly in build order:
- **Phase 0 — Free + open (now):** maximise reach, SEO, credibility. No paywall.
- **Phase 1 — Freemium:** free explore; **Pro subscription** for power features (advanced
  filters, comparables, watchlists/alerts, unlimited score detail, exports/reports). Freemium
  works best with self-serve sign-up.
- **Phase 2 — Reports / one-off:** paid **plot/region intelligence PDFs** (pay-per-report) —
  natural for investors/NRIs.
- **Phase 3 — API / data licensing (B2B):** subscription or usage-based API for brokers,
  developers, researchers, portals; bespoke data licensing. (Highest-margin; the Regrid/ATTOM
  model.)
- **Adjacent:** **lead-gen** (hand qualified buyers to vetted brokers — but guard neutrality);
  embeddable widgets for broker sites. **Avoid display ads** (erodes the credible/premium feel).
- **Civic angle:** grants/partnerships (urban-data, journalism, academia) are plausible given
  the public-good framing.

### 8. Go-to-market, growth & moat
- **SEO is the primary free growth engine:** ~90% of property search starts online. Generate
  indexable **per-plot, per-Node-region, and per-village pages** + a **content hub** ("Investing
  in Amaravati", "Understanding APCRDA zoning", per-village guides). Measurable in 3–6 months.
- **Shareability:** deep-linkable map views + clean plot/region share cards → organic spread,
  esp. when Amaravati is in the news.
- **Journalism/PR:** the neutral-authoritative angle + master-plan visualisations are
  press-friendly (drives backlinks + credibility).
- **Moat / defensibility:** (a) the **scraping + enrichment pipeline** (authoritative, fresh,
  hard to replicate well), (b) the **proprietary score** + Amaravati-specific intelligence,
  (c) **SEO/domain authority** compounding over time, (d) single-city depth others won't match.
  Weaknesses: single-city scope (cap on TAM), dependence on the gov data source, no real moat
  on raw data itself (it's public) — so the *intelligence layer + UX + trust* are the moat.

### Risks & success metrics
- **Risks:** PII/owner-name exposure (mitigate per §5); over-claiming value (disclaimer +
  explainability); gov data/source changes (monitor + re-scrape); single-city TAM; takedown
  requests.
- **North-star + KPIs:** weekly active explorers; plots/regions viewed; search→detail rate;
  saved-plot / return rate; organic sessions & indexed pages; (later) free→Pro conversion,
  report sales, API seats.

---

## Recommended priorities (synthesis)
1. **Score engine + region (Node) browsing** — the core differentiator. (In progress.)
2. **Hide owner names in the public view** — quick, important risk fix.
3. **Score methodology + provenance/freshness + disclaimer** — trust scaffolding.
4. **Indexable plot/region/village pages + content hub** — the free growth engine.
5. **Then** layer in accounts → freemium Pro (watchlists/exports/reports).
6. **Later** API/data-licensing for B2B.

## Sources
- [Regrid](https://regrid.com/) · [Regrid Property App](https://regrid.com/property-app) · [Regrid Zoning](https://regrid.com/zoning)
- [ATTOM — parcel boundary data](https://www.attomdata.com/news/most-recent/where-to-find-parcel-boundary-data/) · [ATTOM — best real-estate APIs](https://www.attomdata.com/news/attom-insights/best-apis-real-estate/)
- [Zoneomics](https://www.zoneomics.com/) · [Regrid×Zoneomics partnership](https://www.prnewswire.com/news-releases/regrid--zoneomics-announce-geospatial-data-partnership-nationwide-land-parcels--detailed-zoning-data-to-further-advance-land-parcel-geospatial-analytics-301987458.html)
- API monetization: [Nordic APIs](https://nordicapis.com/9-types-of-api-monetization-models/) · [Zuplo](https://zuplo.com/blog/8-types-of-api-pricing-models) · [Datafiniti subscription vs usage](https://www.datafiniti.co/blog/real-estate-api-pricing-models-explained-subscription-vs-usage-based)
- PropTech market: [HouseCanary — real-estate APIs](https://www.housecanary.com/blog/real-estate-api)
- GIS/map UX: [RevivalPixel — intuitive GIS UX](https://www.revivalpixel.com/blog/lost-in-the-map-how-intuitive-ux-turns-gis-dashboards-from-data-mazes-into-decision-engines/) · [RevivalPixel — map-app performance UX](https://www.revivalpixel.com/blog/ux-design-strategies-high-performance-map-based-applications/) · [Esri — ArcGIS Dashboards](https://www.esri.com/arcgis-blog/products/ops-dashboard/mapping/create-first-arcgis-dashboards)
- DPDP / scraping / PII: [IAPP — scraping public data in India](https://iapp.org/news/a/scraping-public-data-in-india-innovation-enabler-or-privacy-threat-) · [Law.asia — DPDPA scraping exemption](https://law.asia/india-data-scraping-regulation/) · [NLS Forum — public data vs privacy](https://forum.nls.ac.in/ijlt-blog-post/publicly-available-data-privacy-rights-the-debate-over-web-scraping/)
- SEO/GTM: [Sierra Interactive — real-estate SEO](https://www.sierrainteractive.com/insights/blog/real-estate-seo/) · [Dream Code Labs — indexable listing pages](https://www.dreamcodelabs.com/blog/seo-for-real-estate-guide)
- Local market: [Amaravathi Property Experts — price index](https://www.amaravathipropertyexperts.com/) · [Topline Realty CRDA](https://crda.toplinerealty.in/)
