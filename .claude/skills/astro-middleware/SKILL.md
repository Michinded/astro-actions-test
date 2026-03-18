---
name: astro-middleware
description: |
  Create and configure Astro middleware for route protection and request processing. Use this skill when implementing authentication guards, protected routes, session validation, JWT verification, role-based access control, or any request/response interception. Covers single and multiple validations, composing middleware functions, and passing data via context.locals. Trigger this skill when the user mentions: middleware, protected routes, route guards, authentication middleware, session validation, JWT middleware, context.locals, onRequest, defineMiddleware, or access control.
---

# Astro Middleware

This skill covers creating middleware in Astro for route protection, authentication, and request processing.

## What is Middleware?

Middleware intercepts requests before they reach your pages or actions. Use it to:
- Protect routes (authentication)
- Validate sessions/tokens
- Add data to `context.locals`
- Redirect unauthorized users
- Log requests
- Set response headers

## File Location

Middleware lives in `src/middleware.ts` (or `.js`). Astro automatically uses this file.

```
src/
├── middleware.ts    ← Intercepts all requests
├── pages/
│   ├── index.astro  ← Public
│   └── app/
│       ├── login.astro     ← Public (within /app)
│       └── dashboard.astro ← Protected
└── env.d.ts         ← Types for context.locals
```

---

## Basic Middleware Structure

```typescript
// src/middleware.ts
import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (context, next) => {
  // context.url      - Request URL
  // context.cookies  - Read/write cookies
  // context.locals   - Pass data to pages
  // context.redirect - Redirect to another URL

  // Do something before the page renders
  console.log('Request:', context.url.pathname);

  // Continue to the page
  const response = await next();

  // Do something after (optional)
  // response.headers.set('X-Custom-Header', 'value');

  return response;
});
```

---

## Route Protection Pattern

Protect specific routes and redirect unauthorized users:

```typescript
// src/middleware.ts
import { defineMiddleware } from 'astro:middleware';

// Routes that require authentication
const protectedPaths = ['/app', '/admin', '/dashboard'];

// Public routes within protected areas
const publicExceptions = ['/app/login', '/app/register'];

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  // Check if this path needs protection
  const isProtected = protectedPaths.some(path => pathname.startsWith(path));
  const isException = publicExceptions.includes(pathname);

  if (!isProtected || isException) {
    return next(); // Allow access
  }

  // Check authentication (example: cookie session)
  const sessionToken = context.cookies.get('session_token')?.value;

  if (!sessionToken) {
    // No session → redirect to login
    return context.redirect('/app/login');
  }

  // Session exists → allow access
  return next();
});
```

---

## Cookie Session Validation

A common pattern using session cookies:

### Cookie Configuration

```typescript
// src/lib/cookies.ts
export const SESSION_COOKIE = {
  name: 'session_token',
  options: {
    path: '/',
    httpOnly: true,           // Not accessible from JavaScript
    sameSite: 'strict' as const,
    secure: import.meta.env.PROD, // HTTPS only in production
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
};
```

### Middleware with Session

```typescript
// src/middleware.ts
import { defineMiddleware } from 'astro:middleware';
import { SESSION_COOKIE } from './lib/cookies';
import { getSessionUser } from './lib/auth'; // Your auth logic

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  // Only protect /app/* routes
  if (!pathname.startsWith('/app')) {
    return next();
  }

  // Allow login page
  if (pathname === '/app/login') {
    return next();
  }

  // Check session cookie
  const token = context.cookies.get(SESSION_COOKIE.name)?.value;

  if (!token) {
    return context.redirect('/app/login');
  }

  // Validate session and get user (your logic)
  const user = await getSessionUser(token);

  if (!user) {
    // Invalid session → clear cookie and redirect
    context.cookies.delete(SESSION_COOKIE.name, { path: '/' });
    return context.redirect('/app/login');
  }

  // Pass user data to pages via locals
  context.locals.user = user;
  context.locals.token = token;

  return next();
});
```

---

## JWT Validation

For JWT-based authentication with an external backend:

```typescript
// src/middleware.ts
import { defineMiddleware } from 'astro:middleware';
import { AUTH_COOKIE, decodeJWT } from './lib/api';

const publicAppRoutes = ['/app/login'];

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  // Only process /app/* routes
  if (!pathname.startsWith('/app')) {
    return next();
  }

  // Public routes within /app
  if (publicAppRoutes.includes(pathname)) {
    // If already logged in, redirect away from login
    const token = context.cookies.get(AUTH_COOKIE.name)?.value;
    if (token && pathname === '/app/login') {
      return context.redirect('/app/dashboard');
    }
    return next();
  }

  // Protected routes: verify cookie exists
  const token = context.cookies.get(AUTH_COOKIE.name)?.value;

  if (!token) {
    return context.redirect('/app/login');
  }

  // Decode JWT to get user data (don't validate here - backend does that)
  const payload = decodeJWT(token);

  if (!payload) {
    // Malformed token → clear and redirect
    context.cookies.delete(AUTH_COOKIE.name, { path: '/' });
    return context.redirect('/app/login');
  }

  // Pass data to pages
  context.locals.token = token;
  context.locals.user = {
    id: payload.sub as string,
    username: payload.username as string,
  };

  return next();
});
```

### Key Principle: Don't Validate JWT in Middleware

The middleware only checks if the token **exists and is decodable**. The actual validation happens when your actions call the backend API with the token. This keeps the middleware fast and lets the backend handle security.

---

## Types for context.locals

Define types so you get autocomplete and type checking:

```typescript
// src/env.d.ts
/// <reference path="../.astro/types.d.ts" />

declare namespace App {
  interface Locals {
    // Session token
    token?: string;

    // User data from session
    user?: {
      id: string;
      username: string;
      email?: string;
      roles?: string[];
    };

    // Add other data as needed
    requestId?: string;
  }
}
```

Now in your pages:

```astro
---
// Astro.locals is typed!
const { user, token } = Astro.locals;

if (!user) {
  return Astro.redirect('/login');
}
---

<h1>Welcome, {user.username}</h1>
```

---

## Multiple Validations

For complex apps, you may need several checks. Here are two approaches:

### Approach 1: Sequential Checks in One Middleware

```typescript
// src/middleware.ts
import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  // ============ VALIDATION 1: Maintenance Mode ============
  const isMaintenanceMode = import.meta.env.MAINTENANCE_MODE === 'true';
  if (isMaintenanceMode && pathname !== '/maintenance') {
    return context.redirect('/maintenance');
  }

  // ============ VALIDATION 2: Authentication ============
  if (pathname.startsWith('/app')) {
    const token = context.cookies.get('session_token')?.value;

    if (!token && pathname !== '/app/login') {
      return context.redirect('/app/login');
    }

    if (token) {
      const user = await validateSession(token);
      if (!user) {
        context.cookies.delete('session_token', { path: '/' });
        return context.redirect('/app/login');
      }
      context.locals.user = user;
    }
  }

  // ============ VALIDATION 3: Admin Routes ============
  if (pathname.startsWith('/admin')) {
    const user = context.locals.user;

    if (!user) {
      return context.redirect('/app/login');
    }

    if (!user.roles?.includes('admin')) {
      return context.redirect('/app/unauthorized');
    }
  }

  // ============ VALIDATION 4: API Rate Limiting ============
  if (pathname.startsWith('/api/')) {
    const ip = context.request.headers.get('x-forwarded-for') || 'unknown';
    const isRateLimited = await checkRateLimit(ip);

    if (isRateLimited) {
      return new Response('Too Many Requests', { status: 429 });
    }
  }

  return next();
});
```

### Approach 2: Composable Middleware with `sequence`

Split validations into separate functions and compose them:

```typescript
// src/middleware.ts
import { defineMiddleware, sequence } from 'astro:middleware';

// Middleware 1: Logging
const logging = defineMiddleware(async (context, next) => {
  const start = Date.now();
  const response = await next();
  const duration = Date.now() - start;

  console.log(`${context.request.method} ${context.url.pathname} - ${duration}ms`);
  return response;
});

// Middleware 2: Authentication
const auth = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  if (!pathname.startsWith('/app') || pathname === '/app/login') {
    return next();
  }

  const token = context.cookies.get('session_token')?.value;

  if (!token) {
    return context.redirect('/app/login');
  }

  const user = await validateSession(token);
  if (!user) {
    context.cookies.delete('session_token', { path: '/' });
    return context.redirect('/app/login');
  }

  context.locals.user = user;
  return next();
});

// Middleware 3: Role-based access
const rbac = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;
  const user = context.locals.user;

  if (pathname.startsWith('/admin') && !user?.roles?.includes('admin')) {
    return context.redirect('/unauthorized');
  }

  return next();
});

// Compose all middleware
export const onRequest = sequence(logging, auth, rbac);
```

---

## Role-Based Access Control (RBAC)

Protect routes based on user roles:

```typescript
// src/middleware.ts
import { defineMiddleware } from 'astro:middleware';

// Define route → required roles mapping
const routeRoles: Record<string, string[]> = {
  '/admin': ['admin'],
  '/admin/users': ['admin', 'super-admin'],
  '/app/billing': ['admin', 'billing'],
  '/app/reports': ['admin', 'analyst'],
};

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  // First, ensure user is authenticated (previous middleware should set this)
  const user = context.locals.user;

  // Check if route requires specific roles
  for (const [route, requiredRoles] of Object.entries(routeRoles)) {
    if (pathname.startsWith(route)) {
      if (!user) {
        return context.redirect('/login');
      }

      const hasRole = requiredRoles.some(role => user.roles?.includes(role));
      if (!hasRole) {
        return context.redirect('/unauthorized');
      }
    }
  }

  return next();
});
```

---

## Accessing Locals in Pages

After middleware sets data on `context.locals`, access it in pages:

```astro
---
// src/pages/app/dashboard.astro
export const prerender = false;

// Middleware already validated - safe to use
const { user, token } = Astro.locals;

// TypeScript knows the types from env.d.ts
---

<h1>Dashboard</h1>
<p>Welcome, {user?.username}</p>
<p>Your ID: {user?.id}</p>
```

---

## Accessing Locals in Actions

Access `context.locals` in actions too:

```typescript
// src/actions/index.ts
export const server = {
  getProfile: defineAction({
    handler: async (_, context) => {
      // Access user set by middleware
      const user = context.locals.user;

      if (!user) {
        throw new ActionError({
          code: 'UNAUTHORIZED',
          message: 'Not authenticated',
        });
      }

      return { user };
    },
  }),
};
```

---

## Common Patterns

### Redirect Logged-in Users Away from Login

```typescript
if (pathname === '/login') {
  const token = context.cookies.get('session_token')?.value;
  if (token) {
    return context.redirect('/dashboard');
  }
}
```

### Clean Up Invalid Sessions

```typescript
const token = context.cookies.get('session_token')?.value;

if (token) {
  const isValid = await validateToken(token);
  if (!isValid) {
    context.cookies.delete('session_token', { path: '/' });
    return context.redirect('/login');
  }
}
```

### Add Request ID for Logging

```typescript
export const onRequest = defineMiddleware(async (context, next) => {
  context.locals.requestId = crypto.randomUUID();

  const response = await next();

  response.headers.set('X-Request-ID', context.locals.requestId);
  return response;
});
```

### Set Security Headers

```typescript
export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next();

  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return response;
});
```

---

## Checklist

When implementing middleware:

- [ ] Create `src/middleware.ts` with `defineMiddleware`
- [ ] Export `onRequest` function
- [ ] Define protected routes and public exceptions
- [ ] Check cookies/tokens for authentication
- [ ] Use `context.redirect()` for unauthorized access
- [ ] Set user data on `context.locals`
- [ ] Define types in `src/env.d.ts` for `App.Locals`
- [ ] Use `sequence()` for multiple middleware functions
- [ ] Clean up invalid sessions (delete cookies)
- [ ] Don't validate JWT signatures in middleware - let backend do it
