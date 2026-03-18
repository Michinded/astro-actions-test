import { defineMiddleware, sequence } from 'astro:middleware';
import { AUTH_COOKIE, decodeJWT } from './lib/api';

// ============================================================
// MIDDLEWARE 1: Wednesday Check (para rutas /wednesday/*)
// ============================================================
const wednesdayCheck = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  // Solo aplicar a rutas /wednesday/*
  if (!pathname.startsWith('/wednesday')) {
    return next();
  }

  // Permitir acceso a las páginas de resultado sin re-validar
  if (pathname === '/wednesday/itswednesday' || pathname === '/wednesday/no-access') {
    return next();
  }

  // Verificar si hoy es miércoles (0=Domingo, 1=Lunes, ..., 3=Miércoles)
  const today = new Date();
  const dayOfWeek = today.getDay();
  const isWednesday = dayOfWeek === 3;

  // Pasar info del día a las páginas via locals
  context.locals.dayOfWeek = dayOfWeek;
  context.locals.isWednesday = isWednesday;

  if (isWednesday) {
    // Es miércoles → permitir acceso o redirigir a página especial
    return context.redirect('/wednesday/itswednesday');
  } else {
    // No es miércoles → redirigir a no-access
    return context.redirect('/wednesday/no-access');
  }
});

// ============================================================
// MIDDLEWARE 2: Auth Check (para rutas /app/*)
// ============================================================
const authCheck = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  // Solo procesar rutas /app/*
  if (!pathname.startsWith('/app')) {
    return next();
  }

  // Rutas públicas dentro de /app
  const publicAppRoutes = ['/app/login'];

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
    return context.redirect('/app/login');
  }

  // Decodificar token para obtener datos del usuario
  const payload = decodeJWT(token);

  if (!payload) {
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

// ============================================================
// MIDDLEWARE 3: Logging (opcional, para debug)
// ============================================================
const logging = defineMiddleware(async (context, next) => {
  const start = Date.now();
  const response = await next();
  const duration = Date.now() - start;

  console.log(`[${new Date().toISOString()}] ${context.request.method} ${context.url.pathname} - ${duration}ms`);

  return response;
});

// ============================================================
// COMBINAR MIDDLEWARES CON sequence()
// ============================================================
// El orden importa: se ejecutan de izquierda a derecha
export const onRequest = sequence(
  logging,        // 1. Log de todas las requests
  wednesdayCheck, // 2. Verificar si es miércoles (para /wednesday/*)
  authCheck       // 3. Verificar autenticación (para /app/*)
);
