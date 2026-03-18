import { defineAction, ActionError } from 'astro:actions';
import { z } from 'astro/zod';
import { findUser, createSession, destroySession } from '../lib/auth';
import { AUTH_COOKIE, mockBackendLogin, mockBackendRequest } from '../lib/api';
import { postsActions } from './posts';

export const server = {
  // ==================== POSTS CRUD ====================
  ...postsActions,

  // ==================== APP (Con Middleware) ====================

  appLogin: defineAction({
    accept: 'form',
    input: z.object({
      username: z.string().min(1, 'El usuario es requerido'),
      password: z.string().min(1, 'La contraseña es requerida'),
    }),
    handler: async ({ username, password }, context) => {
      // Llamar al "backend" para login
      const result = await mockBackendLogin(username, password);

      if (!result.success) {
        throw new ActionError({
          code: 'UNAUTHORIZED',
          message: result.error,
        });
      }

      // Guardar token en cookie (el backend nos dice cuánto dura)
      context.cookies.set(AUTH_COOKIE.name, result.token, AUTH_COOKIE.options);

      return { ok: true, user: result.user };
    },
  }),

  appLogout: defineAction({
    accept: 'form',
    handler: async (_, context) => {
      context.cookies.delete(AUTH_COOKIE.name, { path: '/' });
      return { ok: true };
    },
  }),

  appSubmitData: defineAction({
    input: z.object({
      mensaje: z.string().min(1, 'El mensaje es requerido'),
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

      // Llamar al "backend" con el token
      const result = await mockBackendRequest(token, '/api/data/submit');

      // Si el backend dice 401, la sesión expiró
      if (result.status === 401) {
        context.cookies.delete(AUTH_COOKIE.name, { path: '/' });
        throw new ActionError({
          code: 'UNAUTHORIZED',
          message: 'SESSION_EXPIRED',
        });
      }

      if (result.status !== 200) {
        throw new ActionError({
          code: 'BAD_REQUEST',
          message: result.error || 'Error del servidor',
        });
      }

      return {
        ok: true,
        mensaje,
        backendResponse: result.data,
      };
    },
  }),
  // ==================== AUTH ====================

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

      createSession(context.cookies, user);

      return { ok: true, user: { nombre: user.nombre, username: user.username } };
    },
  }),

  logout: defineAction({
    handler: async (_, context) => {
      destroySession(context.cookies);
      return { ok: true };
    },
  }),

  // ==================== FORMULARIOS ====================
  // Action básica (form POST sin JS)
  enviarAApi: defineAction({
    accept: 'form',
    input: z.object({
      nombre: z.string().min(1, 'El nombre es requerido'),
      mensaje: z.string().min(1, 'El mensaje es requerido'),
    }),
    handler: async ({ nombre, mensaje }) => {
      // API pública de prueba (no persiste realmente, pero responde)
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

      // Devuelve algo pequeño y útil para pintar en UI
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

  // Action para usar con JavaScript (accept: 'json' por defecto)
  enviarConJs: defineAction({
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
        throw new ActionError({
          code: 'BAD_REQUEST',
          message: `API respondió con status ${res.status}`,
        });
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
