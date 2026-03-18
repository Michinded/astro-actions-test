import { defineMiddleware } from 'astro:middleware';
import { AUTH_COOKIE, decodeJWT } from './lib/api';

// Rutas públicas dentro de /app
const publicAppRoutes = ['/app/login'];

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  // Solo procesar rutas /app/*
  if (!pathname.startsWith('/app')) {
    return next();
  }

  // Rutas públicas de /app
  if (publicAppRoutes.includes(pathname)) {
    // Si ya tiene token válido en login, redirigir a dashboard
    const token = context.cookies.get(AUTH_COOKIE.name)?.value;
    if (token && pathname === '/app/login') {
      return context.redirect('/app/dashboard');
    }
    return next();
  }

  // Rutas protegidas: verificar cookie
  const token = context.cookies.get(AUTH_COOKIE.name)?.value;

  if (!token) {
    // Sin token → login
    return context.redirect('/app/login');
  }

  // Decodificar token para obtener datos del usuario
  // NOTA: En producción, aquí se validaría el token contra el backend
  // o se verificaría la expiración con isTokenExpired(token).
  // En este ejemplo, la cookie expira automáticamente (maxAge en AUTH_COOKIE).
  const payload = decodeJWT(token);

  if (!payload) {
    // Token malformado → limpiar y login
    context.cookies.delete(AUTH_COOKIE.name, { path: '/' });
    return context.redirect('/app/login');
  }

  // Pasar token y datos del usuario a las páginas
  context.locals.token = token;
  context.locals.user = {
    id: payload.sub as string,
    username: payload.username as string,
  };

  return next();
});
