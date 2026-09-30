# Plan: React UI rewrite

Rewrite every user-facing surface with React, Tailwind v4, shadcn-style components and
`formatjs` / `react-intl` message files. Remove Bootstrap.

## Scope

UI surfaces:

1. Popup (`src/entrypoints/popup`).
2. Options page (`src/entrypoints/options`).
3. In-page summary overlay (`src/features/summarize/overlay.tsx`), rendered inside a
   Shadow DOM so page styles stay isolated.

Non-UI logic (translation pipeline, LLM clients, DOM collection, caches, settings,
providers, content-script messaging) is preserved as-is.

## Stack

- React 19 + `@wxt-dev/module-react`.
- Tailwind v4 via `@tailwindcss/vite` (shared `src/assets/globals.css`).
- shadcn-style primitives vendored under `src/components/ui` (`clsx`,
  `tailwind-merge`, `class-variance-authority`, `lucide-react`, Radix).
- `react-intl` with flat message catalogs `src/i18n/messages/{en,zh-CN}.json`.
- Testing: `@testing-library/react` in addition to the existing Vitest setup.

Removed: `bootstrap`, `@types/bootstrap`, `src/shared/ui-strings.{ts,json}`.

## i18n

- Flat dotted message ids; `en.json` is the source of truth, `zh-CN.json` mirrors it.
- `src/i18n/index.ts` is react-intl-free (so content/background bundles stay small):
  - `SUPPORTED_LOCALES`, `resolveLocale()` (from `navigator.language`),
  - `getMessages(locale)`, `formatMessage(locale, id, values)` (simple interpolation),
  - complex ICU (plurals) is formatted by react-intl inside React trees only.
- React trees are wrapped in `src/components/IntlRoot.tsx` (`IntlProvider`), which
  resolves the interface locale via `src/i18n/use-ui-locale.ts` and reacts to
  settings changes.
- The interface locale is a setting (`uiLocale`: `auto` | `en` | `zh-CN`, default
  `auto`), editable on the options page and applied to popup, options and the
  summary overlay.
- Dynamic labels (translation mode, summary position, provider category,
  translate-on-open match) become `..._LABEL_IDS` maps pointing at message ids.

## Lazy overlay bundle

WXT builds content scripts as a single IIFE, so a dynamic `import()` inside the
content script is inlined by Vite (`inlineDynamicImports` for `iife`). To keep
React/Tailwind out of the per-page content script:

- `modules/esm-overlay.ts` (local WXT module) prebuilds
  `src/features/summarize/overlay-entry.ts` as an ESM bundle to
  `content-scripts/esm/overlay.js`, exposed via `web_accessible_resources`.
- `src/features/summarize/page-summarize.ts` loads it with
  `import(browser.runtime.getURL('/content-scripts/esm/overlay.js'))` only when a
  summary is ready.
- `prepare:publicPaths` registers the overlay path for typed `getURL`.
- The module rebuilds the bundle on source changes during `wxt dev`.


## Implementation order

1. deps + `wxt.config.ts` (react module, tailwind vite plugin) + `globals.css` + `cn`.
2. i18n module + message catalogs + tests.
3. shadcn `src/components/ui` primitives.
4. Popup: `main.tsx`, `PopupApp`, controller hook; drop Bootstrap DOM code.
5. Options: `main.tsx`, `OptionsApp`, settings/translate-on-open/cache sections,
   React language combobox; delete `translate-on-open-ui.ts`.
6. Overlay: React `SummaryOverlay` in a shadow root; keep pure helpers + tests.
7. Update/remove Bootstrap-era tests; run only the changed test files.
