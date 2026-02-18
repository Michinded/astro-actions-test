# Fundamentos: Astro Actions, Cookies y Autenticación

Esta documentación cubre los conceptos base del proyecto: configuración, manejo de cookies seguras y sistema de autenticación.

## Tabla de Contenidos

- [Configuración del Proyecto](#configuración-del-proyecto)
- [Estructura de Archivos](#estructura-de-archivos)
- [Cookies Seguras](#cookies-seguras)
- [Sistema de Autenticación](#sistema-de-autenticación)
- [Protección de Rutas](#protección-de-rutas)
- [Consideraciones de Seguridad](#consideraciones-de-seguridad)

---

## Configuración del Proyecto

### astro.config.mjs

```javascript
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

export default defineConfig({
  output: 'server',  // SSR requerido para Actions
  adapter: node({
    mode: 'standalone'
  }),
  server: {
    host: true
  },
  security: {
    checkOrigin: true  // Protección CSRF
  }
});
```

**Puntos clave:**
- `output: 'server'` - Necesario para que las Actions funcionen
- `checkOrigin: true` - Valida el header Origin para prevenir CSRF

### Comandos

```bash
pnpm dev      # Servidor de desarrollo
pnpm build    # Compilar para producción
pnpm preview  # Previsualizar build
```

---

## Estructura de Archivos

```
src/
├── actions/
│   └── index.ts        # Definición de todas las actions
├── data/
│   └── users.json      # Usuarios mock (solo desarrollo)
├── lib/
│   ├── cookies.ts      # Utilidades para cookies seguras
│   └── auth.ts         # Lógica de autenticación
├── layouts/
│   └── MainLayout.astro
└── pages/
    ├── login.astro
    ├── index.astro
    ├── con-redirect.astro
    └── con-js.astro
```

---

## Cookies Seguras

### Configuración Base

Archivo: `src/lib/cookies.ts`

```typescript
import type { AstroCookies } from 'astro';

// Opciones base para cookies seguras
export const secureCookieOptions = {
  path: '/',
  httpOnly: true,        // No accesible desde JavaScript
  sameSite: 'strict',    // Solo requests del mismo sitio
  secure: import.meta.env.PROD,  // HTTPS en producción
};
```

### Tipos de Cookies

| Cookie | Propósito | httpOnly | Duración |
|--------|-----------|----------|----------|
| `session_token` | Token de autenticación | Sí | 24 horas |
| `user_data` | Datos para UI (nombre) | No | 24 horas |
| `action_result` | Resultado temporal de actions | Sí | 1 minuto |

### Configuración Completa

```typescript
export const COOKIES = {
  SESSION: {
    name: 'session_token',
    options: {
      ...secureCookieOptions,
      maxAge: 60 * 60 * 24, // 24 horas
    },
  },
  USER_DATA: {
    name: 'user_data',
    options: {
      ...secureCookieOptions,
      httpOnly: false,  // Accesible desde JS para localStorage
      maxAge: 60 * 60 * 24,
    },
  },
  ACTION_RESULT: {
    name: 'action_result',
    options: {
      ...secureCookieOptions,
      maxAge: 60,  // 1 minuto
    },
  },
};
```

### Helpers para Action Results

```typescript
// Guardar resultado en cookie
export function setActionResult(cookies: AstroCookies, data: unknown): void {
  cookies.set(
    COOKIES.ACTION_RESULT.name,
    JSON.stringify(data),
    COOKIES.ACTION_RESULT.options
  );
}

// Leer y eliminar resultado
export function getActionResult<T>(cookies: AstroCookies): T | null {
  const cookie = cookies.get(COOKIES.ACTION_RESULT.name);
  if (!cookie) return null;

  const data = JSON.parse(cookie.value) as T;
  cookies.delete(COOKIES.ACTION_RESULT.name, { path: '/' });
  return data;
}
```

---

## Sistema de Autenticación

### Archivo: `src/lib/auth.ts`

#### Interfaces

```typescript
export interface User {
  id: string;
  username: string;
  nombre: string;
  email: string;
}
```

#### Generar Token

```typescript
// En producción sería JWT firmado
export function generateToken(): string {
  return crypto.randomUUID();
}
```

#### Buscar Usuario

```typescript
import users from '../data/users.json';

export function findUser(username: string, password: string): User | null {
  const user = users.find(
    (u) => u.username === username && u.password === password
  );

  if (!user) return null;

  // Retornar sin password
  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}
```

#### Crear Sesión

```typescript
// Almacén en memoria (en producción: Redis/DB)
const sessions = new Map<string, User>();

export function createSession(cookies: AstroCookies, user: User): string {
  const token = generateToken();

  // Guardar en servidor
  sessions.set(token, user);

  // Cookie de sesión (httpOnly)
  cookies.set(COOKIES.SESSION.name, token, COOKIES.SESSION.options);

  // Cookie con datos para UI
  cookies.set(
    COOKIES.USER_DATA.name,
    JSON.stringify({ nombre: user.nombre, username: user.username }),
    COOKIES.USER_DATA.options
  );

  return token;
}
```

#### Obtener Sesión

```typescript
export function getSession(cookies: AstroCookies): User | null {
  const token = cookies.get(COOKIES.SESSION.name)?.value;
  if (!token) return null;

  return sessions.get(token) || null;
}

export function isAuthenticated(cookies: AstroCookies): boolean {
  return getSession(cookies) !== null;
}
```

#### Cerrar Sesión

```typescript
export function destroySession(cookies: AstroCookies): void {
  const token = cookies.get(COOKIES.SESSION.name)?.value;

  if (token) {
    sessions.delete(token);
  }

  cookies.delete(COOKIES.SESSION.name, { path: '/' });
  cookies.delete(COOKIES.USER_DATA.name, { path: '/' });
}
```

---

## Protección de Rutas

### Patrón Correcto

La verificación de autenticación **debe hacerse en el frontmatter de cada página**, ANTES de renderizar el layout:

```astro
---
export const prerender = false;

import MainLayout from '../layouts/MainLayout.astro';
import { getSession } from '../lib/auth';

// ✅ Verificar ANTES de renderizar
const user = getSession(Astro.cookies);
if (!user) {
  return Astro.redirect('/login');
}
---

<MainLayout title="Página Protegida" user={user}>
  <!-- Contenido -->
</MainLayout>
```

### Por qué no en el Layout

```astro
---
// ❌ NO FUNCIONA - El layout ya comenzó a renderizarse
if (!user) {
  return Astro.redirect('/login');  // Error: ResponseSentError
}
---
```

Los layouts no pueden hacer redirects porque la respuesta HTTP ya comenzó a enviarse cuando se llega al layout.

---

## Consideraciones de Seguridad

### Lo que ya está implementado

| Protección | Implementación |
|------------|----------------|
| CSRF | `checkOrigin: true` en config |
| XSS | Astro escapa contenido automáticamente |
| Cookies seguras | httpOnly, sameSite, secure |
| Validación | Zod en el servidor |

### Para escalar a producción

| Aspecto | Actual | Producción |
|---------|--------|------------|
| Sesiones | Map en memoria | Redis / Base de datos |
| Tokens | UUID | JWT firmado |
| Passwords | Texto plano (mock) | bcrypt / argon2 |
| Auth check | En cada página | Middleware |
| Rate limiting | No | Sí |

### Flags de Cookies Explicados

```typescript
{
  httpOnly: true,     // JS del cliente NO puede leer la cookie
  sameSite: 'strict', // Cookie NO se envía en requests cross-site
  secure: true,       // Cookie solo viaja por HTTPS
  path: '/',          // Cookie válida en todas las rutas
  maxAge: 3600,       // Expiración en segundos
}
```

---

## Usuarios de Prueba

Archivo: `src/data/users.json`

| Usuario | Contraseña | Nombre |
|---------|------------|--------|
| admin | admin123 | Administrador |
| maria | maria123 | María García |
| juan | juan123 | Juan Pérez |

---

## Siguiente Paso

Ver [02-tipos-de-actions.md](./02-tipos-de-actions.md) para aprender los diferentes métodos de envío de formularios con Astro Actions.
