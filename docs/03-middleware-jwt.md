# Middleware y JWT con Cookies

Esta documentación cubre la implementación de autenticación usando middleware, JWT almacenado en cookies, y comunicación con un backend externo.

> **Prerequisito:** Leer [01-fundamentos.md](./01-fundamentos.md) para entender cookies seguras.

## Tabla de Contenidos

- [Arquitectura](#arquitectura)
- [Configuración de la Cookie](#configuración-de-la-cookie)
- [Middleware](#middleware)
- [Tipos para Locals](#tipos-para-locals)
- [Actions de Autenticación](#actions-de-autenticación)
- [Manejo de 401 en Actions](#manejo-de-401-en-actions)
- [Acceso en Páginas](#acceso-en-páginas)
- [Ventajas de este Enfoque](#ventajas-de-este-enfoque)

---

## Arquitectura

```
┌─────────────┐     ┌──────────────────────┐     ┌─────────────┐
│  Navegador  │────▶│  Astro (Frontend)    │────▶│   Backend   │
│             │     │  ┌────────────────┐  │     │             │
│  [Cookie]   │◀────│  │  Middleware    │  │◀────│   [JWT]     │
│             │     │  └────────────────┘  │     │             │
└─────────────┘     └──────────────────────┘     └─────────────┘
```

### Flujo de Login

```
1. Usuario envía credenciales (form → action)
2. Action llama al backend con credenciales
3. Backend valida y retorna { token: "jwt...", expiresIn: 600 }
4. Action guarda token en cookie httpOnly
5. Redirige a página protegida
```

### Flujo de Request Protegido

```
1. Usuario visita /app/dashboard
2. Middleware intercepta
3. Lee cookie, verifica que existe token
4. Pasa token a context.locals
5. Página/Action usa token para llamar al backend
6. Si backend retorna 401 → eliminar cookie, redirect a login
```

### Punto Clave: No Validar en Middleware

El middleware **solo verifica que la cookie existe**, no valida el JWT. La validación real ocurre cuando se hace la llamada al backend:

- **Eficiente:** No hay llamadas extra al backend en cada request
- **Seguro:** El backend siempre valida el JWT antes de responder
- **Simple:** El middleware es ligero y rápido

---

## Configuración de la Cookie

Archivo: `src/lib/api.ts`

```typescript
export const AUTH_COOKIE = {
  name: 'app_auth_token',
  options: {
    path: '/',
    httpOnly: true,           // No accesible desde JS
    sameSite: 'strict',       // Solo mismo sitio
    secure: import.meta.env.PROD,  // HTTPS en producción
    maxAge: 60 * 10,          // 10 minutos (sincronizar con JWT)
  },
};
```

### Sincronización con JWT

La duración de la cookie debe coincidir con la expiración del JWT:

```typescript
// El backend dice cuánto dura el token
const { token, expiresIn } = await backendLogin(credentials);

// Usamos ese valor para la cookie
context.cookies.set(AUTH_COOKIE.name, token, {
  ...AUTH_COOKIE.options,
  maxAge: expiresIn,  // Dinámico según backend
});
```

---

## Middleware

Archivo: `src/middleware.ts`

```typescript
import { defineMiddleware } from 'astro:middleware';
import { AUTH_COOKIE, decodeJWT } from './lib/api';

// Rutas públicas dentro de /app
const publicAppRoutes = ['/app/login'];

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  // Solo procesar rutas /app/*
  if (!pathname.startsWith('/app')) {
    return next();
  }

  // Rutas públicas de /app
  if (publicAppRoutes.includes(pathname)) {
    // Si ya tiene token en login, redirigir a dashboard
    const token = context.cookies.get(AUTH_COOKIE.name)?.value;
    if (token && pathname === '/app/login') {
      return context.redirect('/app/dashboard');
    }
    return next();
  }

  // Rutas protegidas: verificar cookie
  const token = context.cookies.get(AUTH_COOKIE.name)?.value;

  if (!token) {
    return context.redirect('/app/login');
  }

  // Decodificar token para obtener datos del usuario
  const payload = decodeJWT(token);

  if (!payload) {
    context.cookies.delete(AUTH_COOKIE.name, { path: '/' });
    return context.redirect('/app/login');
  }

  // Pasar datos a las páginas via locals
  context.locals.token = token;
  context.locals.user = {
    id: payload.sub as string,
    username: payload.username as string,
  };

  return next();
});
```

### Características del Middleware

| Aspecto | Comportamiento |
|---------|----------------|
| Rutas protegidas | `/app/*` excepto `/app/login` |
| Sin cookie | Redirect a `/app/login` |
| Token malformado | Elimina cookie, redirect a login |
| Token válido | Pasa datos a `context.locals` |

---

## Tipos para Locals

Archivo: `src/env.d.ts`

```typescript
/// <reference path="../.astro/types.d.ts" />

declare namespace App {
  interface Locals {
    token?: string;
    user?: {
      id: string;
      username: string;
    };
  }
}
```

Esto permite acceder a `Astro.locals.token` y `Astro.locals.user` con tipado.

---

## Actions de Autenticación

Archivo: `src/actions/index.ts`

### Login

```typescript
import { AUTH_COOKIE } from '../lib/api';

appLogin: defineAction({
  accept: 'form',
  input: z.object({
    username: z.string().min(1),
    password: z.string().min(1),
  }),
  handler: async ({ username, password }, context) => {
    // Llamar al backend real
    const result = await fetch('https://api.backend.com/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (!result.ok) {
      throw new ActionError({
        code: 'UNAUTHORIZED',
        message: 'Credenciales inválidas',
      });
    }

    const { token, expiresIn } = await result.json();

    // Guardar token en cookie
    context.cookies.set(AUTH_COOKIE.name, token, {
      ...AUTH_COOKIE.options,
      maxAge: expiresIn,
    });

    return { ok: true };
  },
}),
```

### Logout

```typescript
appLogout: defineAction({
  handler: async (_, context) => {
    context.cookies.delete(AUTH_COOKIE.name, { path: '/' });
    return { ok: true };
  },
}),
```

---

## Manejo de 401 en Actions

Cuando una action llama al backend con el token, debe manejar el caso de token expirado:

```typescript
appSubmitData: defineAction({
  input: z.object({
    mensaje: z.string().min(1),
  }),
  handler: async ({ mensaje }, context) => {
    // Obtener token de la cookie
    const token = context.cookies.get(AUTH_COOKIE.name)?.value;

    if (!token) {
      throw new ActionError({
        code: 'UNAUTHORIZED',
        message: 'SESSION_EXPIRED',
      });
    }

    // Llamar al backend con el token
    const result = await fetch('https://api.backend.com/data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ mensaje }),
    });

    // Manejar 401
    if (result.status === 401) {
      context.cookies.delete(AUTH_COOKIE.name, { path: '/' });
      throw new ActionError({
        code: 'UNAUTHORIZED',
        message: 'SESSION_EXPIRED',
      });
    }

    const data = await result.json();
    return { ok: true, data };
  },
}),
```

### Manejo en el Cliente

```typescript
const { data, error } = await actions.appSubmitData({ mensaje });

if (error?.message === 'SESSION_EXPIRED') {
  // Redirigir a login
  window.location.href = '/app/login';
  return;
}
```

---

## Acceso en Páginas

### Página Protegida

```astro
---
export const prerender = false;

import AppLayout from '../../layouts/AppLayout.astro';

// El middleware ya validó - estos datos vienen de locals
const { user, token } = Astro.locals;
---

<AppLayout title="Dashboard">
  <h1>Hola, {user?.username}</h1>

  <!-- El token está disponible para debug si es necesario -->
</AppLayout>
```

### Layout con Datos del Usuario

```astro
---
const user = Astro.locals.user;
---

<header>
  {user ? (
    <span>Bienvenido, {user.username}</span>
  ) : (
    <a href="/app/login">Iniciar sesión</a>
  )}
</header>
```

---

## Ventajas de este Enfoque

| Aspecto | Beneficio |
|---------|-----------|
| **Reinicio de servidor** | No afecta (token en cookie del navegador) |
| **Escalabilidad** | Múltiples instancias de Astro sin problema |
| **Seguridad** | Cookie httpOnly, backend controla validación |
| **Simplicidad** | Astro no maneja sesiones, solo proxy |
| **Performance** | No hay validación extra en middleware |

### Comparativa: Sesión en Memoria vs Cookie/JWT

| Aspecto | Map en Memoria | Cookie con JWT |
|---------|----------------|----------------|
| Persiste al reiniciar | No | Sí |
| Escala horizontalmente | No | Sí |
| Revocación inmediata | Sí | No (esperar expiración) |
| Complejidad | Media | Baja |

---

## Estructura de Archivos

```
src/
├── middleware.ts           # Protección de rutas
├── env.d.ts               # Tipos para locals
├── lib/
│   └── api.ts             # Cookie config + helpers
├── layouts/
│   └── AppLayout.astro    # Layout con user info
└── pages/
    ├── home.astro         # Pública
    └── app/
        ├── login.astro    # Login
        └── dashboard.astro # Protegida
```

---

## Siguiente Paso

Ver [04-organizacion-actions.md](./04-organizacion-actions.md) para aprender cómo organizar actions en múltiples archivos.
