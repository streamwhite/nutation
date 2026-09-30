// Entry for the lazily loaded overlay bundle. WXT content scripts are bundled
// as a single IIFE, so the React/Tailwind overlay is prebuilt as ESM by the
// `esm-overlay` WXT module and imported on demand from `page-summarize`.
export { showSummaryOverlay } from '@/features/summarize/overlay';
export type { SummaryOverlayOptions } from '@/features/summarize/overlay';
