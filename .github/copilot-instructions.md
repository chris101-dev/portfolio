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
  - navigation-bar.tsx
  - hero-section.tsx
- src/modules/data-visualization
  - visualization-placeholder.tsx
- src/lib
  - navigation-links.ts

## Module Responsibilities
- src/components/landing-page/navigation-bar.tsx
  - Top navigation with section anchors and contact CTA.
- src/components/landing-page/hero-section.tsx
  - Headline, value proposition, skill tags, KPIs, and hero CTAs.
- src/modules/data-visualization/visualization-placeholder.tsx
  - Placeholder container for future interactive charts.
  - Keep this module swappable so D3/Recharts/Vega-Lite can be integrated later.
- src/components/landing-page/landing-page.tsx
  - Composes all landing sections and motion timing.

## UI/UX Requirements
- Dark-first visual language with strong contrast.
- Clean and intentional typography (no default generic styling).
- Use readable 8-bit-inspired typography with distinct roles for display, UI, and data text.
- Subtle motion only: fade/slide reveals, no distracting animations.
- Responsive behavior for mobile, tablet, and desktop.
- Keep the hero data visualization area prominent and reusable.

## Code Quality Rules
- Keep components focused and small.
- Prefer composition over large monolithic files.
- Avoid inline magic values when shared constants make sense.
- Keep comments concise and only where logic is non-obvious.
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

When updating this file:
1. Update the structure section first.
2. Update module responsibilities second.
3. Update requirements and rules last.
4. Keep entries short, concrete, and implementation-focused.
