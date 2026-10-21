# Contratos de API - Eco_Ruta

Todas las comunicaciones se realizan vía HTTP REST utilizando JSON.

## Convenciones Globales

- Prefijo base: `/api`
- Header de Autenticación: `Authorization: Bearer <access_token>`
- Respuestas de error estandarizadas:
```json
{
  "error": "Mensaje descriptivo del error",
  "code": "CODIGO_ERROR_SEMANTICO",
  "details": {}
}
```

## Endpoints Previstos

### 1. Sistema & Salud
- `GET /api/health`: Estado de disponibilidad del servicio API.

### 2. Autenticación (`/api/auth`)
- `POST /api/auth/register`: Registro de nuevos usuarios ciudadanos.
- `POST /api/auth/login`: Autenticación con email y contraseña. Retorna token de acceso en JSON y refresh token en cookie `httpOnly`.
- `POST /api/auth/refresh`: Renovación del access token mediante la cookie de refresh token.
- `POST /api/auth/logout`: Revocación y limpieza de la cookie de sesión.

### 3. Puntos de Reciclaje (`/api/puntos`)
- `GET /api/puntos`: Lista pública de puntos de reciclaje activos (soporta filtros por tipo de residuo y cercanía geográfica).
- `POST /api/puntos`: Creación de un punto (requiere rol `ADMIN`).

### 4. Rutas (`/api/rutas`)
- `GET /api/rutas`: Consulta de rutas (recolectores ven sus asignadas, admins ven todas, ciudadanos ven rutas públicas programadas).
- `POST /api/rutas`: Creación y planificación de rutas (requiere rol `ADMIN`).

### 5. Recolecciones (`/api/recolecciones`)
- `PATCH /api/recolecciones/:id/status`: Actualización de estado (`PENDIENTE`, `EN_PROCESO`, `COMPLETADA`) por parte del recolector asignado.

### 6. Reportes Ciudadanos (`/api/reportes`)
- `POST /api/reportes`: Creación de reporte de acumulación o punto nuevo por un ciudadano.
- `GET /api/reportes`: Consulta de reportes (propios del ciudadano o todos para admins).
