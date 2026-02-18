import type { AstroCookies } from 'astro';

/**
 * Configuración de la cookie de autenticación
 */
export const AUTH_COOKIE = {
  name: 'app_auth_token',
  options: {
    path: '/',
    httpOnly: true,
    sameSite: 'strict' as const,
    secure: import.meta.env.PROD,
    maxAge: 60 * 10, // 10 minutos
  },
};

/**
 * Simula un JWT (en producción sería el token real del backend)
 */
export function generateMockJWT(userId: string, username: string): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({
    sub: userId,
    username,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (60 * 10), // 10 minutos
  }));
  const signature = btoa(`mock-signature-${userId}`);

  return `${header}.${payload}.${signature}`;
}

/**
 * Decodifica el payload de un JWT (sin verificar firma)
 */
export function decodeJWT(token: string): Record<string, unknown> | null {
  try {
    const [, payload] = token.split('.');
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

/**
 * Verifica si el JWT ha expirado (simulado)
 */
export function isTokenExpired(token: string): boolean {
  const payload = decodeJWT(token);
  if (!payload || typeof payload.exp !== 'number') return true;

  return payload.exp < Math.floor(Date.now() / 1000);
}

/**
 * Usuarios mock (simula base de datos del backend)
 */
const mockUsers = [
  { id: '1', username: 'demo', password: 'demo123', nombre: 'Usuario Demo' },
  { id: '2', username: 'test', password: 'test123', nombre: 'Usuario Test' },
];

/**
 * Simula llamada al backend para login
 */
export async function mockBackendLogin(
  username: string,
  password: string
): Promise<{ success: true; token: string; user: { id: string; nombre: string } } | { success: false; error: string }> {
  // Simular latencia de red
  await new Promise(resolve => setTimeout(resolve, 500));

  const user = mockUsers.find(u => u.username === username && u.password === password);

  if (!user) {
    return { success: false, error: 'Credenciales inválidas' };
  }

  const token = generateMockJWT(user.id, user.username);

  return {
    success: true,
    token,
    user: { id: user.id, nombre: user.nombre },
  };
}

/**
 * Simula llamada al backend que requiere auth
 * Retorna 401 si el token está expirado
 */
export async function mockBackendRequest(
  token: string,
  endpoint: string
): Promise<{ status: number; data?: unknown; error?: string }> {
  // Simular latencia de red
  await new Promise(resolve => setTimeout(resolve, 300));

  // Verificar token
  if (isTokenExpired(token)) {
    return { status: 401, error: 'Token expirado' };
  }

  const payload = decodeJWT(token);
  if (!payload) {
    return { status: 401, error: 'Token inválido' };
  }

  // Simular diferentes endpoints
  if (endpoint === '/api/user/profile') {
    const user = mockUsers.find(u => u.id === payload.sub);
    return {
      status: 200,
      data: {
        id: user?.id,
        nombre: user?.nombre,
        username: user?.username,
      },
    };
  }

  if (endpoint === '/api/data/submit') {
    return {
      status: 200,
      data: {
        received: true,
        timestamp: new Date().toISOString(),
        processedBy: 'mock-backend',
      },
    };
  }

  return { status: 404, error: 'Endpoint no encontrado' };
}

/**
 * Helper para manejar respuestas 401 en actions
 */
export function handle401(cookies: AstroCookies): never {
  cookies.delete(AUTH_COOKIE.name, { path: '/' });
  throw new Error('SESSION_EXPIRED');
}
