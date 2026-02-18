# Astro Actions - Ejemplo Práctico

Proyecto de aprendizaje y experimentación con **Astro Actions**, cookies seguras, autenticación y middleware.

> **Nota:** Este proyecto es una base para aprender y experimentar. Aunque implementa patrones sólidos y seguros, siempre debe adaptarse a las reglas de negocio específicas de cada aplicación.

## Requisitos

- Node.js 18+
- pnpm (recomendado) o npm

## Instalación

```bash
# Clonar el repositorio
git clone <url-del-repo>
cd astro-actions-test

# Instalar dependencias
pnpm install
```

## Ejecución

```bash
# Desarrollo (con hot reload)
pnpm dev

# Compilar para producción
pnpm build

# Previsualizar build de producción
pnpm preview

# Ejecutar build en Node.js
node ./dist/server/entry.mjs
```

El servidor de desarrollo estará disponible en `http://localhost:4321`

## Contenido del Proyecto

Este proyecto demuestra diferentes aspectos de Astro Actions y autenticación:

### Rutas Disponibles

| Ruta | Descripción |
|------|-------------|
| `/` | Form POST básico (requiere auth) |
| `/con-redirect` | Form con redirect para URL limpia |
| `/con-js` | Form con JavaScript (sin recargar página) |
| `/login` | Login para las rutas anteriores |
| `/home` | Landing del ejemplo con middleware |
| `/app/login` | Login con JWT simulado |
| `/app/dashboard` | Dashboard protegido con middleware |

### Usuarios de Prueba

**Para `/login` (auth básica):**
| Usuario | Contraseña |
|---------|------------|
| admin | admin123 |
| maria | maria123 |
| juan | juan123 |

**Para `/app/login` (con middleware):**
| Usuario | Contraseña |
|---------|------------|
| demo | demo123 |
| test | test123 |

## Características Implementadas

### 1. Tipos de Astro Actions

- **Form POST:** Envío nativo del navegador, funciona sin JavaScript
- **Con Redirect:** Patrón POST-Redirect-GET para URLs limpias
- **Con JavaScript:** Envío asíncrono sin recargar la página

### 2. Cookies Seguras

```typescript
{
  httpOnly: true,      // No accesible desde JavaScript
  sameSite: 'strict',  // Solo requests del mismo sitio
  secure: true,        // Solo HTTPS (en producción)
}
```

### 3. Autenticación

- **Básica:** Sesiones en memoria con Map (para aprendizaje)
- **Con Middleware:** JWT simulado en cookies, validación en backend

### 4. Middleware

Protección centralizada de rutas `/app/*` con verificación de token.

### 5. Organización de Actions

Ejemplo de cómo dividir actions en múltiples archivos por dominio.

## Estructura del Proyecto

```
src/
├── actions/
│   └── index.ts          # Definición de todas las actions
├── lib/
│   ├── cookies.ts        # Utilidades para cookies seguras
│   ├── auth.ts           # Autenticación básica
│   └── api.ts            # Mock de backend + JWT
├── layouts/
│   ├── MainLayout.astro  # Layout para auth básica
│   └── AppLayout.astro   # Layout para middleware
├── middleware.ts         # Protección de rutas /app/*
├── env.d.ts              # Tipos para Astro.locals
└── pages/
    ├── index.astro       # Form POST
    ├── con-redirect.astro
    ├── con-js.astro
    ├── login.astro
    ├── home.astro        # Landing middleware
    └── app/
        ├── login.astro   # Login con JWT
        └── dashboard.astro
```

## Documentación

La documentación detallada está en la carpeta `docs/`:

| Documento | Contenido |
|-----------|-----------|
| [01-fundamentos.md](./docs/01-fundamentos.md) | Cookies, autenticación, seguridad |
| [02-tipos-de-actions.md](./docs/02-tipos-de-actions.md) | Form POST, Redirect, JavaScript |
| [03-middleware-jwt.md](./docs/03-middleware-jwt.md) | Middleware, JWT, backend externo |
| [04-organizacion-actions.md](./docs/04-organizacion-actions.md) | Dividir actions en archivos |

## Consideraciones para Producción

Este proyecto es una base de aprendizaje. Para producción, considera:

| Aspecto | En este proyecto | En producción |
|---------|------------------|---------------|
| Sesiones | Map en memoria | Redis / Base de datos |
| Tokens | UUID / JWT simulado | JWT firmado (RS256/HS256) |
| Passwords | Texto plano (mock) | bcrypt / argon2 |
| Validación | En cada página | Middleware centralizado |
| Rate limiting | No implementado | Implementar |
| HTTPS | Solo en producción | Siempre |

## Tecnologías

- [Astro 5](https://astro.build/) - Framework web
- [@astrojs/node](https://docs.astro.build/en/guides/integrations-guide/node/) - Adaptador Node.js
- [Zod](https://zod.dev/) - Validación de esquemas
- TypeScript

## Recursos

- [Documentación de Astro](https://docs.astro.build)
- [Astro Actions](https://docs.astro.build/en/guides/actions/)
- [Astro Middleware](https://docs.astro.build/en/guides/middleware/)
- [Astro Cookies](https://docs.astro.build/en/reference/api-reference/#astrocookies)

## Licencia

MIT - Libre para uso, modificación y distribución.
