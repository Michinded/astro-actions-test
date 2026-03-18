---
name: astro-action-reload
description: |
  Create Astro actions that reload the page after form submission. Use this skill when implementing form-based actions that submit via POST and reload the page to show results. This covers two patterns: simple form POST (URL gets ?_action=...) and POST-Redirect-GET (clean URL with temporary cookie). Use this for login forms, contact forms, data submission forms, or any action where JavaScript is optional and the page should reload to show success/error states. Trigger this skill when the user mentions: form actions, page reload after submit, form POST in Astro, no-JavaScript forms, POST-Redirect-GET pattern, or clean URLs after form submission.
---

# Astro Actions with Page Reload

This skill covers form-based Astro actions that reload the page after submission. These work without JavaScript and use `accept: 'form'` in the action definition.

## When to Use Reload Actions

Use reload-style actions when:
- The form should work without JavaScript
- You want progressive enhancement
- The action represents a significant state change (login, data submission)
- You need to prevent double-submission with POST-Redirect-GET

## Two Reload Patterns

### Pattern 1: Simple Form POST

The URL changes to `?_action=actionName` after submit. Simple to implement but URL is not clean.

### Pattern 2: POST-Redirect-GET (Recommended)

After success, redirect to a clean URL. Result is preserved in a temporary cookie. Prevents re-submission on page refresh.

---

## Action Definition

Form-based actions must use `accept: 'form'`:

```typescript
// src/actions/index.ts
import { defineAction, ActionError } from 'astro:actions';
import { z } from 'astro/zod';

export const server = {
  submitForm: defineAction({
    accept: 'form',  // Required for form POST
    input: z.object({
      nombre: z.string().min(1, 'Nombre requerido'),
      mensaje: z.string().min(1, 'Mensaje requerido'),
    }),
    handler: async ({ nombre, mensaje }, context) => {
      // Access cookies via context.cookies
      // Perform server-side logic

      const response = await fetch('https://api.example.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, mensaje }),
      });

      if (!response.ok) {
        throw new Error('No se pudo enviar el formulario');
      }

      const data = await response.json();
      return { ok: true, id: data.id, echo: { nombre, mensaje } };
    },
  }),
};
```

## Pattern 1: Simple Form POST

The page reloads with `?_action=submitForm` in the URL.

```astro
---
// src/pages/formulario.astro
export const prerender = false;
import { actions } from 'astro:actions';
import MainLayout from '../layouts/MainLayout.astro';

// Get result from previous form submission
const result = Astro.getActionResult(actions.submitForm);
---

<MainLayout title="Formulario">
  <div class="container">
    {/* Show success message */}
    {result && !result.error && (
      <div class="alert success">
        <p>Enviado correctamente. ID: {result.data.id}</p>
      </div>
    )}

    {/* Show error message */}
    {result?.error && (
      <div class="alert error">
        <p>Error: No se pudo enviar el formulario.</p>
      </div>
    )}

    {/* Form with action attribute */}
    <form method="POST" action={actions.submitForm}>
      <label>
        Nombre:
        <input type="text" name="nombre" required />
      </label>

      <label>
        Mensaje:
        <textarea name="mensaje" required></textarea>
      </label>

      <button type="submit">Enviar</button>
    </form>
  </div>
</MainLayout>
```

**Flow:**
1. User submits form
2. Browser POSTs to `/?_action=submitForm`
3. Astro executes action handler
4. Page reloads with result available via `Astro.getActionResult()`

---

## Pattern 2: POST-Redirect-GET (Clean URL)

After success, redirect to a clean URL. The result is stored in a temporary cookie.

### Cookie Utilities

First, create cookie helpers:

```typescript
// src/lib/cookies.ts
import type { AstroCookies } from 'astro';

const COOKIES = {
  ACTION_RESULT: {
    name: 'action_result',
    options: {
      path: '/',
      httpOnly: true,
      sameSite: 'strict' as const,
      secure: import.meta.env.PROD,
      maxAge: 60, // 1 minute - just long enough for redirect
    },
  },
};

export function setActionResult(cookies: AstroCookies, data: unknown): void {
  cookies.set(
    COOKIES.ACTION_RESULT.name,
    JSON.stringify(data),
    COOKIES.ACTION_RESULT.options
  );
}

export function getActionResult<T>(cookies: AstroCookies): T | null {
  const cookie = cookies.get(COOKIES.ACTION_RESULT.name);
  if (!cookie) return null;

  const data = JSON.parse(cookie.value) as T;
  // Auto-delete after reading (single use)
  cookies.delete(COOKIES.ACTION_RESULT.name, { path: '/' });
  return data;
}
```

### Page Implementation

```astro
---
// src/pages/formulario-limpio.astro
export const prerender = false;
import { actions } from 'astro:actions';
import { setActionResult, getActionResult } from '../lib/cookies';
import MainLayout from '../layouts/MainLayout.astro';

// Get result from form submission
const result = Astro.getActionResult(actions.submitForm);

// On success: save to cookie and redirect to clean URL
if (result && !result.error) {
  setActionResult(Astro.cookies, result.data);
  return Astro.redirect('/formulario-limpio');
}

// Read result from cookie (if redirected)
interface FormResult {
  id: number;
  echo: { nombre: string; mensaje: string };
}
const savedResult = getActionResult<FormResult>(Astro.cookies);
---

<MainLayout title="Formulario">
  <div class="container">
    {/* Show success from cookie (after redirect) */}
    {savedResult && (
      <div class="alert success">
        <p>Enviado correctamente. ID: {savedResult.id}</p>
        <pre>{JSON.stringify(savedResult.echo, null, 2)}</pre>
      </div>
    )}

    {/* Show error (no redirect on error) */}
    {result?.error && (
      <div class="alert error">
        <p>Error: No se pudo enviar el formulario.</p>
      </div>
    )}

    {/* Same form structure */}
    <form method="POST" action={actions.submitForm}>
      <label>
        Nombre:
        <input type="text" name="nombre" required />
      </label>

      <label>
        Mensaje:
        <textarea name="mensaje" required></textarea>
      </label>

      <button type="submit">Enviar</button>
    </form>
  </div>
</MainLayout>
```

**Flow:**
1. User submits form
2. Browser POSTs to `/formulario-limpio?_action=submitForm`
3. Astro executes action handler
4. On success: save result to cookie, redirect to `/formulario-limpio`
5. Browser follows redirect (clean URL)
6. Page reads result from cookie (cookie auto-deletes)
7. Success message displayed

**Benefits of POST-Redirect-GET:**
- Clean URL (no `?_action=...`)
- Refresh doesn't re-submit form
- Back button works correctly
- Bookmarkable success page

---

## Error Handling

For form-based actions, use simple `Error`:

```typescript
handler: async ({ field }, context) => {
  if (someValidationFails) {
    throw new Error('Mensaje de error visible al usuario');
  }

  const response = await fetch('...');
  if (!response.ok) {
    throw new Error('Error al conectar con el servidor');
  }

  return { ok: true, data: response.json() };
}
```

In the page, check `result?.error`:

```astro
{result?.error && (
  <div class="alert error">
    <p>Error: {result.error.message || 'Ocurrió un error'}</p>
  </div>
)}
```

---

## Login Form Example

A complete login form using POST-Redirect-GET:

### Action

```typescript
// src/actions/index.ts
login: defineAction({
  accept: 'form',
  input: z.object({
    username: z.string().min(1, 'Usuario requerido'),
    password: z.string().min(1, 'Contraseña requerida'),
  }),
  handler: async ({ username, password }, context) => {
    // Validate credentials
    const user = await authenticateUser(username, password);

    if (!user) {
      throw new ActionError({
        code: 'UNAUTHORIZED',
        message: 'Usuario o contraseña incorrectos',
      });
    }

    // Set session cookie
    context.cookies.set('session_token', user.token, {
      path: '/',
      httpOnly: true,
      sameSite: 'strict',
      secure: import.meta.env.PROD,
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return { ok: true, user: { id: user.id, name: user.name } };
  },
}),
```

### Page

```astro
---
// src/pages/login.astro
export const prerender = false;
import { actions } from 'astro:actions';

const result = Astro.getActionResult(actions.login);

// On successful login, redirect to dashboard
if (result && !result.error) {
  return Astro.redirect('/dashboard');
}
---

<main>
  <h1>Iniciar Sesión</h1>

  {result?.error && (
    <div class="alert error">
      <p>{result.error.message}</p>
    </div>
  )}

  <form method="POST" action={actions.login}>
    <label>
      Usuario:
      <input type="text" name="username" required />
    </label>

    <label>
      Contraseña:
      <input type="password" name="password" required />
    </label>

    <button type="submit">Entrar</button>
  </form>
</main>
```

---

## Checklist

When implementing reload-style actions:

- [ ] Add `accept: 'form'` to action definition
- [ ] Use `z.object()` for input validation
- [ ] Add `export const prerender = false` to the page
- [ ] Use `Astro.getActionResult(actions.name)` to read results
- [ ] Set form `method="POST"` and `action={actions.name}`
- [ ] Handle both success and error states in the template
- [ ] For clean URLs: implement cookie utilities and redirect on success
- [ ] Use `throw new Error('message')` for user-facing errors
