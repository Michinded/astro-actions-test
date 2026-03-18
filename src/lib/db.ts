// Base de datos simulada en memoria (se resetea al reiniciar el servidor)
// En producción usarías una BD real (PostgreSQL, MongoDB, etc.)

export interface Post {
  id: string;
  titulo: string;
  contenido: string;
  createdAt: Date;
  updatedAt: Date;
}

// "Base de datos" en memoria
const posts = new Map<string, Post>();

// Datos de ejemplo iniciales
posts.set('1', {
  id: '1',
  titulo: 'Primer post de ejemplo',
  contenido: 'Este es el contenido del primer post.',
  createdAt: new Date(),
  updatedAt: new Date(),
});

posts.set('2', {
  id: '2',
  titulo: 'Segundo post',
  contenido: 'Contenido del segundo post de prueba.',
  createdAt: new Date(),
  updatedAt: new Date(),
});

// Funciones CRUD
export function getAllPosts(): Post[] {
  return Array.from(posts.values()).sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );
}

export function getPostById(id: string): Post | undefined {
  return posts.get(id);
}

export function createPost(titulo: string, contenido: string): Post {
  const id = crypto.randomUUID();
  const now = new Date();
  const post: Post = {
    id,
    titulo,
    contenido,
    createdAt: now,
    updatedAt: now,
  };
  posts.set(id, post);
  return post;
}

export function updatePost(id: string, titulo: string, contenido: string): Post | null {
  const existing = posts.get(id);
  if (!existing) return null;

  const updated: Post = {
    ...existing,
    titulo,
    contenido,
    updatedAt: new Date(),
  };
  posts.set(id, updated);
  return updated;
}

export function deletePost(id: string): boolean {
  return posts.delete(id);
}
