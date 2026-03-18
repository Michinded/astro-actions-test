---
name: astro-action-spa
description: |
  Create Astro actions that work without page reload using JavaScript (SPA-style). Use this skill when building interactive features that call server actions from client-side JavaScript, update the DOM dynamically, and keep the URL clean. Perfect for CRUD operations, real-time updates, loading states, and modern SPA-like experiences. Trigger this skill when the user mentions: JavaScript actions, no page reload, SPA actions, async form submission, dynamic updates, CRUD without reload, client-side action calls, or actions.actionName() in script tags.
---

# Astro Actions with JavaScript (No Reload)

This skill covers JavaScript-based Astro actions that don't reload the page. Actions are called directly from `<script>` tags using `await actions.name()`, and the DOM is updated dynamically.

## When to Use JavaScript Actions

Use JavaScript actions when:
- You need a modern SPA-like experience
- Loading states and async feedback are important
- Multiple operations happen on the same page (CRUD)
- You want to avoid page reloads
- Real-time updates are needed

## Key Differences from Form-Based Actions

| Aspect | Form POST (Reload) | JavaScript (No Reload) |
|--------|-------------------|------------------------|
| `accept` in action | `'form'` | Not specified (JSON default) |
| Form attribute | `action={actions.x}` | NO action attribute |
| Submission | Native browser POST | `e.preventDefault()` + JS |
| Error class | `Error` | `ActionError` |
| Response | `Astro.getActionResult()` | `{ data, error }` |
| Page reload | Yes | No |
| Loading states | No | Yes |

---

## Action Definition

JavaScript actions use JSON input (the default):

```typescript
// src/actions/index.ts
import { defineAction, ActionError } from 'astro:actions';
import { z } from 'astro/zod';

export const server = {
  // Simple action
  sendMessage: defineAction({
    input: z.object({
      nombre: z.string().min(1, 'Nombre requerido'),
      mensaje: z.string().min(1, 'Mensaje requerido'),
    }),
    handler: async ({ nombre, mensaje }) => {
      const response = await fetch('https://api.example.com/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, mensaje }),
      });

      if (!response.ok) {
        throw new ActionError({
          code: 'BAD_REQUEST',
          message: 'No se pudo enviar el mensaje',
        });
      }

      const data = await response.json();
      return { ok: true, id: data.id, echo: { nombre, mensaje } };
    },
  }),

  // Action without input (e.g., list items)
  getItems: defineAction({
    handler: async () => {
      const items = await fetchItemsFromDB();
      return { items };
    },
  }),
};
```

---

## Basic Pattern: Form with JavaScript

The form has an `id` but NO `action` attribute. JavaScript handles submission.

```astro
---
// src/pages/contact.astro
export const prerender = false;
import MainLayout from '../layouts/MainLayout.astro';
---

<MainLayout title="Contact">
  <h1>Contact Form</h1>

  <!-- Result container -->
  <div id="resultado"></div>

  <!-- Form with id, NO action attribute -->
  <form id="contactForm">
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

  <script>
    import { actions } from 'astro:actions';

    const form = document.getElementById('contactForm') as HTMLFormElement;
    const resultado = document.getElementById('resultado') as HTMLDivElement;

    form.addEventListener('submit', async (e) => {
      e.preventDefault(); // Prevent page reload

      // Extract form data
      const formData = new FormData(form);
      const nombre = formData.get('nombre') as string;
      const mensaje = formData.get('mensaje') as string;

      // Show loading state
      resultado.innerHTML = '<p class="loading">Enviando...</p>';

      try {
        // Call action - returns { data, error }
        const { data, error } = await actions.sendMessage({ nombre, mensaje });

        if (error) {
          resultado.innerHTML = `
            <div class="error">
              <p>Error: ${error.message}</p>
            </div>
          `;
          return;
        }

        // Success - update DOM
        resultado.innerHTML = `
          <div class="success">
            <p>Enviado correctamente. ID: ${data.id}</p>
          </div>
        `;

        form.reset();
      } catch (err) {
        resultado.innerHTML = `
          <div class="error">
            <p>Error inesperado</p>
          </div>
        `;
      }
    });
  </script>
</MainLayout>
```

---

## CRUD Pattern: Multiple Actions on One Page

For apps with Create, Read, Update, Delete operations:

### Actions File

Split actions into a separate file for organization:

```typescript
// src/actions/posts.ts
import { defineAction, ActionError } from 'astro:actions';
import { z } from 'astro/zod';
import { getAllPosts, getPostById, createPost, updatePost, deletePost } from '../lib/db';

export const postsActions = {
  postsList: defineAction({
    handler: async () => {
      const posts = getAllPosts();
      return { posts };
    },
  }),

  postsGet: defineAction({
    input: z.object({
      id: z.string().min(1, 'ID requerido'),
    }),
    handler: async ({ id }) => {
      const post = getPostById(id);
      if (!post) {
        throw new ActionError({
          code: 'NOT_FOUND',
          message: 'Post no encontrado',
        });
      }
      return { post };
    },
  }),

  postsCreate: defineAction({
    input: z.object({
      titulo: z.string().min(1, 'Título requerido').max(100),
      contenido: z.string().min(1, 'Contenido requerido'),
    }),
    handler: async ({ titulo, contenido }) => {
      const post = createPost(titulo, contenido);
      return { ok: true, post };
    },
  }),

  postsUpdate: defineAction({
    input: z.object({
      id: z.string().min(1),
      titulo: z.string().min(1).max(100),
      contenido: z.string().min(1),
    }),
    handler: async ({ id, titulo, contenido }) => {
      const post = updatePost(id, titulo, contenido);
      if (!post) {
        throw new ActionError({
          code: 'NOT_FOUND',
          message: 'Post no encontrado',
        });
      }
      return { ok: true, post };
    },
  }),

  postsDelete: defineAction({
    input: z.object({
      id: z.string().min(1),
    }),
    handler: async ({ id }) => {
      const deleted = deletePost(id);
      if (!deleted) {
        throw new ActionError({
          code: 'NOT_FOUND',
          message: 'Post no encontrado',
        });
      }
      return { ok: true, deletedId: id };
    },
  }),
};
```

### Re-export from index.ts

```typescript
// src/actions/index.ts
import { postsActions } from './posts';

export const server = {
  ...postsActions, // Flattened: actions.postsList(), actions.postsCreate(), etc.
};
```

### Page with CRUD Operations

```astro
---
// src/pages/posts.astro
import Layout from '../layouts/Layout.astro';
---

<Layout title="Posts Manager">
  <main>
    <h1>Posts Manager</h1>

    <!-- Create Form -->
    <section>
      <h2>Create Post</h2>
      <form id="createForm">
        <input type="text" name="titulo" placeholder="Title" required />
        <textarea name="contenido" placeholder="Content" required></textarea>
        <button type="submit">Create</button>
      </form>
      <div id="createResult"></div>
    </section>

    <!-- Posts List -->
    <section>
      <h2>Posts (<span id="postCount">0</span>)</h2>
      <div id="postsList">Loading...</div>
    </section>
  </main>

  <script>
    import { actions } from 'astro:actions';

    const createForm = document.getElementById('createForm') as HTMLFormElement;
    const createResult = document.getElementById('createResult') as HTMLDivElement;
    const postsList = document.getElementById('postsList') as HTMLDivElement;
    const postCount = document.getElementById('postCount') as HTMLSpanElement;

    // Load and render posts
    async function loadPosts() {
      const { data, error } = await actions.postsList();

      if (error) {
        postsList.innerHTML = `<p class="error">Error: ${error.message}</p>`;
        return;
      }

      const posts = data.posts;
      postCount.textContent = String(posts.length);

      if (posts.length === 0) {
        postsList.innerHTML = '<p>No posts yet.</p>';
        return;
      }

      postsList.innerHTML = posts.map(post => `
        <article class="post" data-id="${post.id}">
          <h3>${post.titulo}</h3>
          <p>${post.contenido}</p>
          <button class="delete-btn" data-id="${post.id}">Delete</button>
        </article>
      `).join('');

      // Add delete handlers
      document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', handleDelete);
      });
    }

    // Create post
    createForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const formData = new FormData(createForm);
      const titulo = formData.get('titulo') as string;
      const contenido = formData.get('contenido') as string;

      createResult.innerHTML = '<p>Creating...</p>';

      const { data, error } = await actions.postsCreate({ titulo, contenido });

      if (error) {
        createResult.innerHTML = `<p class="error">${error.message}</p>`;
        return;
      }

      createResult.innerHTML = `<p class="success">Created: "${data.post.titulo}"</p>`;
      createForm.reset();

      // Reload list
      await loadPosts();

      // Clear message after 3s
      setTimeout(() => { createResult.innerHTML = ''; }, 3000);
    });

    // Delete post
    async function handleDelete(e: Event) {
      const btn = e.target as HTMLButtonElement;
      const id = btn.dataset.id!;

      if (!confirm('Delete this post?')) return;

      btn.disabled = true;
      btn.textContent = 'Deleting...';

      const { error } = await actions.postsDelete({ id });

      if (error) {
        alert(`Error: ${error.message}`);
        btn.disabled = false;
        btn.textContent = 'Delete';
        return;
      }

      // Reload list
      await loadPosts();
    }

    // Initial load
    loadPosts();
  </script>
</Layout>
```

---

## Error Handling

Always use `ActionError` for JavaScript actions:

```typescript
import { ActionError } from 'astro:actions';

handler: async ({ id }) => {
  const item = await findItem(id);

  if (!item) {
    throw new ActionError({
      code: 'NOT_FOUND',  // Standard HTTP-like code
      message: 'Item not found',
    });
  }

  return { item };
}
```

**Common error codes:**
- `BAD_REQUEST` - Invalid input
- `UNAUTHORIZED` - Not logged in
- `FORBIDDEN` - No permission
- `NOT_FOUND` - Resource doesn't exist
- `CONFLICT` - Duplicate or conflict
- `INTERNAL_SERVER_ERROR` - Server error

### Handling Errors in JavaScript

```javascript
const { data, error } = await actions.someAction({ ... });

if (error) {
  console.log(error.code);    // 'NOT_FOUND'
  console.log(error.message); // 'Item not found'

  // Show user-friendly message
  showError(error.message);
  return;
}

// Success - use data
showSuccess(data);
```

---

## Loading States

One of the main benefits of JavaScript actions is showing loading states:

```javascript
const btn = document.querySelector('button[type="submit"]') as HTMLButtonElement;
const originalText = btn.textContent;

// Disable and show loading
btn.disabled = true;
btn.textContent = 'Sending...';

try {
  const { data, error } = await actions.sendMessage({ ... });

  if (error) {
    showError(error.message);
  } else {
    showSuccess('Sent!');
  }
} finally {
  // Restore button
  btn.disabled = false;
  btn.textContent = originalText;
}
```

---

## TypeScript Tips

### Type the Form Elements

```typescript
const form = document.getElementById('myForm') as HTMLFormElement;
const input = document.getElementById('nombre') as HTMLInputElement;
const select = document.getElementById('category') as HTMLSelectElement;
const result = document.getElementById('resultado') as HTMLDivElement;
```

### Extract FormData Safely

```typescript
const formData = new FormData(form);
const nombre = formData.get('nombre') as string;
const email = formData.get('email') as string;
```

### Type the Response

```typescript
// The response is automatically typed based on your action's return type
const { data, error } = await actions.postsCreate({ titulo, contenido });

if (!error) {
  // data is typed: { ok: true, post: Post }
  console.log(data.post.titulo);
}
```

---

## Authentication with JavaScript Actions

Access cookies in the action handler via `context`:

```typescript
handler: async ({ data }, context) => {
  const token = context.cookies.get('session_token')?.value;

  if (!token) {
    throw new ActionError({
      code: 'UNAUTHORIZED',
      message: 'Session expired',
    });
  }

  // Use token for API calls
  const response = await fetch('https://api.backend.com/data', {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  if (response.status === 401) {
    context.cookies.delete('session_token', { path: '/' });
    throw new ActionError({
      code: 'UNAUTHORIZED',
      message: 'Session expired',
    });
  }

  return response.json();
}
```

---

## Checklist

When implementing JavaScript actions:

- [ ] Do NOT use `accept: 'form'` in action definition (JSON is default)
- [ ] Use `ActionError` for errors (not plain `Error`)
- [ ] Form has `id` but NO `action` attribute
- [ ] Add `e.preventDefault()` in submit handler
- [ ] Import actions: `import { actions } from 'astro:actions'`
- [ ] Handle `{ data, error }` response pattern
- [ ] Show loading states while waiting
- [ ] Reset form after successful submission
- [ ] Reload data lists after create/update/delete
- [ ] Consider TypeScript for better DX
