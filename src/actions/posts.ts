import { defineAction, ActionError } from 'astro:actions';
import { z } from 'astro/zod';
import { getAllPosts, getPostById, createPost, updatePost, deletePost } from '../lib/db';

export const posts = {
  // Listar todos los posts
  list: defineAction({
    handler: async () => {
      const posts = getAllPosts();
      return { posts };
    },
  }),

  // Obtener un post por ID
  get: defineAction({
    input: z.object({
      id: z.string().min(1, 'El ID es requerido'),
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

  // Crear un nuevo post (desde formulario)
  create: defineAction({
    accept: 'form',
    input: z.object({
      titulo: z.string().min(1, 'El título es requerido').max(100, 'Máximo 100 caracteres'),
      contenido: z.string().min(1, 'El contenido es requerido'),
    }),
    handler: async ({ titulo, contenido }) => {
      const post = createPost(titulo, contenido);
      return { ok: true, post };
    },
  }),

  // Actualizar un post existente (desde formulario)
  update: defineAction({
    accept: 'form',
    input: z.object({
      id: z.string().min(1, 'El ID es requerido'),
      titulo: z.string().min(1, 'El título es requerido').max(100, 'Máximo 100 caracteres'),
      contenido: z.string().min(1, 'El contenido es requerido'),
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

  // Eliminar un post (desde formulario con solo el ID)
  delete: defineAction({
    accept: 'form',
    input: z.object({
      id: z.string().min(1, 'El ID es requerido'),
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
