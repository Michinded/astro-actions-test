---
name: astro-cookies
description: |
  Create and manage secure cookies in Astro applications. Use this skill when implementing session cookies, authentication tokens, temporary data storage, or any cookie-based functionality. Covers httpOnly, sameSite, secure flags, cookie helpers, and best practices for both HTTP and HTTPS environments. Trigger this skill when the user mentions: cookies, session storage, httpOnly cookies, secure cookies, cookie configuration, AstroCookies, context.cookies, or cookie security.
---

# Secure Cookies in Astro

This skill covers creating and managing cookies securely in Astro applications.

## Cookie Security Fundamentals

### Security Flags Explained

| Flag | Purpose | When to Use |
|------|---------|-------------|
| `httpOnly` | Prevents JavaScript access | Always for sensitive data (tokens, sessions) |
| `sameSite` | Prevents CSRF attacks | Always (`strict` or `lax`) |
| `secure` | Only sent over HTTPS | In production with HTTPS |
| `path` | Limits cookie scope | Usually `/` for app-wide |
| `maxAge` | Expiration in seconds | Always set (don't leave indefinite) |

---

## Base Configuration

Create a centralized cookie configuration file:

```typescript
// src/lib/cookies.ts
import type { AstroCookies } from 'astro';

/**
 * Opciones base para cookies seguras
 *
 * IMPORTANTE: Para desarrollo local con HTTP, secure está en false.
 * En producción con HTTPS, cambiar a: secure: true
 *
 * Ubicación para cambiar: línea con "secure: false"
 */
export const secureCookieOptions = {
  path: '/',
  httpOnly: true,
  sameSite: 'strict' as const,
  // ⚠️ CAMBIAR A true CUANDO SE USE HTTPS EN PRODUCCIÓN
  secure: false,
};

/**
 * Versión alternativa que detecta automáticamente el entorno:
 * secure: import.meta.env.PROD
 *
 * Esto pone secure=true en producción y secure=false en desarrollo.
 * Usar solo si producción tiene HTTPS configurado.
 */
```

---

## Cookie Types by Use Case

### 1. Session Cookie (httpOnly)

For authentication tokens - NOT accessible from JavaScript:

```typescript
// src/lib/cookies.ts
export const COOKIES = {
  SESSION: {
    name: 'session_token',
    options: {
      path: '/',
      httpOnly: true,          // ✅ No accesible desde JavaScript
      sameSite: 'strict' as const,
      // ⚠️ SEGURIDAD: Cambiar a true con HTTPS
      secure: false,
      maxAge: 60 * 60 * 24,    // 24 horas
    },
  },
} as const;
```

**Usage:**
```typescript
// Guardar sesión
cookies.set(COOKIES.SESSION.name, token, COOKIES.SESSION.options);

// Leer sesión
const token = cookies.get(COOKIES.SESSION.name)?.value;

// Eliminar sesión
cookies.delete(COOKIES.SESSION.name, { path: '/' });
```

### 2. UI Data Cookie (accessible from JS)

For non-sensitive data the frontend needs:

```typescript
export const COOKIES = {
  // ... SESSION ...

  USER_DATA: {
    name: 'user_data',
    options: {
      path: '/',
      httpOnly: false,         // ⚠️ Accesible desde JavaScript
      sameSite: 'strict' as const,
      // ⚠️ SEGURIDAD: Cambiar a true con HTTPS
      secure: false,
      maxAge: 60 * 60 * 24,
    },
  },
} as const;
```

**Usage:**
```typescript
// Server-side: guardar datos para UI
cookies.set(
  COOKIES.USER_DATA.name,
  JSON.stringify({ nombre: user.nombre, theme: 'dark' }),
  COOKIES.USER_DATA.options
);

// Client-side JavaScript: leer datos
const userData = JSON.parse(document.cookie
  .split('; ')
  .find(row => row.startsWith('user_data='))
  ?.split('=')[1] || '{}');
```

### 3. Temporary Cookie (short-lived)

For flash messages or action results:

```typescript
export const COOKIES = {
  // ... SESSION, USER_DATA ...

  ACTION_RESULT: {
    name: 'action_result',
    options: {
      path: '/',
      httpOnly: true,
      sameSite: 'strict' as const,
      // ⚠️ SEGURIDAD: Cambiar a true con HTTPS
      secure: false,
      maxAge: 60,              // Solo 1 minuto
    },
  },
} as const;
```

---

## Complete Cookie Configuration File

```typescript
// src/lib/cookies.ts
import type { AstroCookies } from 'astro';

/**
 * =============================================================
 * CONFIGURACIÓN DE COOKIES SEGURAS
 * =============================================================
 *
 * ⚠️ IMPORTANTE - HTTPS/HTTP:
 * Este archivo está configurado para desarrollo con HTTP.
 *
 * Para producción con HTTPS, buscar todas las líneas con:
 *   secure: false
 * Y cambiarlas a:
 *   secure: true
 *
 * Alternativa automática (si PROD siempre tiene HTTPS):
 *   secure: import.meta.env.PROD
 * =============================================================
 */

/**
 * Opciones base reutilizables
 */
export const secureCookieOptions = {
  path: '/',
  httpOnly: true,
  sameSite: 'strict' as const,
  // ⚠️ SEGURIDAD: Cambiar a true cuando se use HTTPS
  secure: false,
};

/**
 * Configuración de todas las cookies de la aplicación
 */
export const COOKIES = {
  /**
   * Cookie de sesión (token de autenticación)
   * - httpOnly: true → No accesible desde JavaScript
   * - Contiene: token de sesión o JWT
   */
  SESSION: {
    name: 'session_token',
    options: {
      ...secureCookieOptions,
      maxAge: 60 * 60 * 24, // 24 horas
    },
  },

  /**
   * Cookie de datos de usuario (para UI)
   * - httpOnly: false → Accesible desde JavaScript
   * - Contiene: nombre, preferencias, tema (NO datos sensibles)
   */
  USER_DATA: {
    name: 'user_data',
    options: {
      ...secureCookieOptions,
      httpOnly: false, // Override: accesible desde JS
      maxAge: 60 * 60 * 24,
    },
  },

  /**
   * Cookie temporal para resultados de actions
   * - Corta duración (1 minuto)
   * - Usada para POST-Redirect-GET pattern
   */
  ACTION_RESULT: {
    name: 'action_result',
    options: {
      ...secureCookieOptions,
      maxAge: 60, // 1 minuto
    },
  },

  /**
   * Cookie de preferencias (tema, idioma, etc.)
   * - Larga duración
   * - Accesible desde JS para aplicar preferencias
   */
  PREFERENCES: {
    name: 'user_preferences',
    options: {
      ...secureCookieOptions,
      httpOnly: false,
      maxAge: 60 * 60 * 24 * 365, // 1 año
    },
  },
} as const;

// =============================================================
// HELPER FUNCTIONS
// =============================================================

/**
 * Guarda el resultado de una action en cookie temporal
 */
export function setActionResult(cookies: AstroCookies, data: unknown): void {
  cookies.set(
    COOKIES.ACTION_RESULT.name,
    JSON.stringify(data),
    COOKIES.ACTION_RESULT.options
  );
}

/**
 * Lee y elimina el resultado de action (single-use)
 */
export function getActionResult<T>(cookies: AstroCookies): T | null {
  const cookie = cookies.get(COOKIES.ACTION_RESULT.name);
  if (!cookie) return null;

  try {
    const data = JSON.parse(cookie.value) as T;
    // Auto-eliminar después de leer
    cookies.delete(COOKIES.ACTION_RESULT.name, { path: '/' });
    return data;
  } catch {
    cookies.delete(COOKIES.ACTION_RESULT.name, { path: '/' });
    return null;
  }
}

/**
 * Guarda datos de usuario para UI
 */
export function setUserData(
  cookies: AstroCookies,
  data: { nombre?: string; username?: string; theme?: string }
): void {
  cookies.set(
    COOKIES.USER_DATA.name,
    JSON.stringify(data),
    COOKIES.USER_DATA.options
  );
}

/**
 * Lee datos de usuario
 */
export function getUserData(cookies: AstroCookies): Record<string, string> | null {
  const cookie = cookies.get(COOKIES.USER_DATA.name);
  if (!cookie) return null;

  try {
    return JSON.parse(cookie.value);
  } catch {
    return null;
  }
}

/**
 * Limpia todas las cookies de sesión
 */
export function clearAllSessionCookies(cookies: AstroCookies): void {
  cookies.delete(COOKIES.SESSION.name, { path: '/' });
  cookies.delete(COOKIES.USER_DATA.name, { path: '/' });
  cookies.delete(COOKIES.ACTION_RESULT.name, { path: '/' });
}
```

---

## Using Cookies in Actions

```typescript
// src/actions/index.ts
import { defineAction, ActionError } from 'astro:actions';
import { z } from 'astro/zod';
import { COOKIES } from '../lib/cookies';

export const server = {
  login: defineAction({
    accept: 'form',
    input: z.object({
      username: z.string(),
      password: z.string(),
    }),
    handler: async ({ username, password }, context) => {
      // Validar credenciales...
      const user = await validateUser(username, password);

      if (!user) {
        throw new ActionError({
          code: 'UNAUTHORIZED',
          message: 'Credenciales inválidas',
        });
      }

      // Guardar token en cookie httpOnly
      context.cookies.set(
        COOKIES.SESSION.name,
        user.token,
        COOKIES.SESSION.options
      );

      // Guardar datos para UI (accesible desde JS)
      context.cookies.set(
        COOKIES.USER_DATA.name,
        JSON.stringify({ nombre: user.nombre }),
        COOKIES.USER_DATA.options
      );

      return { ok: true };
    },
  }),

  logout: defineAction({
    handler: async (_, context) => {
      // Limpiar todas las cookies
      context.cookies.delete(COOKIES.SESSION.name, { path: '/' });
      context.cookies.delete(COOKIES.USER_DATA.name, { path: '/' });

      return { ok: true };
    },
  }),
};
```

---

## Using Cookies in Pages

```astro
---
// src/pages/dashboard.astro
export const prerender = false;

import { COOKIES, getUserData } from '../lib/cookies';

// Leer cookie de sesión
const sessionToken = Astro.cookies.get(COOKIES.SESSION.name)?.value;

if (!sessionToken) {
  return Astro.redirect('/login');
}

// Leer datos de usuario
const userData = getUserData(Astro.cookies);
---

<h1>Hola, {userData?.nombre || 'Usuario'}</h1>
```

---

## Using Cookies in Middleware

```typescript
// src/middleware.ts
import { defineMiddleware } from 'astro:middleware';
import { COOKIES } from './lib/cookies';

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  if (pathname.startsWith('/app')) {
    const token = context.cookies.get(COOKIES.SESSION.name)?.value;

    if (!token) {
      return context.redirect('/login');
    }

    // Pasar datos a las páginas
    context.locals.token = token;
  }

  return next();
});
```

---

## Reading Cookies in Client-Side JavaScript

For cookies with `httpOnly: false`:

```astro
<script>
  // Helper para leer cookies en el cliente
  function getCookie(name: string): string | null {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return parts.pop()?.split(';').shift() || null;
    }
    return null;
  }

  // Leer datos de usuario
  const userDataRaw = getCookie('user_data');
  if (userDataRaw) {
    const userData = JSON.parse(decodeURIComponent(userDataRaw));
    console.log('Usuario:', userData.nombre);
  }

  // Leer preferencias
  const prefsRaw = getCookie('user_preferences');
  if (prefsRaw) {
    const prefs = JSON.parse(decodeURIComponent(prefsRaw));
    document.body.classList.add(prefs.theme || 'light');
  }
</script>
```

---

## Security Comparison: HTTP vs HTTPS

| Escenario | `secure` | Comportamiento |
|-----------|----------|----------------|
| Desarrollo local (HTTP) | `false` | Cookie se envía en HTTP |
| Producción (HTTPS) | `true` | Cookie SOLO se envía en HTTPS |
| Mixto | `import.meta.env.PROD` | Auto-detecta entorno |

### Configuración para HTTP (desarrollo)

```typescript
const cookieOptions = {
  path: '/',
  httpOnly: true,
  sameSite: 'strict' as const,
  secure: false,  // ← HTTP permitido
  maxAge: 60 * 60 * 24,
};
```

### Configuración para HTTPS (producción)

```typescript
const cookieOptions = {
  path: '/',
  httpOnly: true,
  sameSite: 'strict' as const,
  secure: true,   // ← Solo HTTPS
  maxAge: 60 * 60 * 24,
};
```

### Configuración automática

```typescript
const cookieOptions = {
  path: '/',
  httpOnly: true,
  sameSite: 'strict' as const,
  secure: import.meta.env.PROD,  // ← true en prod, false en dev
  maxAge: 60 * 60 * 24,
};
```

---

## Common Cookie Patterns

### Flash Messages (one-time display)

```typescript
// En la action: guardar mensaje
export function setFlashMessage(
  cookies: AstroCookies,
  type: 'success' | 'error',
  message: string
): void {
  cookies.set('flash_message', JSON.stringify({ type, message }), {
    path: '/',
    httpOnly: true,
    sameSite: 'strict',
    secure: false,  // ⚠️ Cambiar a true con HTTPS
    maxAge: 60,
  });
}

// En la página: leer y eliminar
export function getFlashMessage(cookies: AstroCookies): { type: string; message: string } | null {
  const cookie = cookies.get('flash_message');
  if (!cookie) return null;

  const data = JSON.parse(cookie.value);
  cookies.delete('flash_message', { path: '/' });
  return data;
}
```

### Remember Me (long-lived)

```typescript
const REMEMBER_ME_COOKIE = {
  name: 'remember_token',
  options: {
    path: '/',
    httpOnly: true,
    sameSite: 'strict' as const,
    secure: false,  // ⚠️ Cambiar a true con HTTPS
    maxAge: 60 * 60 * 24 * 30,  // 30 días
  },
};
```

### Theme Preference

```typescript
const THEME_COOKIE = {
  name: 'theme',
  options: {
    path: '/',
    httpOnly: false,  // Necesario para JS
    sameSite: 'lax' as const,
    secure: false,    // ⚠️ Cambiar a true con HTTPS
    maxAge: 60 * 60 * 24 * 365,  // 1 año
  },
};
```

---

## Checklist de Seguridad

Al configurar cookies:

- [ ] Usar `httpOnly: true` para datos sensibles (tokens, sesiones)
- [ ] Usar `sameSite: 'strict'` (o `'lax'` si necesitas navegación cross-site)
- [ ] Configurar `secure` según el entorno (ver tabla arriba)
- [ ] Establecer `maxAge` apropiado (no dejar cookies indefinidas)
- [ ] Usar `path: '/'` para cookies de toda la app
- [ ] NO guardar datos sensibles en cookies con `httpOnly: false`
- [ ] Limpiar cookies al cerrar sesión
- [ ] Usar JSON.stringify/parse para datos complejos

---

## Recordatorio Final

```
╔═══════════════════════════════════════════════════════════════╗
║  ⚠️  CONFIGURACIÓN HTTPS                                      ║
╠═══════════════════════════════════════════════════════════════╣
║  Este código usa secure: false para desarrollo HTTP.          ║
║                                                                ║
║  Para producción con HTTPS, cambiar TODAS las instancias:     ║
║                                                                ║
║    secure: false  →  secure: true                              ║
║                                                                ║
║  O usar detección automática:                                  ║
║                                                                ║
║    secure: import.meta.env.PROD                                ║
║                                                                ║
║  Ubicaciones a revisar:                                        ║
║    - src/lib/cookies.ts (secureCookieOptions)                  ║
║    - Cualquier cookie definida manualmente                     ║
╚═══════════════════════════════════════════════════════════════╝
```
