# Organización de Actions en Múltiples Archivos

Astro requiere que las actions se exporten desde `src/actions/index.ts`, pero puedes organizarlas en múltiples archivos e importarlas.

## Tabla de Contenidos

- [Estructura Recomendada](#estructura-recomendada)
- [Implementación](#implementación)
- [Ejemplo Completo](#ejemplo-completo)
- [Agrupación con Namespaces](#agrupación-con-namespaces)
- [Buenas Prácticas](#buenas-prácticas)

---

## Estructura Recomendada

```
src/actions/
├── index.ts          # Archivo principal (re-exporta todo)
├── auth.ts           # Actions de autenticación
├── posts.ts          # Actions de posts/blog
├── users.ts          # Actions de usuarios
└── utils.ts          # Helpers compartidos (opcional)
```

---

## Implementación

### Paso 1: Crear Archivos por Grupo

**`src/actions/auth.ts`**

```typescript
import { defineAction, ActionError } from 'astro:actions';
import { z } from 'astro/zod';
import { AUTH_COOKIE } from '../lib/api';

export const auth = {
  login: defineAction({
    accept: 'form',
    input: z.object({
      username: z.string().min(1),
      password: z.string().min(1),
    }),
    handler: async ({ username, password }, context) => {
      // Lógica de login...
      return { ok: true };
    },
  }),

  logout: defineAction({
    handler: async (_, context) => {
      context.cookies.delete(AUTH_COOKIE.name, { path: '/' });
      return { ok: true };
    },
  }),

  register: defineAction({
    accept: 'form',
    input: z.object({
      email: z.string().email(),
      password: z.string().min(8),
      nombre: z.string().min(1),
    }),
    handler: async (input, context) => {
      // Lógica de registro...
      return { ok: true };
    },
  }),
};
```

**`src/actions/posts.ts`**

```typescript
import { defineAction, ActionError } from 'astro:actions';
import { z } from 'astro/zod';

export const posts = {
  create: defineAction({
    input: z.object({
      title: z.string().min(1),
      content: z.string().min(10),
      tags: z.array(z.string()).optional(),
    }),
    handler: async ({ title, content, tags }, context) => {
      const token = context.cookies.get('auth_token')?.value;
      // Llamar al backend...
      return { ok: true, postId: '123' };
    },
  }),

  update: defineAction({
    input: z.object({
      id: z.string(),
      title: z.string().min(1).optional(),
      content: z.string().min(10).optional(),
    }),
    handler: async (input, context) => {
      // Lógica de actualización...
      return { ok: true };
    },
  }),

  delete: defineAction({
    input: z.object({
      id: z.string(),
    }),
    handler: async ({ id }, context) => {
      // Lógica de eliminación...
      return { ok: true };
    },
  }),

  list: defineAction({
    input: z.object({
      page: z.number().optional().default(1),
      limit: z.number().optional().default(10),
    }),
    handler: async ({ page, limit }) => {
      // Obtener posts...
      return { posts: [], total: 0 };
    },
  }),
};
```

**`src/actions/users.ts`**

```typescript
import { defineAction, ActionError } from 'astro:actions';
import { z } from 'astro/zod';

export const users = {
  getProfile: defineAction({
    handler: async (_, context) => {
      const token = context.cookies.get('auth_token')?.value;
      // Obtener perfil...
      return { user: { id: '1', nombre: 'Usuario' } };
    },
  }),

  updateProfile: defineAction({
    input: z.object({
      nombre: z.string().min(1).optional(),
      email: z.string().email().optional(),
      avatar: z.string().url().optional(),
    }),
    handler: async (input, context) => {
      // Actualizar perfil...
      return { ok: true };
    },
  }),
};
```

### Paso 2: Re-exportar en index.ts

**`src/actions/index.ts`**

```typescript
import { auth } from './auth';
import { posts } from './posts';
import { users } from './users';

export const server = {
  // Opción 1: Spread (actions planas)
  ...auth,
  ...posts,
  ...users,

  // Opción 2: Agrupadas (ver sección de namespaces)
  // auth,
  // posts,
  // users,
};
```

---

## Ejemplo Completo

### Con Spread (Actions Planas)

```typescript
// src/actions/index.ts
import { auth } from './auth';
import { posts } from './posts';

export const server = {
  ...auth,   // login, logout, register
  ...posts,  // create, update, delete, list
};
```

**Uso en el cliente:**

```typescript
import { actions } from 'astro:actions';

// Llamadas directas
await actions.login({ username, password });
await actions.create({ title, content });
await actions.list({ page: 1 });
```

**Uso en formularios:**

```astro
<form method="POST" action={actions.login}>
<form method="POST" action={actions.create}>
```

---

## Agrupación con Namespaces

Si prefieres mantener las actions agrupadas por módulo:

### Estructura

```typescript
// src/actions/index.ts
import { auth } from './auth';
import { posts } from './posts';

export const server = {
  auth,   // { login, logout, register }
  posts,  // { create, update, delete, list }
};
```

### Uso con Namespaces

```typescript
import { actions } from 'astro:actions';

// Llamadas agrupadas
await actions.auth.login({ username, password });
await actions.auth.logout();
await actions.posts.create({ title, content });
await actions.posts.list({ page: 1 });
```

```astro
<form method="POST" action={actions.auth.login}>
<form method="POST" action={actions.posts.create}>
```

### Ventajas de Namespaces

| Aspecto | Beneficio |
|---------|-----------|
| Organización | Actions claramente agrupadas por dominio |
| Autocompletado | IDE muestra opciones por grupo |
| Colisiones | Evita conflictos de nombres (`auth.delete` vs `posts.delete`) |

---

## Buenas Prácticas

### 1. Un Archivo por Dominio

```
src/actions/
├── index.ts       # Solo re-exportaciones
├── auth.ts        # Login, logout, register, forgot-password
├── posts.ts       # CRUD de posts
├── comments.ts    # CRUD de comentarios
└── media.ts       # Upload, delete de archivos
```

### 2. Helpers Compartidos

```typescript
// src/actions/utils.ts
import { ActionError } from 'astro:actions';
import type { AstroCookies } from 'astro';

export function getAuthToken(cookies: AstroCookies): string {
  const token = cookies.get('auth_token')?.value;
  if (!token) {
    throw new ActionError({
      code: 'UNAUTHORIZED',
      message: 'SESSION_EXPIRED',
    });
  }
  return token;
}

export async function fetchWithAuth(
  url: string,
  token: string,
  options: RequestInit = {}
) {
  const res = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (res.status === 401) {
    throw new ActionError({
      code: 'UNAUTHORIZED',
      message: 'SESSION_EXPIRED',
    });
  }

  return res;
}
```

**Uso en actions:**

```typescript
// src/actions/posts.ts
import { getAuthToken, fetchWithAuth } from './utils';

export const posts = {
  create: defineAction({
    input: z.object({ title: z.string(), content: z.string() }),
    handler: async (input, context) => {
      const token = getAuthToken(context.cookies);

      const res = await fetchWithAuth(
        'https://api.backend.com/posts',
        token,
        {
          method: 'POST',
          body: JSON.stringify(input),
        }
      );

      return res.json();
    },
  }),
};
```

### 3. Tipos Compartidos

```typescript
// src/actions/types.ts
export interface Post {
  id: string;
  title: string;
  content: string;
  authorId: string;
  createdAt: string;
}

export interface User {
  id: string;
  nombre: string;
  email: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
```

### 4. Evitar Lógica Duplicada

```typescript
// src/actions/posts.ts
import { defineAction } from 'astro:actions';
import { z } from 'astro/zod';
import { getAuthToken, fetchWithAuth } from './utils';

const API_BASE = 'https://api.backend.com';

export const posts = {
  create: defineAction({
    input: z.object({
      title: z.string().min(1),
      content: z.string().min(10),
    }),
    handler: async (input, context) => {
      const token = getAuthToken(context.cookies);
      const res = await fetchWithAuth(`${API_BASE}/posts`, token, {
        method: 'POST',
        body: JSON.stringify(input),
      });
      return res.json();
    },
  }),

  // Reutiliza el mismo patrón
  update: defineAction({
    input: z.object({
      id: z.string(),
      title: z.string().optional(),
      content: z.string().optional(),
    }),
    handler: async ({ id, ...data }, context) => {
      const token = getAuthToken(context.cookies);
      const res = await fetchWithAuth(`${API_BASE}/posts/${id}`, token, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
      return res.json();
    },
  }),
};
```

---

## Estructura Final Recomendada

```
src/actions/
├── index.ts          # Re-exportaciones
├── auth.ts           # login, logout, register, forgotPassword
├── posts.ts          # create, update, delete, list, getById
├── comments.ts       # create, delete, list
├── users.ts          # getProfile, updateProfile
├── utils.ts          # getAuthToken, fetchWithAuth
└── types.ts          # Interfaces compartidas
```

**`src/actions/index.ts`**

```typescript
import { auth } from './auth';
import { posts } from './posts';
import { comments } from './comments';
import { users } from './users';

export const server = {
  auth,
  posts,
  comments,
  users,
};
```

---

## Resumen

| Enfoque | Cuándo Usar |
|---------|-------------|
| **Un solo archivo** | Proyectos pequeños (< 10 actions) |
| **Múltiples archivos con spread** | Proyectos medianos, sin colisiones de nombres |
| **Múltiples archivos con namespaces** | Proyectos grandes, organización clara por dominio |

La clave es que `src/actions/index.ts` siempre es el punto de entrada, pero puedes organizar la lógica como prefieras.
