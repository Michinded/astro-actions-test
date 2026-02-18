import type { AstroCookies } from 'astro';

/**
 * Opciones base para cookies seguras
 */
export const secureCookieOptions = {
  path: '/',
  httpOnly: true,
  sameSite: 'strict' as const,
  secure: import.meta.env.PROD,
};

/**
 * Configuración de cookies de la aplicación
 */
export const COOKIES = {
  // Cookie de sesión (auth token)
  SESSION: {
    name: 'session_token',
    options: {
      ...secureCookieOptions,
      maxAge: 60 * 60 * 24, // 24 horas
    },
  },
  // Cookie para datos de usuario (no sensibles, para UI)
  USER_DATA: {
    name: 'user_data',
    options: {
      ...secureCookieOptions,
      httpOnly: false, // Accesible desde JS para localStorage
      maxAge: 60 * 60 * 24,
    },
  },
  // Cookie temporal para resultados de actions
  ACTION_RESULT: {
    name: 'action_result',
    options: {
      ...secureCookieOptions,
      maxAge: 60, // 1 minuto
    },
  },
} as const;

/**
 * Helper para guardar resultado de action en cookie
 */
export function setActionResult(cookies: AstroCookies, data: unknown): void {
  cookies.set(
    COOKIES.ACTION_RESULT.name,
    JSON.stringify(data),
    COOKIES.ACTION_RESULT.options
  );
}

/**
 * Helper para leer y eliminar resultado de action
 */
export function getActionResult<T>(cookies: AstroCookies): T | null {
  const cookie = cookies.get(COOKIES.ACTION_RESULT.name);
  if (!cookie) return null;

  const data = JSON.parse(cookie.value) as T;
  cookies.delete(COOKIES.ACTION_RESULT.name, { path: '/' });
  return data;
}
