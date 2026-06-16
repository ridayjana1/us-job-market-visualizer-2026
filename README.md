# US Job Market Visualizer 2026

An interactive, open-source workspace for exploring the US labor market -
employment, wages, growth, education, skills, and **AI exposure** - across
occupations and states. Inspired by Andrej Karpathy's _Jobs_ project and
updated with the latest available BLS and O*NET data.

> **AI exposure is about task overlap with current AI - not job loss.** Every
> occupation's exposure is decomposed into *augmentation* and *automation*
> potential, following the [Anthropic Economic Index](https://www.anthropic.com/economic-index)
> framing.

![Built with Next.js 15 · TypeScript · Tailwind · D3 · Recharts](https://img.shields.io/badge/Next.js-15-black) ![License: MIT](https://img.shields.io/badge/license-MIT-blue)

---

## Features

| Page | What it does |
| --- | --- |
| **Occupation Explorer** (`/explorer`) | Search by title / SOC / industry; filter by salary, employment, AI exposure, growth, and education; sortable table. |
| **Scatter** (`/scatter`) | D3 bubble chart - x: AI exposure, y: median salary, size: employment, colour: growth. |
| **AI Exposure Map** (`/ai-exposure`) | Occupations grouped into high / moderate / low exposure with augmentation vs. automation splits. |
| **State Explorer** (`/states`) | Interactive D3 choropleth; click a state for its wages, growth, exposure, and top occupations. |
| **Trend Dashboard** (`/trends`) | Leaderboards: fastest-growing, highest-paying, most/least AI-exposed, largest, most openings. |
| **Occupation Detail** (`/occupation/[soc]`) | Employment, wage distribution, education, skills, knowledge, projections, exposure breakdown, and a neutral AI summary. |
| **Data Sources** (`/data-sources`) | Sources, methodology, and update dates. |

## Tech stack

- **Framework:** Next.js 15 (App Router, Server Components, route handlers)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + shadcn/ui-style primitives (Radix)
- **Visualization:** D3.js (scatter, choropleth) + Recharts (bars, distributions)
- **Data processing:** Python · Pandas · NumPy · PyArrow
- **Deployment:** Vercel

## Architecture

```
.
├── scripts/                 # Python ETL pipeline
│   ├── config.py            # paths, SOC vocab, exposure constants, dotenv
│   ├── normalize_soc.py     # canonical SOC normalisation (+ self-test)
│   ├── occupation_seed.py   # curated seed + exposure model + derivations
│   ├── bls_parse.py         # OEWS + Employment-Projections xlsx parsers
│   ├── onet_parse.py        # O*NET skills/knowledge/work-activity parsers
│   ├── parse_sources.py     # facade joining bls_parse + onet_parse
│   ├── fetch_bls.py         # download OEWS + Employment Projections (public)
│   ├── fetch_onet.py        # download O*NET database (public, version auto-detect)
│   ├── fetch_ai_exposure.py # exposure from real O*NET work activities
│   ├── generate_sample_data.py  # stdlib-only JSON export (no deps)
│   └── build_dataset.py     # join → data/final_dataset.parquet + JSON
├── data/                    # generated dataset (committed)
│   ├── occupations.json · states.json · meta.json · final_dataset.parquet
├── public/data/             # dataset mirrored for the app build
└── src/
    ├── app/                 # routes + API handlers (Server Components)
    │   └── api/             # /occupations · /occupations/[soc] · /stats · /states · /trends
    ├── components/          # ui/ · charts/ · explorer/ · states/ · layout/
    └── lib/                 # data access, types, formatting, utils
```

The data layer (`src/lib/data.ts`) imports the JSON dataset so it is bundled
into the server build and served from Vercel Functions without filesystem
assumptions. Reads are memoised with React `cache()`, and API responses are
sent with `s-maxage` caching headers (see `next.config.ts`).

## Quick start

```bash
# 1. Generate the dataset (zero dependencies - standard-library Python)
python3 scripts/generate_sample_data.py

# 2. Install and run the app
npm install
npm run dev          # http://localhost:3000
```

The repository ships with a generated **curated sample dataset** so the app
runs immediately. See _Going live with official data_ below to replace it.

### Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js dev / production build / serve |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run data:sample` | Regenerate the sample JSON (stdlib only) |
| `npm run data:build` | Full pipeline → parquet + JSON (needs pandas) |
| `python scripts/normalize_soc.py --selftest` | SOC normalisation tests |

## Going live with official data

The curated seed is realistic but representative (57 occupations). The live
pipeline builds the full **~800-occupation** dataset directly from official
BLS and O*NET releases.

```bash
# 1. Install the Python ETL dependencies
pip install -r scripts/requirements.txt

# 2. (Optional) create .env.local for API keys - NOT required for the bulk
#    downloads below, only for higher BLS API limits / O*NET Web Services.
cp .env.example .env.local

# 3. Fetch the public release files into data/raw/
python scripts/fetch_bls.py          # OEWS national + Employment Projections
python scripts/fetch_onet.py         # O*NET database (auto-detects newest version)
python scripts/fetch_ai_exposure.py  # exposure from real O*NET work activities

# 4. Parse, join, validate → data/final_dataset.parquet + app JSON
python scripts/build_dataset.py

# 5. Run the app against the live data
npm install && npm run dev           # http://localhost:3000
```

**No API keys are required** - the BLS OEWS / Employment-Projections files and
the O*NET database are public bulk downloads. Keys in `.env.local` (loaded via
`python-dotenv`) only raise the BLS API rate limit and unlock the O*NET Web
Services API.

`build_dataset.py` is **live by default**: when the OEWS + EP files exist in
`data/raw`, it parses them (`bls_parse.py`), enriches each occupation with
O*NET skills, knowledge, and the four work-activity **task axes** that drive AI
exposure (`onet_parse.py`), joins everything on the canonical SOC code, and
writes the dataset with `dataset_kind: "live"`. It then **validates** the
result - asserting ≥ 700 occupations, the presence of bellwether occupations
(Software Developers, Data Scientists, Registered Nurses, Electricians, the
Computer Occupations group), and non-null employment/wages - and prints
join-coverage percentages. Pass `--sample` to force the curated dataset, or
omit the live files to fall back to it automatically. AI exposure for an
occupation is computed from its **real O*NET work-activity ratings**; only
occupations O*NET has not yet rated fall back to a SOC major-group prior
(recorded per record in `exposure_source`).

The output `data/meta.json` records provenance: `dataset_kind`, the OEWS
release year, the O*NET version, `generated_at`, and join coverage.

> BLS and O*NET rotate release URLs/headers yearly. `fetch_onet.py` auto-detects
> the newest O*NET version, and `fetch_bls.py` steps back through recent OEWS
> years; the parsers fuzzy-match columns. If BLS returns **HTTP 403**, your IP is
> being blocked by its CDN (common on cloud/datacenter IPs) - run the fetch from
> a residential network or CI runner.

## Deployment (Vercel)

```bash
npm i -g vercel
vercel            # preview
vercel --prod     # production
```

The dataset is committed and bundled, so no database or environment variables
are required for a default deploy. Set `NEXT_PUBLIC_SITE_URL` for canonical/OG
metadata. The included GitHub Action (`.github/workflows/data-update.yml`)
regenerates the dataset on a schedule and opens a PR.

## Data Sources and Attribution

This project incorporates public labor-market data, normalised on the SOC 2018
classification.

- **Bureau of Labor Statistics (BLS)** - [OEWS](https://www.bls.gov/oes/)
  (employment, wages, percentiles) and [Employment Projections](https://www.bls.gov/emp/)
  (growth, openings, typical education).
- **O*NET Web Services** - skills, knowledge, and work activities.
- **AI Exposure** - derived from O*NET task composition using the
  [Anthropic Economic Index](https://www.anthropic.com/economic-index)
  augmentation-vs-automation framing.
- **SOC 2018** - [Standard Occupational Classification](https://www.bls.gov/soc/).

### O*NET attribution

<p align="center">
  <a href="https://services.onetcenter.org/" title="This site incorporates information from O*NET Web Services. Click to learn more.">
    <img src="https://www.onetcenter.org/image/link/onet-in-it.svg" width="130" height="60" style="border: none" alt="O*NET in-it">
  </a>
</p>

This site incorporates information from
[O*NET Web Services](https://services.onetcenter.org/) by the U.S. Department of
Labor, Employment and Training Administration (USDOL/ETA). O*NET® is a trademark
of USDOL/ETA.

> **Disclaimer:** This project is an independent visualization and analysis tool
> and is not affiliated with or endorsed by the U.S. Department of Labor.

The O*NET attribution, trademark notice, and badge are rendered in the global
footer on **every** page (via the root layout, so they survive client-side
navigation), on the About page, and on the Data Sources page - consistent with
O*NET Web Services usage requirements.

## A note on AI exposure

Exposure measures how much of a role's day-to-day tasks overlap with what
current AI systems can do. It is **not** a forecast of employment change. High
exposure frequently coincides with high wages and strong growth (e.g. software
and data roles), where augmentation tends to lead. The methodology is documented
on the in-app `/data-sources` page and in `scripts/occupation_seed.py`.

## Contributing

Issues and PRs welcome - new data sources, occupation coverage, accessibility,
and visualization improvements especially. Run `npm run typecheck` and
`python scripts/normalize_soc.py --selftest` before submitting.

## License

[MIT](./LICENSE). Data remains subject to the terms of its respective sources
(BLS is public domain; O*NET is provided under the O*NET data license / CC BY).
