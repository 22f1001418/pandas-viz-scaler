# pandas Visualizer

An interactive, step-by-step visualization tool for learning pandas — built for **Scaler Academy** students.

Think of it as a **visual debugger meets Colab notebook**: you see the code, the DataFrame state at each step, highlighted diffs showing exactly what changed, and a plain-English explanation in the Inspector panel. Play through operations frame-by-frame or scrub to any step.

---

## What it covers

**44 topics** organized into 9 sections, mapping to the full Scaler pandas curriculum:

| Section | Topics |
|---|---|
| **Foundations** | Series vs DataFrame, Selection & Indexing, Comprehensions, Lambda/map/filter, Filtering Patterns, Sorting & Top-N, Basic Aggregation, Working with Dates, Missing Data Basics, Chaining vs Intermediates |
| **Vectorization** | pd.cut & pd.qcut, Vectorization Patterns, Loop vs Vectorized |
| **GroupBy** | GroupBy Mental Model, Aggregation Patterns, Transform vs Apply vs Filter, Multi-level GroupBy, Window Ops in Groups |
| **Time Series** | Resampling, Rolling Windows, Shift & Lag (WoW/MoM) |
| **Reshaping** | pivot_table, pd.crosstab, Melt (wide → long) |
| **Patterns** | Cohort Analysis, Funnel Analysis, Normalizing Denormalized Data, Fact + Dimension Tables |
| **Joins** | Join Types Deep Dive, merge vs join vs concat, Merge Mechanics, concat Patterns |
| **I/O & Performance** | JSON → DataFrame, Reading Large Files (chunking), Parquet vs CSV, eval() & query(), Indexing for Speed |
| **Data Quality** | Classifying Missingness (MCAR/MAR/MNAR), Visualizing Missingness, Imputation Strategies, Duplicates, The .str Accessor, Regex for Extraction, Outlier Detection |

Every topic includes **What / Why / How** context boxes summarizing the concept before the visualization begins.

---

## Visual approach

Each topic is built around a **StepRunner** — a notebook-style layout with:

- **Code cell** (top): syntax-highlighted Python with the active line tracked per step
- **Output cell** (middle): animated DataFrames with cell-level highlights — green for new values, pink for changed, red strikethrough for dropped, orange for NaN, color-coded groups for groupby/merge
- **Inspector panel** (right): plain-English explanation + variable snapshots at each step
- **Scrubber + controls** (bottom): play / pause / step-through / seek to any step

Additional visual elements used across topics:

- **Before → After** side-by-side frames with diff highlights
- **Color-coded row/column grouping** with semantic meaning (group-a through group-e)
- **Boolean mask overlays** (green = keep, faded red = drop) for filtering topics
- **SVG mini-diagrams** for joins (Venn), groupby (split tree), funnel shapes (planned for later batches)

---

## Datasets

Examples use **mixed real-world scenarios** chosen per topic for maximum clarity:

- **Coffee shop sales** — drink menu with price, quantity, ratings (Foundations)
- **E-commerce orders** — products, prices, quantities, revenue (Vectorization)
- **Student scores** — names, grades, missing values (Missing Data)
- **Time-series orders** — dates, amounts, monthly aggregation (Dates, Time Series)
- **Age demographics** — bucketing with cut/qcut (Vectorization)

No single dataset is forced across all topics — each topic picks whatever makes the concept click fastest.

---

## Tech stack

| Layer | Tool | Role |
|---|---|---|
| UI framework | React 18 | Component model, hooks, concurrent rendering |
| Language | TypeScript 5.6 | Type safety at build time |
| Build tool | Vite 6 | HMR in dev, Rollup bundler for production |
| Styling | Tailwind CSS 3.4 | Utility classes + CSS custom properties for theming |
| Animation | Framer Motion 11 | Spring physics for cell entrance, layout animations for row reorder |
| State | Zustand 5 | 1KB global store — page, theme, sidebar |
| Syntax highlight | prism-react-renderer 2.4 | Python code cells with night-owl theme |
| Icons | Lucide React 0.468 | Inline SVG icons throughout |

---

## Project structure

```
pandas-visualizer/
├── public/
│   ├── favicon.svg
│   └── _redirects              # SPA routing for Render.com
├── src/
│   ├── components/
│   │   ├── AnimationControls.tsx   # Play/pause/scrubber bar
│   │   ├── CodeCell.tsx            # Syntax-highlighted notebook cell
│   │   ├── DataFrameView.tsx       # Animated table with highlight maps
│   │   ├── Inspector.tsx           # Right-rail debugger panel
│   │   ├── PageShell.tsx           # What/Why/How header + layout
│   │   ├── Sidebar.tsx             # Dark left nav with sections
│   │   ├── StepRunner.tsx          # Glue: code + frames + controls + inspector
│   │   └── TopBar.tsx              # Breadcrumb + theme toggle
│   ├── pages/
│   │   ├── registry.ts            # All 44 topics: metadata, sections, W/W/H context
│   │   ├── Foundations1.tsx        # Topics 1–5 (Series, Selection, Comprehensions, Lambda, Filtering)
│   │   ├── Foundations2.tsx        # Topics 6–10 (Sorting, Agg, Dates, Missing, Chaining)
│   │   ├── Vectorization.tsx       # Topics 11–13 (cut/qcut, Vectorization, Loop vs Vec)
│   │   └── StubPage.tsx           # Placeholder for topics not yet visualized
│   ├── data/                      # (datasets defined inline per page file)
│   ├── hooks/
│   │   └── useStepAnimation.ts    # Step progression via setInterval
│   ├── lib/
│   │   └── dataframe.ts           # df(), cloneFrame, takeRows, hlRows, hlCols, formatCell
│   ├── store/
│   │   └── useStore.ts            # Zustand: page, theme, sidebar
│   ├── types/
│   │   └── index.ts               # DataFrame, Step, HighlightMap, PageMeta, etc.
│   ├── App.tsx                    # Routes by page ID (implemented → component, else → StubPage)
│   ├── main.tsx                   # React root
│   └── index.css                  # Scaler theme (indigo-teal palette, dark sidebar)
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
└── .gitignore
```

---

## Local development

```bash
npm install
npm run dev
```

Opens at http://localhost:5173. Vite HMR gives sub-100ms feedback on changes.

## Production build

```bash
npm run build
npm run preview    # test the production bundle locally
```

Output goes to `dist/` — a single HTML file, one JS bundle (~270KB gzipped), one CSS file (~5KB gzipped).

## Deploy to Render.com

Create a **Static Site** on Render pointing to your repo:

| Setting | Value |
|---|---|
| Build command | `npm install && npm run build` |
| Publish directory | `dist` |

The `public/_redirects` file is already configured for SPA routing (all paths serve `index.html`).

---

## Theme system

The app supports **light and dark modes** via CSS custom properties on `<html class="dark|light">`. Toggle from the top bar (sun/moon icon). The sidebar is always dark regardless of theme.

All colors reference CSS variables (`--accent`, `--fg`, `--s1`, etc.) defined in `src/index.css`. To rebrand, change the variables — no component code needs touching.

**Palette**: Indigo primary (`#6366f1`), teal for "How" context, pink for "Why" context and changed-cell highlights, amber for warnings/NaN.

**Fonts**: DM Sans (UI text), JetBrains Mono (code cells, DataFrame values, variable names).

---

## Implementation status

**Fully visualized (13 topics):**
Series vs DataFrame, Selection & Indexing, Comprehensions, Lambda/map/filter, Filtering Patterns, Sorting & Top-N, Basic Aggregation, Working with Dates, Missing Data Basics, Chaining vs Intermediates, pd.cut & pd.qcut, Vectorization Patterns, Loop vs Vectorized.

**Stub pages with full W/W/H context (31 topics):**
All remaining topics are navigable via the sidebar. Each shows the What/Why/How educational context and a "visualization in progress" placeholder. The content for these stubs is complete — only the step-by-step animations need to be built.

---

## Adding a new topic

1. Add a `PageId` to `src/store/useStore.ts`
2. Add a `PageMeta` entry in `src/pages/registry.ts` with icon, section, and W/W/H context
3. Add the page ID to the appropriate section in `SECTIONS` array
4. Create the page component (or add to an existing section file)
5. Register it in `IMPLEMENTED` map in `src/App.tsx`

Each page follows the same pattern: define a `Step[]` array with frames, highlights, and explanations → pass to `<StepRunner />` → wrap in `<PageShell />`.

---

## Architecture notes

- **No real Python execution**: pandas operations are visualized by hand-written step arrays, not by running Python. This keeps the bundle tiny (~270KB gzipped) and gives tight control over animations. If real execution is ever needed, Pyodide can be dynamically imported per page.
- **DataFrame model** (`src/types/index.ts`): a minimal JS object — `{ columns, index, data }` — just enough to render and animate. Not a full pandas reimplementation.
- **Highlight system**: a `HighlightMap` of `"row:col" → kind` strings drives cell-level coloring. Wildcards (`"2:*"` for whole row, `"*:1"` for whole column) and helpers (`hlRows`, `hlCols`, `hlMerge`) make it concise to build highlight maps.
- **Step animation**: `useStepAnimation` hook uses `setInterval` for auto-play with play/pause/seek. Framer Motion handles the visual interpolation (spring physics for row entrance, layout animations for reordering).

---

*Built for Scaler Academy students · v1.0*
