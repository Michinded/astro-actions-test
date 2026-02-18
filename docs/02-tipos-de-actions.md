# Tipos de Astro Actions

Esta documentación cubre los tres métodos de envío de formularios implementados en el proyecto.

> **Prerequisito:** Leer [01-fundamentos.md](./01-fundamentos.md) para entender cookies y autenticación.

## Tabla de Contenidos

- [Definición de Actions](#definición-de-actions)
- [Método 1: Form POST (Sin JavaScript)](#método-1-form-post-sin-javascript)
- [Método 2: Con Redirect (URL Limpia)](#método-2-con-redirect-url-limpia)
- [Método 3: Con JavaScript (Sin Recargar)](#método-3-con-javascript-sin-recargar)
- [Comparativa](#comparativa)

---

## Definición de Actions

Archivo: `src/actions/index.ts`

### Action para Form POST

```typescript
import { defineAction, ActionError } from 'astro:actions';
import { z } from 'astro/zod';

export const server = {
  enviarAApi: defineAction({
    accept: 'form',  // Acepta FormData
    input: z.object({
      nombre: z.string().min(1, 'El nombre es requerido'),
      mensaje: z.string().min(1, 'El mensaje es requerido'),
    }),
    handler: async ({ nombre, mensaje }) => {
      const res = await fetch('https://jsonplaceholder.typicode.com/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=UTF-8' },
        body: JSON.stringify({
          title: `Contacto de ${nombre}`,
          body: mensaje,
          userId: 1,
        }),
      });

      if (!res.ok) {
        throw new Error(`API respondió con status ${res.status}`);
      }

      const data = await res.json();

      return {
        ok: true,
        apiId: data.id,
        echo: {
          title: data.title,
          body: data.body,
        },
      };
    },
  }),
};
```

### Action para JavaScript

```typescript
enviarConJs: defineAction({
  // Sin 'accept: form' = acepta JSON por defecto
  input: z.object({
    nombre: z.string().min(1, 'El nombre es requerido'),
    mensaje: z.string().min(1, 'El mensaje es requerido'),
  }),
  handler: async ({ nombre, mensaje }) => {
    // ... misma lógica

    if (!res.ok) {
      throw new ActionError({
        code: 'BAD_REQUEST',
        message: `API respondió con status ${res.status}`,
      });
    }

    // ...
  },
}),
```

### Actions de Autenticación

```typescript
import { findUser, createSession, destroySession } from '../lib/auth';

login: defineAction({
  accept: 'form',
  input: z.object({
    username: z.string().min(1, 'El usuario es requerido'),
    password: z.string().min(1, 'La contraseña es requerida'),
  }),
  handler: async ({ username, password }, context) => {
    const user = findUser(username, password);

    if (!user) {
      throw new ActionError({
        code: 'UNAUTHORIZED',
        message: 'Usuario o contraseña incorrectos',
      });
    }

    // context.cookies disponible en el handler
    createSession(context.cookies, user);

    return { ok: true, user: { nombre: user.nombre } };
  },
}),

logout: defineAction({
  handler: async (_, context) => {
    destroySession(context.cookies);
    return { ok: true };
  },
}),
```

---

## Método 1: Form POST (Sin JavaScript)

**Archivo:** `src/pages/index.astro`

### Características

- El navegador hace POST nativo
- La página recarga completamente
- La URL cambia a `?_action=enviarAApi`
- Funciona sin JavaScript habilitado

### Implementación

```astro
---
export const prerender = false;

import MainLayout from '../layouts/MainLayout.astro';
import { actions } from 'astro:actions';
import { getSession } from '../lib/auth';

// Protección de ruta
const user = getSession(Astro.cookies);
if (!user) {
  return Astro.redirect('/login');
}

// Obtener resultado del POST (si hubo submit)
const result = Astro.getActionResult(actions.enviarAApi);
---

<MainLayout title="Form POST" user={user}>
  {/* Mostrar resultado exitoso */}
  {result && !result.error && (
    <div class="ok">
      <p>Enviado! API respondió con id={result.data.apiId}</p>
      <pre>{JSON.stringify(result.data.echo, null, 2)}</pre>
    </div>
  )}

  {/* Mostrar error */}
  {result?.error && (
    <div class="err">
      <p>Error: No se pudo enviar.</p>
    </div>
  )}

  {/* Formulario */}
  <form method="POST" action={actions.enviarAApi}>
    <label>
      Nombre
      <input name="nombre" required />
    </label>

    <label>
      Mensaje
      <textarea name="mensaje" required></textarea>
    </label>

    <button type="submit">Enviar</button>
  </form>
</MainLayout>
```

### Flujo

```
1. Usuario llena formulario
2. Click en "Enviar"
3. Navegador hace POST a /?_action=enviarAApi
4. Astro ejecuta el handler de la action
5. Página recarga con result disponible
6. Astro.getActionResult() lee el resultado
7. Se renderiza éxito o error
```

### Cuándo Usar

- Aplicaciones que deben funcionar sin JavaScript
- Formularios simples donde la recarga es aceptable
- Máxima compatibilidad con navegadores

---

## Método 2: Con Redirect (URL Limpia)

**Archivo:** `src/pages/con-redirect.astro`

### Características

- Form POST nativo igual que el método 1
- Después del submit, hace redirect para limpiar la URL
- Usa cookie temporal para preservar el resultado
- La URL queda limpia (sin `?_action=...`)

### Implementación

```astro
---
export const prerender = false;

import MainLayout from '../layouts/MainLayout.astro';
import { actions } from 'astro:actions';
import { setActionResult, getActionResult } from '../lib/cookies';
import { getSession } from '../lib/auth';

// Protección de ruta
const user = getSession(Astro.cookies);
if (!user) {
  return Astro.redirect('/login');
}

const result = Astro.getActionResult(actions.enviarAApi);

// Si hay resultado exitoso, guardar en cookie y redirigir
if (result && !result.error) {
  setActionResult(Astro.cookies, result.data);
  return Astro.redirect('/con-redirect');
}

// Leer resultado de la cookie (si existe)
interface ActionResultData {
  apiId: number;
  echo: { title: string; body: string };
}
const savedResult = getActionResult<ActionResultData>(Astro.cookies);
---

<MainLayout title="Con Redirect" user={user}>
  {/* Mostrar resultado guardado en cookie */}
  {savedResult && (
    <div class="ok">
      <p>Enviado! API respondió con id={savedResult.apiId}</p>
      <pre>{JSON.stringify(savedResult.echo, null, 2)}</pre>
    </div>
  )}

  {result?.error && (
    <div class="err">
      <p>Error: No se pudo enviar.</p>
    </div>
  )}

  <form method="POST" action={actions.enviarAApi}>
    {/* ... campos ... */}
  </form>
</MainLayout>
```

### Flujo

```
1. Usuario llena formulario
2. Click en "Enviar"
3. POST a /?_action=enviarAApi
4. Handler ejecuta, retorna datos
5. Página detecta result exitoso
6. Guarda datos en cookie temporal (1 min)
7. Redirect a /con-redirect (URL limpia)
8. Página lee cookie, la elimina
9. Muestra resultado
```

### Cuándo Usar

- Prevenir re-envío al refrescar (patrón POST-Redirect-GET)
- URLs limpias para compartir
- Cuando la estética de la URL importa

---

## Método 3: Con JavaScript (Sin Recargar)

**Archivo:** `src/pages/con-js.astro`

### Características

- El formulario NO recarga la página
- Llamada asíncrona a la action
- UI más fluida (loading states, etc.)
- La URL nunca cambia

### Implementación

```astro
---
export const prerender = false;

import MainLayout from '../layouts/MainLayout.astro';
import { getSession } from '../lib/auth';

const user = getSession(Astro.cookies);
if (!user) {
  return Astro.redirect('/login');
}
---

<MainLayout title="Con JavaScript" user={user}>
  <div id="resultado"></div>

  <form id="miForm">
    <label>
      Nombre
      <input name="nombre" required />
    </label>

    <label>
      Mensaje
      <textarea name="mensaje" required></textarea>
    </label>

    <button type="submit">Enviar</button>
  </form>

  <script>
    import { actions } from 'astro:actions';

    const form = document.getElementById('miForm') as HTMLFormElement;
    const resultado = document.getElementById('resultado') as HTMLDivElement;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const formData = new FormData(form);
      const nombre = formData.get('nombre') as string;
      const mensaje = formData.get('mensaje') as string;

      // Estado de carga
      resultado.innerHTML = '<p>Enviando...</p>';

      try {
        // Llamar action directamente
        const { data, error } = await actions.enviarConJs({ nombre, mensaje });

        if (error) {
          resultado.innerHTML = `
            <div class="err">
              <p>Error: ${error.message}</p>
            </div>
          `;
          return;
        }

        // Éxito
        resultado.innerHTML = `
          <div class="ok">
            <p>Enviado! API respondió con id=${data.apiId}</p>
            <pre>${JSON.stringify(data.echo, null, 2)}</pre>
          </div>
        `;

        form.reset();
      } catch (err) {
        resultado.innerHTML = `
          <div class="err">
            <p>Error inesperado</p>
          </div>
        `;
      }
    });
  </script>
</MainLayout>
```

### Diferencias Clave

| Aspecto | Form POST | JavaScript |
|---------|-----------|------------|
| Action definition | `accept: 'form'` | Sin accept (JSON) |
| Form attribute | `action={actions.x}` | Sin action |
| Submit | Nativo del navegador | `e.preventDefault()` |
| Llamada | Automática | `await actions.x()` |
| Resultado | `Astro.getActionResult()` | `{ data, error }` directo |

### Cuándo Usar

- Aplicaciones SPA-like
- Formularios con validación en tiempo real
- Cuando necesitas estados de carga
- Múltiples envíos sin recargar

---

## Comparativa

| Característica | Form POST | Con Redirect | Con JavaScript |
|----------------|-----------|--------------|----------------|
| Recarga página | Sí | Sí (2 veces) | No |
| Funciona sin JS | Sí | Sí | No |
| URL limpia | No | Sí | Sí |
| Loading state | No | No | Sí |
| Previene re-envío | No | Sí | Sí |
| Complejidad | Baja | Media | Media |

### Recomendación

- **Form POST:** Formularios simples, máxima compatibilidad
- **Con Redirect:** Formularios importantes donde prevenir duplicados es crítico
- **Con JavaScript:** UX moderna, aplicaciones interactivas

---

## Errores Comunes

### 1. ResponseSentError

```
Error: The response has already been sent
```

**Causa:** Intentar redirect desde un layout.

**Solución:** Hacer el redirect en la página, antes del layout.

```astro
---
// ✅ Correcto - en la página
const user = getSession(Astro.cookies);
if (!user) return Astro.redirect('/login');
---
<MainLayout>
```

### 2. Cross-site POST forbidden

```
Cross-site POST form submissions are forbidden
```

**Causa:** El Origin header no coincide con el host.

**Solución:** Configurar `server.host` o verificar que accedes desde el host correcto.

### 3. Action no encontrada

```
Cannot find action 'enviarAApi'
```

**Causa:** La action no está exportada en `server`.

**Solución:** Verificar que está dentro de `export const server = { ... }`.

---

## Siguiente Paso

Con estos fundamentos puedes:

1. Agregar más actions siguiendo los patrones
2. Implementar middleware para auth centralizada
3. Conectar a una base de datos real
4. Implementar JWT para tokens firmados
