import type { AstroCookies } from 'astro';
import { COOKIES, secureCookieOptions } from './cookies';
import users from '../data/users.json';

export interface User {
  id: string;
  username: string;
  nombre: string;
  email: string;
}

interface UserWithPassword extends User {
  password: string;
}

// Almacén de sesiones en memoria (en producción sería Redis/DB)
const sessions = new Map<string, User>();

/**
 * Genera un token simulado (en producción sería JWT)
 */
export function generateToken(): string {
  return crypto.randomUUID();
}

/**
 * Busca un usuario por username y password
 */
export function findUser(username: string, password: string): User | null {
  const user = (users as UserWithPassword[]).find(
    (u) => u.username === username && u.password === password
  );

  if (!user) return null;

  // Retornamos sin el password
  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

/**
 * Crea una sesión para el usuario
 */
export function createSession(cookies: AstroCookies, user: User): string {
  const token = generateToken();

  // Guardar en memoria del servidor
  sessions.set(token, user);

  // Cookie de sesión (httpOnly, segura)
  cookies.set(COOKIES.SESSION.name, token, COOKIES.SESSION.options);

  // Cookie con datos de usuario para UI (accesible desde JS)
  cookies.set(
    COOKIES.USER_DATA.name,
    JSON.stringify({ nombre: user.nombre, username: user.username }),
    COOKIES.USER_DATA.options
  );

  return token;
}

/**
 * Obtiene el usuario de la sesión actual
 */
export function getSession(cookies: AstroCookies): User | null {
  const token = cookies.get(COOKIES.SESSION.name)?.value;
  if (!token) return null;

  return sessions.get(token) || null;
}

/**
 * Verifica si hay una sesión activa
 */
export function isAuthenticated(cookies: AstroCookies): boolean {
  return getSession(cookies) !== null;
}

/**
 * Cierra la sesión
 */
export function destroySession(cookies: AstroCookies): void {
  const token = cookies.get(COOKIES.SESSION.name)?.value;

  if (token) {
    sessions.delete(token);
  }

  cookies.delete(COOKIES.SESSION.name, { path: '/' });
  cookies.delete(COOKIES.USER_DATA.name, { path: '/' });
}
