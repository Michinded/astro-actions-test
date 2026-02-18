import { defineAction, ActionError } from 'astro:actions';
import { z } from 'astro/zod';

export const server = {
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
