# MeetWithFriends — Proyecto Final (TFM)

Aplicación full-stack para coordinar disponibilidad, reservas y planes entre amigos de forma segura, rápida y centrada en la experiencia de usuario.

> Este README está pensado como **documentación evaluable del TFM**: explica el proyecto en profundidad, los conocimientos aplicados por módulo y el proceso exacto para instalar/ejecutar el sistema desde cero.

---

## 1) Información de entrega (TFM)

### Alumno
- **Nombre completo:** José Antonio López Rosique
- **Email de inscripción:** jlopezr@staffy-app.com

### Enlaces requeridos
- **Código (repo):** https://github.com/JoseRosique/TFM_BigSchool
- **Despliegue:** https://meetwithfriends.onrender.com 
- **Slides presentación:** [https://github.com/JoseRosique/TFM_BigSchool/MeetWithFriends.pdf](https://github.com/JoseRosique/TFM_BigSchool/blob/main/MeetWithFriends.pdf)

---

## 2) Objetivo del proyecto

### Problema que resuelve
Coordinar quedadas entre varias personas suele ser ineficiente: conversaciones largas, solapes de horarios, zonas horarias distintas y poca visibilidad de disponibilidad real.

### Solución propuesta
MeetWithFriends centraliza el flujo completo:
- Gestión de disponibilidad por franjas de tiempo.
- Sistema de amistades y grupos.
- Reserva/cancelación de franjas.
- Privacidad y control de visibilidad.
- Interfaz moderna y orientada a productividad.

### Valor diferencial
- Arquitectura limpia y escalable en monorepo.
- Contratos tipados compartidos entre frontend y backend.
- Seguridad aplicada desde diseño (validación, rate-limit, guardas, políticas CORS/CSP).
- Enfoque real de producto, no solo demo técnica.

---

## 3) Stack tecnológico

### Frontend
- Angular 21 (Standalone Components + Signals)
- TypeScript
- RxJS
- @ngx-translate (i18n ES/EN)
- SCSS

### Backend
- NestJS 10
- TypeScript
- TypeORM
- PostgreSQL
- JWT + Refresh Token
- class-validator / class-transformer
- Zod (validación de configuración)
- Helmet + Throttler (seguridad)

### Monorepo y tooling
- npm workspaces
- shared package para tipos y DTOs
- Docker / Docker Compose
- Jest (backend)
- Karma/Jasmine (frontend)
- Playwright E2E (frontend/e2e)

---

## 4) Arquitectura y diseño técnico

### Enfoque arquitectónico
El proyecto sigue una línea de **Clean Architecture + monorepo**:
- `packages/backend`: API y lógica de dominio/aplicación/infrastructura.
- `packages/frontend`: UI y experiencia de usuario.
- `packages/shared`: contratos compartidos (tipos, DTOs, enums).

### Beneficios prácticos aplicados
- Menor duplicidad de tipos entre frontend/backend.
- Mejor mantenibilidad al separar responsabilidades.
- Evolución por módulos sin acoplamiento excesivo.
- Mayor testabilidad y trazabilidad de cambios.

---

## 5) Estructura del proyecto

```text
MeetWithFriends/
├── package.json
├── docker-compose.yml
├── Dockerfile
├── README.md
├── docs/
├── postgres/
│   └── init.sql
├── packages/
│   ├── backend/
│   │   ├── src/
│   │   │   ├── domain/
│   │   │   ├── application/
│   │   │   ├── infrastructure/
│   │   │   └── shared/
│   │   ├── scripts/
│   │   └── package.json
│   ├── frontend/
│   │   ├── src/
│   │   │   ├── app/
│   │   │   ├── assets/
│   │   │   └── environments/
│   │   ├── e2e/
│   │   └── package.json
│   └── shared/
│       ├── src/
│       └── package.json
└── bigschool_agents/
```

---

## 6) Funcionalidades principales

### Autenticación y cuenta
- Registro/login tradicional.
- Login con Google.
- Refresh token y cierre de sesión.
- Recuperación y reseteo de contraseña.
- Perfil editable (idioma, avatar, timezone, preferencias).

### Red social (amistades)
- Búsqueda de usuarios.
- Solicitudes de amistad.
- Aceptar/rechazar/cancelar.
- Bloquear/desbloquear.
- Listados de amigos/pendientes/bloqueados.

### Grupos
- Crear, editar y eliminar grupos.
- Añadir/quitar miembros.
- Búsqueda y gestión de grupos.

### Calendario y disponibilidad
- Crear franjas de disponibilidad.
- Editar/cancelar/eliminar franjas propias.
- Explorar franjas disponibles.
- Vistas con control por timezone.

### Reservas
- Reservar franja de otro usuario.
- Ver reservas realizadas y recibidas.
- Cancelar reserva con validaciones de dominio.

### Dashboard de inicio
- Home visual de entrada con accesos rápidos.
- Sección de acciones prioritarias y onboarding.

---

## 7) Conocimientos aplicados por módulos (explicación evaluable)

### Módulo 1 — Arquitectura y diseño de software
**Qué se aplicó**
- Separación por capas (`domain`, `application`, `infrastructure`).
- Principios de responsabilidad única y bajo acoplamiento.
- Contratos compartidos en `packages/shared` para evitar drift de tipos.

**Cómo se evidencia en el código**
- Entidades de dominio en `packages/backend/src/domain/entities`.
- Módulos de aplicación en `packages/backend/src/application/*`.
- Configuración e infraestructura desacopladas en `packages/backend/src/infrastructure/*`.

### Módulo 2 — Backend API y lógica de negocio
**Qué se aplicó**
- Diseño de API REST con NestJS y controladores por bounded context.
- DTOs + validación de entrada.
- Manejo de errores y respuestas consistentes.

**Cómo se evidencia**
- Controladores por contexto (`auth`, `friends`, `groups`, `slots`, `reservations`, `users`).
- Casos de seguridad y reglas de negocio (evitar auto-amistad, validación de nickname, ownership de recursos, etc.).

### Módulo 3 — Persistencia y modelado de datos
**Qué se aplicó**
- Modelado relacional con PostgreSQL y TypeORM.
- Migraciones como fuente de verdad (`synchronize: false`).
- Soporte para DB local y remota (`DATABASE_URL`, SSL para Render).

**Cómo se evidencia**
- `packages/backend/src/infrastructure/config/database.config.ts`.
- `packages/backend/src/infrastructure/migrations/*`.
- Scripts de validación/migración en `packages/backend/scripts`.

### Módulo 4 — Frontend moderno con Angular
**Qué se aplicó**
- Standalone components + Signals.
- Gestión de estado local por feature.
- Ruteo protegido por guardas.
- Componentización y UX modular.

**Cómo se evidencia**
- Rutas en `packages/frontend/src/app/app.routes.ts`.
- Features en `packages/frontend/src/app/features/*`.
- Guards y servicios en `packages/frontend/src/app/shared/*`.

### Módulo 5 — Seguridad aplicada
**Qué se aplicó**
- Autenticación con JWT + refresh token.
- Protección de endpoints con guards.
- Rate limiting global y por endpoint sensible.
- Helmet y política CSP.
- Validación estricta de configuración mediante Zod.

**Cómo se evidencia**
- `packages/backend/src/main.ts` (Helmet, CORS, pipes).
- `packages/backend/src/app.module.ts` (Throttler global).
- `packages/backend/src/infrastructure/config/env.config.ts`.
- `packages/backend/src/application/auth/*`.

### Módulo 6 — Internacionalización y UX
**Qué se aplicó**
- i18n completo ES/EN.
- Microcopy orientado a claridad y prevención de errores.
- Feedback visual y toasts para estados de usuario.

**Cómo se evidencia**
- `packages/frontend/src/assets/i18n/es.json`
- `packages/frontend/src/assets/i18n/en.json`

### Módulo 7 — DevOps y despliegue
**Qué se aplicó**
- Docker para empaquetado reproducible.
- Compose para entorno local de datos.
- Guías de despliegue y operación.
- **Email service** con SendGrid API (migrado desde SMTP por restricciones de plataforma).

**Cómo se evidencia**
- `Dockerfile`
- `docker-compose.yml`
- `packages/backend/src/infrastructure/services/email.service.ts` (SendGrid API implementation)

**Decisión técnica: SMTP → SendGrid**
- **Problema:** Render (hosting gratuito) bloquea conexiones SMTP salientes (puertos 587/465) causando timeouts en recuperación de contraseña.
- **Solución:** Migración a SendGrid API que usa HTTP en lugar de SMTP.
- **Trade-off:** Los emails pueden llegar a spam sin dominio personalizado autenticado. Ver sección de despliegue para detalles.

### Módulo 8 — Calidad y testing
**Qué se aplicó**
- Tests unitarios/integración backend (Jest).
- Tests frontend (Karma/Jasmine).
- E2E con Playwright.

**Cómo se evidencia**
- Scripts de test en `package.json` de root y paquetes.
- `packages/frontend/e2e/auth-flow.spec.ts`.

---

## 8) Requisitos previos para ejecutar el proyecto

- **Node.js 20 LTS** (recomendado).  
  > Nota importante: con Node 21 se ha observado incompatibilidad ESM con Angular CLI en este repo.
- **npm 10+**
- **Docker Desktop** (para PostgreSQL local)
- **Git**

---

## 9) Instalación y ejecución (paso a paso, desde cero)

### Opción A (recomendada para evaluación): DB en Docker + apps en local

### 1. Clonar repositorio
```bash
git clone <URL_DEL_REPO>
cd MeetWithFriends
```

### 2. Configurar variables globales
```bash
cp .env.example .env
```

### 3. Instalar dependencias
```bash
npm install --legacy-peer-deps
```

### 4. Levantar PostgreSQL
```bash
docker-compose up -d
```

### 5. Configurar backend
```bash
cp packages/backend/.env.local packages/backend/.env 2>/dev/null || true
# si no existe .env.local, usa directamente packages/backend/.env y ajusta valores
```

Variables mínimas backend (obligatorias):
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `JWT_SECRET`, `REFRESH_TOKEN_SECRET`, `SESSION_SECRET`
- `GOOGLE_CLIENT_ID`
- `SENDGRID_API_KEY`, `EMAIL_FROM` (email service migrado a SendGrid API)
- `CORS_ORIGIN`, `FRONTEND_URL`

> **⚠️ Nota sobre emails:** El sistema de recuperación de contraseña usa SendGrid API. Los emails pueden llegar a la carpeta de **spam/promociones** según el proveedor de email del usuario. Para evaluación, **revisar spam folder** si no llega el email de reset.

### 6. Compilar shared y backend
```bash
npm run build:shared
npm run build:backend
```

### 7. Ejecutar backend
```bash
cd packages/backend
npm run start:dev
```
Backend disponible en: http://localhost:3000

### 8. Ejecutar frontend (otra terminal)
```bash
cd packages/frontend
npm start
```
Frontend disponible en: http://localhost:4200

### 9. URLs de verificación
- App: http://localhost:4200
- API: http://localhost:3000/api
- Config pública API: http://localhost:3000/api/config/public

---

### Opción B: ejecución de pruebas principales

Desde raíz:
```bash
npm run test
```

Por paquete:
```bash
npm run test --workspace=@meetwithfriends/backend
npm run test --workspace=@meetwithfriends/frontend
```

Backend específico:
```bash
cd packages/backend
npm run test:unit
npm run test:integration
```

E2E frontend (según setup local):
```bash
cd packages/frontend
npx playwright test
```

---

## 10) Scripts útiles

### Root
- `npm run build` → build de todos los paquetes
- `npm run build:backend`
- `npm run build:frontend`
- `npm run build:shared`
- `npm run dev` → levanta `docker-compose`

### Backend
- `npm run start:dev`
- `npm run migrate`
- `npm run migrate:generate --name=<nombre>`
- `npm run migrate:revert`

### Frontend
- `npm start`
- `npm run build`
- `npm run test`
- `npm run lint`

---

## 11) API principal (resumen de endpoints)

Base URL: `/api`

### Auth (`/auth`)
- `POST /register`
- `POST /login`
- `POST /google`
- `POST /refresh`
- `POST /forgot-password`
- `POST /reset-password`
- `GET /me`
- `PATCH /profile`
- `PATCH /password`
- `GET /check-nickname/:nickname`

### Friends
- `GET /friends`
- `GET /friends/pending`
- `GET /friends/blocked`
- `POST /friends/request/:userId`
- `POST /friends/requests/:requestId/accept`
- `DELETE /friends/:id`
- `PUT /friends/block/:userId`

### Groups (`/groups`)
- `GET /groups`
- `POST /groups`
- `PATCH /groups/:id`
- `DELETE /groups/:id`

### Slots (`/slots`)
- `POST /slots`
- `GET /slots/my-availability`
- `GET /slots/explore`
- `PATCH /slots/:id`
- `DELETE /slots/:id`

### Reservations (`/reservations`)
- `POST /reservations`
- `GET /reservations/me`
- `DELETE /reservations/:id`

---

## 12) Seguridad, privacidad y calidad

### Seguridad implementada
- JWT guard en rutas privadas.
- Throttling en endpoints sensibles.
- Helmet + Content Security Policy.
- Validación de payloads y de configuración de entorno.
- Gestión de CORS explícita.

### Consideraciones importantes
- `synchronize` está desactivado en TypeORM para proteger esquema.
- Migraciones controlan evolución de base de datos.
- Recomendada rotación periódica de secretos y credenciales.

---

## 13) Despliegue

- **URL actual de referencia:** https://meetwithfriends.onrender.com
- **Nota para evaluación (importante):** al estar desplegada en un servidor gratuito, si no hay actividad durante ~15 minutos la instancia entra en reposo. En ese caso, la primera petición puede tardar aproximadamente entre 2 y 3 minutos mientras el servicio vuelve a iniciarse.
- Backend y frontend se empaquetan mediante `Dockerfile` multi-stage.

### Email Service (SendGrid)
- **Funcionalidad:** Recuperación de contraseña (`POST /api/auth/forgot-password`)
- **Proveedor:** SendGrid API (migrado desde SMTP por restricciones de Render)
- **⚠️ Advertencia evaluadores:** Los emails de "recuperar contraseña" pueden llegar a **carpeta de spam/promociones** dependiendo del proveedor de email. Esto es normal con sender verificado de Gmail (`meetwithfriends.info@gmail.com`) sin dominio propio autenticado.
- **Solución producción:** Requiere dominio personalizado con registros SPF/DKIM/DMARC configurados en SendGrid.
- **Para testing:** Revisar spam/promociones si el email no llega a inbox.

---

## 14) Slides y defensa del TFM

- **Slides públicas:** [https://github.com/JoseRosique/TFM_BigSchool/MeetWithFriends.pdf](https://github.com/JoseRosique/TFM_BigSchool/blob/main/MeetWithFriends.pdf)

### Guion recomendado para la defensa
1. Problema real y oportunidad.
2. Decisiones de arquitectura.
3. Demostración funcional (registro → amistad → slot → reserva).
4. Seguridad y calidad técnica.
5. Lecciones aprendidas y roadmap.

---

## 15) Roadmap de evolución

- Notificaciones en tiempo real y push.
- Integraciones con calendarios externos.
- Métricas de producto y observabilidad avanzada.
- Mayor cobertura de tests e2e para flujos críticos.

---

## 16) Estado del proyecto

Proyecto funcional y desplegable, con arquitectura modular y documentación extensa para revisión académica y técnica.
