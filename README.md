# Especialistas Salud

CRM web para **profesionales de la salud** de cualquier disciplina (fisioterapia,
nutrición, odontología, medicina general, psicología, etc.). Pensado para clínicas
en Costa Rica donde **varios profesionales comparten una misma instancia**.

La especialidad es **un dato configurable, nunca comportamiento programado**: el
sistema funciona igual para cualquier disciplina. **Toda la interfaz está en español.**

> _English summary: A web-based CRM for health practitioners of any discipline.
> Multiple practitioners share one clinic instance. A practitioner's specialty is
> data, never hard-coded behavior. The entire UI is in Spanish; the code is
> structured so adding English later is easy._

## Alcance del MVP

- Autenticación con múltiples profesionales y roles (**ADMIN** / **PROFESSIONAL**).
- Perfiles de profesional con **especialidad configurable** (lista que un admin puede ampliar).
- Fichas de pacientes: datos demográficos, contacto, alergias/condiciones, notas.
- Citas: agenda por profesional (crear, ver, editar, cancelar).
- Notas de sesión por visita con **plantillas seleccionables** + campo libre.
- Adjuntos por paciente (resultados, planes, fotos).
- Línea de tiempo del paciente y búsqueda.

### Fuera de alcance (Fase 2)

Constructor de plantillas dentro de la app, resúmenes de sesión con IA, recordatorios
por WhatsApp, página pública de auto-reserva, facturación/pagos.

## Stack

| Capa          | Tecnología                         |
| ------------- | ---------------------------------- |
| Frontend / UI | Next.js (App Router) + React       |
| Backend / API | Next.js (Route Handlers / Actions) |
| Lenguaje      | TypeScript                         |
| ORM           | Prisma                             |
| Base de datos | PostgreSQL                         |
| Estilos       | Tailwind CSS                       |
| Tests         | Vitest + Testing Library           |

> Filosofía del proyecto: **"MVP primero. Escalabilidad después."** Se elige la
> solución más simple para la primera versión y se documentan las mejoras futuras.

## Requisitos

- Node.js 18+ (probado con Node 25).
- Una base de datos PostgreSQL (local o en la nube: Neon, Supabase o `npx create-db`).

## Puesta en marcha local

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env
#    Edita .env y coloca tu DATABASE_URL real.

# 3. Crear el esquema en la base de datos (cuando existan modelos en prisma/schema.prisma)
npm run db:migrate

# 4. (Opcional) Poblar datos de demostración
npm run db:seed

# 5. Levantar el servidor de desarrollo
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Variables de entorno

Ver [`.env.example`](./.env.example) para la lista completa.

| Variable       | Descripción                                                   |
| -------------- | ------------------------------------------------------------- |
| `DATABASE_URL` | Cadena de conexión a PostgreSQL. **Obligatoria.**             |
| `AUTH_SECRET`  | Secreto para firmar sesiones (se añade al implementar login). |

## Scripts

| Comando              | Acción                              |
| -------------------- | ----------------------------------- |
| `npm run dev`        | Servidor de desarrollo              |
| `npm run build`      | Compilación de producción           |
| `npm run start`      | Servir la build de producción       |
| `npm run lint`       | ESLint                              |
| `npm run typecheck`  | Comprobación de tipos (TypeScript)  |
| `npm run format`     | Formatear con Prettier              |
| `npm run test`       | Ejecutar los tests (Vitest)         |
| `npm run db:migrate` | Crear/aplicar migraciones de Prisma |
| `npm run db:studio`  | Abrir Prisma Studio                 |
| `npm run db:seed`    | Poblar datos de demostración        |

## Estructura del proyecto

```
prisma/            Esquema de Prisma y migraciones
src/
  app/             Rutas y páginas (App Router de Next.js)
  i18n/            Diccionarios de textos (es) — preparado para más idiomas
  generated/       Cliente de Prisma generado (ignorado por git)
docs/              Documentación de arquitectura y decisiones
```

## Cómo trabajamos

Lee [`CONTRIBUTING.md`](./CONTRIBUTING.md) **antes de empezar**: explica el flujo de
ramas y Pull Requests (todo PR se revisa antes de hacer merge) y [`CLAUDE.md`](./CLAUDE.md)
recoge las reglas para usar asistentes de IA de forma responsable en este proyecto.
La arquitectura y las decisiones de diseño están en [`docs/arquitectura.md`](./docs/arquitectura.md).
