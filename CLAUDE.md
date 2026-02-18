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

**Routing:** File-based routing in `src/pages/` - files automatically become routes

**Key Directories:**
- `src/actions/` - Server actions (can be split into multiple files, re-exported from index.ts)
- `src/lib/` - Utilities (cookies, auth, api helpers)
- `src/layouts/` - HTML document wrappers
- `src/pages/app/` - Protected routes (require auth via middleware)
- `src/middleware.ts` - Route protection for `/app/*`

**Auth Flow:**
- JWT stored in httpOnly cookie
- Middleware checks cookie existence for protected routes
- Actions validate token with backend on API calls
- 401 responses trigger session cleanup and redirect to login

**Configuration:**
- `astro.config.mjs` - SSR mode with `@astrojs/node` adapter
- `src/env.d.ts` - Types for `Astro.locals` (user, token)

## Documentation

Detailed documentation is available in `docs/`:
- `01-fundamentos.md` - Cookies, auth basics, security
- `02-tipos-de-actions.md` - Form POST, Redirect, JavaScript methods
- `03-middleware-jwt.md` - Middleware, JWT, external backend
- `04-organizacion-actions.md` - Splitting actions into multiple files
