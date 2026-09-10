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
│   │   ├── CodeCell.tsx            # Syntax-highlighted notebook cell (theme-aware)
│   │   ├── DataFrameView.tsx       # Animated table with highlight maps
│   │   ├── Inspector.tsx           # Right-rail debugger panel
│   │   ├── PageShell.tsx           # What/Why/How header + layout
│   │   ├── Sidebar.tsx             # Dark left nav: search, sections, progress dots
│   │   ├── SeriesView.tsx          # pandas Series repr (no header, dtype footer)
│   │   ├── NullMatrix.tsx          # missingno-style null density matrix
│   │   ├── BarCompare.tsx          # Scaled magnitude/timing bars
│   │   ├── StepRunner.tsx          # Glue: code + diagram + frames + bars + inspector
│   │   ├── TopBar.tsx              # Breadcrumb, topic nav, shortcuts, theme toggle
│   │   ├── TopicNav.tsx            # Prev/next topic footer
│   │   └── diagrams/
│   │       ├── index.tsx           # DIAGRAMS registry, keyed by Step.diagram
│   │       ├── Venn.tsx            # inner/left/right/outer/cross
│   │       ├── SplitApplyCombine.tsx  # groupby, parameterised by real data
│   │       ├── RollingWindow.tsx   # sliding window + where NaNs come from
│   │       ├── ShiftLag.tsx        # shift(1) and the NaN it creates
│   │       └── Funnel.tsx          # stage-over-stage conversion
│   ├── pages/
│   │   ├── registry.ts            # All 44 topics: metadata, sections, W/W/H context
│   │   ├── index.ts               # IMPLEMENTED map — the stub/built source of truth
│   │   ├── Foundations1.tsx        # Series, Selection, Comprehensions, Lambda, Filtering
│   │   ├── Foundations2.tsx        # Sorting, Agg, Dates, Missing, Chaining
│   │   ├── Vectorization.tsx       # cut/qcut, Vectorization, Loop vs Vec
│   │   ├── GroupBy.tsx             # Mental model, agg patterns, transform/apply/filter, multi-level, windows
│   │   ├── TimeSeries.tsx          # Resampling, Rolling Windows, Shift & Lag
│   │   ├── Reshaping.tsx           # pivot_table, crosstab, melt
│   │   ├── Joins.tsx               # Join types, merge vs join vs concat, mechanics, concat patterns
│   │   ├── IO.tsx                  # JSON, chunking, Parquet, eval/query, indexing
│   │   ├── Quality.tsx             # Missingness, imputation, duplicates, .str, regex, outliers
│   │   ├── Patterns.tsx            # Cohort, Funnel, Normalizing, Fact + Dimension
│   │   └── StubPage.tsx           # Placeholder for topics not yet visualized
│   ├── hooks/
│   │   └── useStepAnimation.ts    # Step progression via setInterval
│   ├── lib/
│   │   ├── dataframe.ts           # df(), series(), withIndex, withColumnGroups, hl* helpers
│   │   ├── routing.ts             # Hash routing, curriculum order, prev/next topic
│   │   └── keys.ts                # Guards so shortcuts stand down while typing
│   ├── store/
│   │   └── useStore.ts            # Zustand: page, theme, sidebar
│   ├── types/
│   │   └── index.ts               # DataFrame, Step, HighlightMap, PageMeta, etc.
│   ├── App.tsx                    # Hash routing + global shortcuts; renders topic or stub
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

## Navigation & keyboard

Every topic has its own URL — `#/pivot-table`, `#/join-types` — so links are shareable, reloads keep your place, and browser back/forward walk your history.

| Key | Action |
|---|---|
| `←` `→` | Previous / next step |
| `Space` | Play or pause |
| `R` | Restart from step 1 |
| `[` `]` | Previous / next topic |
| `/` | Focus topic search |
| `T` | Toggle light/dark |

The sidebar filters as you type (`Enter` jumps to the first match, `Esc` clears). A dot on each entry marks whether that topic has a full visualization or context only, and the footer tracks overall progress. Prev/next cards at the bottom of each page walk the curriculum in order.

---

## Theme system

Light and dark modes are driven entirely by CSS custom properties, with `dark` toggled on `<html>`. Switch from the top bar (sun/moon) or press `T`. The choice persists in `localStorage`; with no stored choice the app follows the OS via `prefers-color-scheme`. An inline script in `index.html` paints the theme before React mounts, so a dark-mode reload never flashes white. The sidebar is dark in both themes.

Every color resolves through a variable (`--accent`, `--fg`, `--s1`, …) defined in `src/index.css`. Dark mode redefines the same names under `:root.dark` — no component code differs between themes, so rebranding means editing two variable blocks and nothing else.

**Palette**: Indigo primary (`#6366f1`), teal for "How" context, pink for "Why" context and changed-cell highlights, amber for warnings/NaN.

**Fonts**: DM Sans (UI text), JetBrains Mono (code cells, DataFrame values, variable names).

---

## Rendering primitives

Topics are plain `Step[]` data. Everything a step can draw is one of these — adding a topic means
writing data, not components.

| Primitive | What it draws | Set via |
|---|---|---|
| **Table** | The default `DataFrameView` | `views: [{ frame }]` |
| **MultiIndex** | Nested row labels, outer level printed only when it changes — exactly as pandas reprs it | `withIndex(frame, [["Coffee","North"], …], ["category","region"])` |
| **Grouped column headers** | A spanning header row above the columns (`aggfunc=['sum','mean']`, crosstab) | `withColumnGroups(frame, [{ label: "sum", span: 3 }])` |
| **Series repr** | No column header, a `Name: …, dtype: …` footer, narrow like the real thing | `views: [{ frame, render: "series" }]` |
| **Comparison bars** | Magnitudes scaled to the largest value, so a 1000x gap looks like one | `bars: { bars: [{ label, value, tone }] }` |
| **Diagrams** | SVG from the shared registry — Venn, split-apply-combine, rolling window, shift, funnel | `diagram: "venn-outer"` |

**Highlights** address cells by string key, so a whole step's emphasis is one object:

```
"2:3"  one cell        "h:1"  a column header      "*:2"  a whole column
"2:*"  a whole row     "i:4"  an index cell        "h:*"  every header
```

Kinds are semantic (`match`, `new`, `changed`, `drop`, `null`, `window`, `mask-true/false`,
`group-a…e`), and the helpers `hlRows`, `hlCols`, `hlHeaders`, `hlIndex`, `hlByGroup` and `hlMerge`
build them concisely. `hlByGroup` assigns a colour per distinct key, which is what makes the
groupby and join pages readable.

A diagram normally comes from the registry by name. When a page has real numbers worth showing,
it passes `renderDiagram` instead — the GroupBy page feeds its actual category means into
`SplitApplyCombine`, so nothing in the drawing contradicts the frame beneath it.

**Derive, don't hardcode.** Pages compute their aggregates in JS from the source arrays rather
than typing results in by hand, so the numbers on screen cannot drift from the dataset above them.

---

## Implementation status

**All 44 topics are visualized.** Every topic has a step-by-step run with code, animated frames,
highlights, and an Inspector explanation - no stub pages remain.

Roughly 300 steps in total, averaging ~7 per topic. Depth is deliberate: each topic aims to show
not just what an operation does, but the failure mode that makes it worth understanding - the
silent row drop in an inner join, the blanked MultiIndex labels that become empty CSV cells, the
`shift` that is quietly wrong on unsorted rows.

| Section | Topics |
|---|---|
| Foundations | 10 |
| Vectorization | 3 |
| GroupBy | 5 |
| Time Series | 3 |
| Reshaping | 3 |
| Patterns | 4 |
| Joins | 4 |
| I/O & Performance | 5 |
| Data Quality | 7 |

---

## Adding a new topic

1. Add a `PageId` to `src/store/useStore.ts`
2. Add a `PageMeta` entry in `src/pages/registry.ts` with icon, section, and W/W/H context
3. Add the page ID to the appropriate section in `SECTIONS` array
4. Create the page component (or add to an existing section file)
5. Register it in the `IMPLEMENTED` map in `src/pages/index.ts` (this also flips its sidebar progress dot)

Each page follows the same pattern: define a `Step[]` array → pass to `<StepRunner />` → wrap in
`<PageShell />`. Each step carries `views` (frames plus highlights), an `explain` string, optional
`variables`, and optionally a `diagram` key or a `bars` comparison. See **Rendering primitives**
above for what a step can draw.

---

## Architecture notes

- **No real Python execution**: pandas operations are visualized by hand-written step arrays, not by running Python. This keeps the bundle tiny (~270KB gzipped) and gives tight control over animations. If real execution is ever needed, Pyodide can be dynamically imported per page.
- **DataFrame model** (`src/types/index.ts`): a minimal JS object — `{ columns, index, data }` — just enough to render and animate. Not a full pandas reimplementation.
- **Highlight system**: a `HighlightMap` of `"row:col" → kind` strings drives cell-level coloring. Wildcards (`"2:*"` for whole row, `"*:1"` for whole column) and helpers (`hlRows`, `hlCols`, `hlMerge`) make it concise to build highlight maps.
- **Step animation**: `useStepAnimation` hook uses `setInterval` for auto-play with play/pause/seek. Framer Motion handles the visual interpolation (spring physics for row entrance, layout animations for reordering).

---

*Built for Scaler Academy students · v1.0*
