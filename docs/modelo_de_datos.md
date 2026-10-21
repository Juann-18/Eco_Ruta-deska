# Modelo de Datos - EcoRuta

El almacenamiento relacional de **EcoRuta** está respaldado por PostgreSQL y gestionado a través de **Prisma ORM**. El diseño satisface los requerimientos visuales y operativos de los dos actores principales: **Ciudadanos** y **Recolectores / Cuadrillas de Aseo**.

---

## 1. Diagrama Entidad-Relación (MER)

```mermaid
erDiagram
    USER ||--o{ CITIZEN_REPORT : "crea"
    USER ||--o{ NOTIFICATION : "recibe"
    USER ||--o{ ROUTE_ASSIGNMENT : "opera (rol RECOLECTOR)"
    USER ||--o{ COMPANY : "administra / pertenece (opcional)"

    COMPANY ||--o{ VEHICLE : "posee"
    COMPANY ||--o{ ROUTE : "opera"
    COMPANY ||--o{ RECYCLE_POINT : "mantiene/recolecta"

    VEHICLE ||--o{ ROUTE : "asignado_a"

    ROUTE ||--o{ ROUTE_ASSIGNMENT : "tiene_recolectores"
    ROUTE ||--o{ COLLECTION : "contiene_paradas"

    RECYCLE_POINT ||--o{ COLLECTION : "es_visitado_en"
    RECYCLE_POINT ||--o{ CITIZEN_REPORT : "es_reportado_en"

    COLLECTION ||--o{ ROUTE_INCIDENT : "registra_problema"

    USER {
        uuid id PK
        string email UK
        string passwordHash
        string name
        string phone
        enum role "CIUDADANO, RECOLECTOR, ADMIN"
        int comuna "1 a 6"
        string avatarUrl
        uuid companyId FK "Nullable"
        datetime createdAt
        datetime updatedAt
    }

    COMPANY {
        uuid id PK
        string name
        string nit UK
        string phone
        string address
        string description
        float rating "ej. 4.5"
        int completedRoutes "ej. 320"
        boolean isVerified
        enum status "PENDIENTE, APROBADA, RECHAZADA"
        string_array wasteTypes "['plastico', 'vidrio']"
        int_array coveredComunas "[1, 2, 3]"
        datetime createdAt
        datetime updatedAt
    }

    VEHICLE {
        uuid id PK
        uuid companyId FK
        string plate UK "ej. TUL-482"
        string model
        float maxCapacityKg "ej. 5000.0"
        boolean isActive
        datetime createdAt
        datetime updatedAt
    }

    RECYCLE_POINT {
        uuid id PK
        uuid companyId FK "Empresa asignada"
        string code UK "ej. #CNT-0001"
        string name
        string address
        int comuna "1 a 6"
        float latitude
        float longitude
        string wasteType "PAPEL_CARTON, VIDRIO, PLASTICO, METAL, ESCOMBRO"
        float capacityKg "ej. 100.0"
        float currentFillPercentage "ej. 95.0%"
        boolean isActive
        datetime lastEmptiedAt
        datetime createdAt
        datetime updatedAt
    }

    ROUTE {
        uuid id PK
        uuid companyId FK
        uuid vehicleId FK "Nullable"
        string code UK "ej. #RTA-0012"
        string name
        int comuna "1 a 6"
        datetime scheduledDate
        string startTime "ej. 17:00"
        string endTime "ej. 19:00"
        float currentLoadKg "ej. 3600.0"
        float maxCapacityKg "ej. 5000.0"
        enum status "PROGRAMADA, EN_CAMINO, FINALIZADA, CANCELADA"
        datetime startedAt
        datetime completedAt
        datetime createdAt
        datetime updatedAt
    }

    ROUTE_ASSIGNMENT {
        uuid id PK
        uuid routeId FK
        uuid userId FK "Usuario RECOLECTOR"
        datetime assignedAt
    }

    COLLECTION {
        uuid id PK
        uuid routeId FK
        uuid recyclePointId FK
        int order "Secuencia 1..N"
        enum status "PENDIENTE, EN_PROCESO, COMPLETADA, OMITIDA"
        float collectedWeightKg "Peso recogido en parada"
        datetime collectedAt
        string notes
        datetime createdAt
        datetime updatedAt
    }

    CITIZEN_REPORT {
        uuid id PK
        uuid userId FK
        uuid recyclePointId FK "Contenedor afectado (Nullable)"
        string folio UK "ej. #RP-0231"
        enum reason "LLENO, DANADO, MAL_OLOR, RESIDUOS_FUERA, NO_PASO_CAMION, OTRO"
        string description
        string imageUrl
        float latitude
        float longitude
        string address
        enum status "PENDIENTE, EN_REVISION, RESUELTO, DESCARTADO"
        datetime resolvedAt
        datetime createdAt
        datetime updatedAt
    }

    ROUTE_INCIDENT {
        uuid id PK
        uuid collectionId FK
        uuid reportedByUserId FK "Recolector"
        string reason
        string description
        string photoUrl
        datetime createdAt
    }

    NOTIFICATION {
        uuid id PK
        uuid userId FK "Nullable si es broadcast"
        int comuna "Nullable si es global"
        string title
        string message
        string type
        boolean isRead
        datetime createdAt
    }
```

---

## 2. Tipos Enumerados (Enums)

### 2.1 `UserRole`
- `CIUDADANO`: Usuario general que consulta horarios, separa residuos y emite reportes.
- `RECOLECTOR`: Operador o conductor de cuadrilla que atiende las paradas en ruta.
- `ADMIN`: Administrador de la plataforma o supervisor municipal de servicios públicos.

### 2.2 `WasteType`
- `PAPEL_CARTON`: Periódicos, revistas, cajas de cartón, hojas de oficina, cuadernos.
- `VIDRIO`: Botellas, frascos limpios.
- `PLASTICO`: Botellas PET, envases plásticos limpios y secos.
- `METAL`: Latas de aluminio, conservas, ganchos y clips.
- `ESCOMBRO`: Residuos de construcción y reformas menores domiciliarias.
- `ORGANICO`: Restos de comida y podas (para rutas orgánicas municipales).

### 2.3 `RouteStatus`
- `PROGRAMADA`: Ruta agendada en calendario previo a su inicio.
- `EN_CAMINO`: Camión en desplazamiento activo transmitiendo telemetría en tiempo real.
- `FINALIZADA`: Todas las paradas completadas y turno cerrado.
- `CANCELADA`: Ruta suspendida por fuerza mayor o mantenimiento vial.

### 2.4 `CollectionStatus`
- `PENDIENTE`: Parada aún no visitada en la secuencia.
- `EN_PROCESO`: Camión estacionado en el punto realizando vaciado.
- `COMPLETADA`: Contenedor vaciado y peso registrado con éxito.
- `OMITIDA`: Parada no recolectada debido a una incidencia reportada.

### 2.5 `CitizenReportReason`
- `CONTENEDOR_LLENO`: Nivel de llenado desbordado (> 90%).
- `DANADO`: Contenedor roto, sin tapa, con fisuras o vandalizado.
- `MAL_OLOR`: Lixiviados o descomposición excesiva en el punto.
- `RESIDUOS_FUERA`: Acumulación de basura en la vía pública alrededor del contenedor.
- `CAMION_NO_PASO`: El vehículo de recolección no cumplió el horario publicado.
- `OTRO`: Otras observaciones del ciudadano.

### 2.6 `CitizenReportStatus`
- `PENDIENTE`: Reporte radicado con folio pendiente de revisión.
- `EN_REVISION`: Empresa de aseo o supervisor municipal analizando la queja.
- `RESUELTO`: Cuadrilla atendió el incidente y vació/reparó el punto.
- `DESCARTADO`: Reporte duplicado o falsa alarma.

### 2.7 `CompanyStatus`
- `PENDIENTE`: Solicitud de registro B2B ingresada por formulario.
- `APROBADA`: Empresa verificada con NIT validado y activa en el directorio.
- `RECHAZADA`: Solicitud descartada por inconsistencia de datos o permisos.

---

## 3. Entidades Detalladas y Restricciones

### 1. `User` (Usuarios del Sistema)
- **id**: `UUID` (PK, `gen_random_uuid()`).
- **email**: `VARCHAR(255)` (Unique, Index).
- **passwordHash**: `VARCHAR(255)` (Argon2id o bcrypt).
- **name**: `VARCHAR(150)`.
- **phone**: `VARCHAR(30)` (Nullable).
- **role**: `UserRole` (Default `CIUDADANO`).
- **comuna**: `SMALLINT` (Nullable, rango 1 a 6 según división político-administrativa de Tuluá).
- **avatarUrl**: `TEXT` (Nullable).
- **companyId**: `UUID` (Nullable, FK -> `Company.id` para usuarios con rol `RECOLECTOR` o delegados corporativos).
- **createdAt**: `TIMESTAMPTZ` (Default `now()`).
- **updatedAt**: `TIMESTAMPTZ` (Auto-updated).

### 2. `Company` (Empresas Recolectoras y Operadoras)
- **id**: `UUID` (PK).
- **name**: `VARCHAR(150)` (ej. *"EcoAseo Tuluá"*).
- **nit**: `VARCHAR(30)` (Unique, ej. *"900.123.456-7"*).
- **phone**: `VARCHAR(30)`.
- **address**: `VARCHAR(255)` (Nullable).
- **description**: `TEXT` (Nullable, ej. *"Aseo urbano y reciclaje"*).
- **rating**: `DECIMAL(3, 2)` (Default `5.00`, rango `0.00` a `5.00`).
- **completedRoutes**: `INTEGER` (Default `0`).
- **isVerified**: `BOOLEAN` (Default `false`).
- **status**: `CompanyStatus` (Default `PENDIENTE`).
- **wasteTypes**: `TEXT[]` (Array de residuos autorizados, ej. `['PAPEL_CARTON', 'VIDRIO', 'PLASTICO']`).
- **coveredComunas**: `INTEGER[]` (Array de comunas que cubre, ej. `[1, 2, 3, 4, 5, 6]`).
- **createdAt**: `TIMESTAMPTZ`.
- **updatedAt**: `TIMESTAMPTZ`.

### 3. `Vehicle` (Flota de Camiones Recolectores)
- **id**: `UUID` (PK).
- **companyId**: `UUID` (FK -> `Company.id`, OnDelete `CASCADE`).
- **plate**: `VARCHAR(15)` (Unique, ej. *"TUL-482"*).
- **model**: `VARCHAR(100)` (Nullable).
- **maxCapacityKg**: `DECIMAL(8, 2)` (Default `5000.00`).
- **isActive**: `BOOLEAN` (Default `true`).
- **createdAt**: `TIMESTAMPTZ`.
- **updatedAt**: `TIMESTAMPTZ`.

### 4. `RecyclePoint` (Puntos de Reciclaje / Contenedores Públicos)
- **id**: `UUID` (PK).
- **companyId**: `UUID` (FK -> `Company.id`, Nullable, empresa que realiza el vaciado).
- **code**: `VARCHAR(20)` (Unique, Index, ej. `"#CNT-0001"`).
- **name**: `VARCHAR(150)`.
- **address**: `VARCHAR(255)`.
- **comuna**: `SMALLINT` (Index, 1 a 6).
- **latitude**: `DECIMAL(10, 8)` (Coordenada GPS WGS84).
- **longitude**: `DECIMAL(11, 8)` (Coordenada GPS WGS84).
- **wasteType**: `WasteType` (Tipo de residuo específico que admite).
- **capacityKg**: `DECIMAL(7, 2)` (Capacidad nominal, ej. `100.00`).
- **currentFillPercentage**: `DECIMAL(5, 2)` (Default `0.00`, 0% a 100%).
- **isActive**: `BOOLEAN` (Default `true`, Index).
- **lastEmptiedAt**: `TIMESTAMPTZ` (Nullable).
- **createdAt**: `TIMESTAMPTZ`.
- **updatedAt**: `TIMESTAMPTZ`.

### 5. `Route` (Rutas de Recolección Programadas y Activas)
- **id**: `UUID` (PK).
- **companyId**: `UUID` (FK -> `Company.id`, OnDelete `RESTRICT`).
- **vehicleId**: `UUID` (Nullable, FK -> `Vehicle.id`, OnDelete `SET NULL`).
- **code**: `VARCHAR(20)` (Unique, Index, ej. `"#RTA-0012"`).
- **name**: `VARCHAR(150)` (ej. *"Ruta Matutina Comuna 1"*).
- **comuna**: `SMALLINT` (Index).
- **scheduledDate**: `DATE` (Fecha asignada de ejecución).
- **startTime**: `VARCHAR(10)` (ej. *"17:00"*).
- **endTime**: `VARCHAR(10)` (ej. *"19:00"*).
- **currentLoadKg**: `DECIMAL(8, 2)` (Default `0.00`, peso cargado en vivo).
- **maxCapacityKg**: `DECIMAL(8, 2)` (Capacidad límite del camión en ruta).
- **status**: `RouteStatus` (Default `PROGRAMADA`, Index).
- **startedAt**: `TIMESTAMPTZ` (Nullable).
- **completedAt**: `TIMESTAMPTZ` (Nullable).
- **createdAt**: `TIMESTAMPTZ`.
- **updatedAt**: `TIMESTAMPTZ`.

### 6. `RouteAssignment` (Asignación de Operarios a Rutas)
- **id**: `UUID` (PK).
- **routeId**: `UUID` (FK -> `Route.id`, OnDelete `CASCADE`).
- **userId**: `UUID` (FK -> `User.id`, OnDelete `CASCADE`, usuario con rol `RECOLECTOR`).
- **assignedAt**: `TIMESTAMPTZ` (Default `now()`).
- *Constraint*: `Unique(routeId, userId)`.

### 7. `Collection` (Paradas en Ruta / Tareas de Vaciado)
- **id**: `UUID` (PK).
- **routeId**: `UUID` (FK -> `Route.id`, OnDelete `CASCADE`).
- **recyclePointId**: `UUID` (FK -> `RecyclePoint.id`, OnDelete `RESTRICT`).
- **order**: `INTEGER` (Secuencia de parada en el itinerario 1..N).
- **status**: `CollectionStatus` (Default `PENDIENTE`, Index).
- **collectedWeightKg**: `DECIMAL(7, 2)` (Nullable, peso real recolectado).
- **collectedAt**: `TIMESTAMPTZ` (Nullable, timestamp del vaciado).
- **notes**: `TEXT` (Nullable).
- **createdAt**: `TIMESTAMPTZ`.
- **updatedAt**: `TIMESTAMPTZ`.
- *Constraint*: `Unique(routeId, recyclePointId)`.

### 8. `CitizenReport` (Reportes Ciudadanos de Incidencias)
- **id**: `UUID` (PK).
- **userId**: `UUID` (FK -> `User.id`, OnDelete `SET NULL`).
- **recyclePointId**: `UUID` (Nullable, FK -> `RecyclePoint.id`, OnDelete `SET NULL`).
- **folio**: `VARCHAR(20)` (Unique, Index, ej. `"#RP-0231"`).
- **reason**: `CitizenReportReason` (Causa estandarizada de la queja).
- **description**: `TEXT`.
- **imageUrl**: `TEXT` (Nullable, URL en bucket S3/local).
- **latitude**: `DECIMAL(10, 8)` (Nullable si se selecciona contenedor).
- **longitude**: `DECIMAL(11, 8)` (Nullable si se selecciona contenedor).
- **address**: `VARCHAR(255)` (Nullable).
- **status**: `CitizenReportStatus` (Default `PENDIENTE`, Index).
- **resolvedAt**: `TIMESTAMPTZ` (Nullable).
- **createdAt**: `TIMESTAMPTZ`.
- **updatedAt**: `TIMESTAMPTZ`.

### 9. `RouteIncident` (Incidencias Operativas de Recolector)
- **id**: `UUID` (PK).
- **collectionId**: `UUID` (FK -> `Collection.id`, OnDelete `CASCADE`).
- **reportedByUserId**: `UUID` (FK -> `User.id`, recolector que reporta).
- **reason**: `VARCHAR(150)` (ej. *"Acceso bloqueado por vehículo"*).
- **description**: `TEXT` (Nullable).
- **photoUrl**: `TEXT` (Nullable).
- **createdAt**: `TIMESTAMPTZ` (Default `now()`).

### 10. `Notification` (Avisos del Sistema y Notificaciones In-App)
- **id**: `UUID` (PK).
- **userId**: `UUID` (Nullable, FK -> `User.id` para alertas dirigidas; `null` si es broadcast general).
- **comuna**: `SMALLINT` (Nullable, para notificaciones zonales).
- **title**: `VARCHAR(150)` (ej. *"El camión está en camino"*).
- **message**: `TEXT` (ej. *"EcoAseo Tuluá llega a tu sector en ~25 min"*).
- **type**: `VARCHAR(50)` (ej. `CAMION_EN_CAMINO`, `CONTENEDOR_LLENO`, `NUEVA_EMPRESA`, `RECORDATORIO`).
- **isRead**: `BOOLEAN` (Default `false`, Index).
- **createdAt**: `TIMESTAMPTZ` (Default `now()`).
