# Copilot Instructions - Data Engineer Portfolio

## Project Goal
Build a modern, dark, performance-focused Data Engineer portfolio with Next.js 14.
The landing page should communicate engineering quality, data platform expertise, and trust.

## Tech Stack
- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS
- Framer Motion
- TradingView Lightweight Charts

## Naming Convention
- Use kebab-case for files and folders.
- Use PascalCase for React component names.
- Keep import paths short with the `@/*` alias.

## Current Project Structure

- src/app
  - globals.css
  - layout.tsx
  - page.tsx
- src/components/landing-page
  - landing-page.tsx
  - dev-fps-overlay.tsx
  - navigation-bar.tsx
  - hero-section.tsx
  - rainbow-shadow-runtime.tsx
  - smooth-scroll-runtime.tsx
  - terminal-typed-block.tsx
- src/modules/data-visualization
  - data-quality-visualization-project.tsx
  - dummy-visualization-project.tsx
  - live-candlestick-chart.tsx
  - quality-rules.ts
  - use-binance-kline-feed.ts
  - visualization-mock.ts
  - visualization-placeholder.tsx
- src/lib
  - navigation-links.ts
  - pastel-rainbow-colors.ts

## Module Responsibilities
- src/components/landing-page/navigation-bar.tsx
  - Top navigation with section anchors and contact CTA.
- src/components/landing-page/smooth-scroll-runtime.tsx
  - Provides global smooth scrolling behavior and adaptive low-FPS fallback toggles.
- src/components/landing-page/dev-fps-overlay.tsx
  - Development-only FPS overlay for runtime rendering diagnostics.
- src/components/landing-page/hero-section.tsx
  - Headline, value proposition, skill tags, KPIs, and hero CTAs.
- src/components/landing-page/terminal-typed-block.tsx
  - Terminal-style typed intro block with fixed-duration typing and cursor behavior.
- src/components/landing-page/rainbow-shadow-runtime.tsx
  - Assigns per-block random pastel colors on mount for terminal shadow blocks.
  - Applies block-local border, shadow, and text coloring without cross-block coupling.
- src/modules/data-visualization/visualization-placeholder.tsx
  - Visualization shell and layout block shown in the hero.
  - Hosts project button selector, URL-based project selection, and supporting stage cards.
- src/modules/data-visualization/use-binance-kline-feed.ts
  - Shared Binance feed hook used by multiple visualization projects.
  - Loads 400 initial candles from REST and streams multiplex WebSocket updates (`kline_15m` + `aggTrade`).
  - Maintains dual rolling buffers (200 visible + 200 hidden feature context).
  - Computes kline ingestion latency and aggTrade inter-arrival heartbeat telemetry.
- src/modules/data-visualization/live-candlestick-chart.tsx
  - Renders TradingView Lightweight Charts candlesticks.
  - Visualizes live project data from the shared Binance feed.
  - Derives EMA50, EMA100, and EMA200 overlays from combined 400-candle context.
  - Loads CSV-derived support/resistance levels and renders center lines plus clipped semi-transparent zones.
- src/modules/data-visualization/data-quality-visualization-project.tsx
  - Computes and visualizes freshness, gap, duplicate, and OHLC validity checks.
  - Derives heartbeat/freshness interval telemetry from aggTrade update cadence.
  - Applies configurable quality thresholds from a shared rules module.
  - Uses the shared 200-candle primary buffer from the Binance feed.
- src/modules/data-visualization/quality-rules.ts
  - Defines configurable quality thresholds, score penalties, and timeline settings.
  - Exposes default presets used by quality-focused visualization projects.
- src/modules/data-visualization/dummy-visualization-project.tsx
  - Renders placeholder visuals for project slots that are not implemented yet.
- src/modules/data-visualization/visualization-mock.ts
  - Central project registry with labels, status, summaries, and stage metadata.
  - Includes one live project, one quality project, and placeholder entries for upcoming projects.
  - Holds per-project quality rule preset mappings.
  - Keep `source`, `processing`, and `output` stage text aligned with implemented project behavior.
  - Keep sample data separated from rendering logic for easy replacement.
- src/lib/pastel-rainbow-colors.ts
  - Stores reusable pastel rainbow color constants for runtime block styling.
- src/components/landing-page/landing-page.tsx
  - Composes all landing sections and motion timing.

## UI/UX Requirements
- Dark-first visual language with strong contrast.
- Clean and intentional typography (no default generic styling).
- Favor a terminal-inspired aesthetic: black background, white typography, and restrained accent colors.
- Use clear monospace typography across hero and UI for terminal consistency.
- Prefer square panels with hard diagonal drop-shadows for an analog monitor feel.
- Subtle motion only: fade/slide reveals, no distracting animations.
- Responsive behavior for mobile, tablet, and desktop.
- Keep the hero data visualization area prominent and reusable.

## Code Quality Rules
- Keep components focused and small.
- Prefer composition over large monolithic files.
- Avoid inline magic values when shared constants make sense.
- Keep comments concise and only where logic is non-obvious.
- Keep explanatory stage panels (`source`, `processing`, `output`) synchronized with actual project behavior whenever pipelines change.
- Run lint before finishing meaningful changes.

## Performance and Accessibility
- Prefer server components by default.
- Use client components only when required (Framer Motion, browser APIs).
- Use semantic HTML sections and labels.
- Ensure interactive elements remain keyboard accessible.

## Development Commands
- Install dependencies: npm install
- Start dev server: npm run dev
- Lint: npm run lint
- Build: npm run build

## Maintenance Protocol (Keep This File Updated)
Update this file whenever one of the following changes:
- Folder/module structure changes.
- New reusable UI modules are added.
- Design, accessibility, or motion rules are adjusted.
- New dependencies or runtime requirements are introduced.
- Naming conventions or coding standards change.
- Visualization data source, processing, telemetry, or output behavior changes.

When updating this file:
1. Update the structure section first.
2. Update module responsibilities second.
3. Update requirements and rules last.
4. Keep entries short, concrete, and implementation-focused.
