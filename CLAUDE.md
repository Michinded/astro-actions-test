# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev        # Start dev server at localhost:4321
pnpm build      # Build production site to ./dist/
pnpm preview    # Preview built site locally
pnpm astro      # Run Astro CLI commands (e.g., pnpm astro add, pnpm astro check)
```

## Architecture

This is an Astro 5 project configured for server-side rendering (SSR) with the Node.js standalone adapter.

**Routing:** File-based routing in `src/pages/` - files automatically become routes (e.g., `src/pages/index.astro` → `/`)

**Component Structure:**
- `src/layouts/` - HTML document wrappers (Layout.astro provides base HTML structure)
- `src/components/` - Reusable .astro components
- `src/assets/` - Static assets (SVGs, images)

**Configuration:**
- `astro.config.mjs` - Astro configuration with `output: 'server'` and `@astrojs/node` adapter in standalone mode
- Build output goes to `./dist/`
