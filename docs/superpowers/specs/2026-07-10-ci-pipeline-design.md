# Diseño — Pipeline de CI, DoD y protección de rama

- **Fecha:** 2026-07-10
- **Estado:** aprobado (pendiente de implementación)
- **Alcance:** solo CI + reglas de PR. **Sin CD ni nube por ahora** (decisión explícita).

## Contexto y objetivo

El repositorio define puertas de calidad (`lint` → `typecheck` → `test` → `build`) y un
flujo de PRs revisados por Aaron, pero hoy todo es sistema de honor: no hay CI, no hay
protección de rama y la plantilla de PR no se verifica.

Objetivo: automatizar esas reglas con GitHub Actions y protección de rama, sin
introducir infraestructura de despliegue. La base de datos de desarrollo sigue siendo
Postgres local (Docker). La selección de nube (hosting + Postgres gestionado) se
pospone hasta que exista algo que valga la pena desplegar.

## Decisiones

| Decisión | Elección | Por qué |
| --- | --- | --- |
| Plataforma de CI | GitHub Actions | El repo ya vive en GitHub; gratis para repos públicos. |
| CD / hosting | **Ninguno por ahora** | MVP primero; no hay nada que desplegar. Candidatos futuros: Vercel + Neon/Supabase/Prisma Postgres. |
| Node en CI | **24 (LTS)** | Node 25 (local) ya está fuera de soporte; el README promete Node 18+. CI en LTS es la verificación honesta. |
| Estructura del workflow | Un job secuencial | Respeta el orden de CLAUDE.md, un solo check verde, mínimo consumo de minutos. |
| Acciones de terceros | Solo acciones oficiales (`actions/*`) | Menos superficie de cadena de suministro; coherente con "entiende cada línea". |
| Base de datos en CI | Ninguna (placeholder) | `prisma generate` no se conecta; nada en el repo toca una BD todavía. |

## 1. Workflow de calidad — `.github/workflows/ci.yml`

- **Disparadores:** `pull_request` hacia `main` y `push` a `main`.
- **Concurrencia:** cancela ejecuciones obsoletas de la misma rama (ahorra minutos).
- **Un job `calidad`** (el nombre es el check visible en el PR):
  1. `actions/checkout`
  2. `actions/setup-node` — Node 24, caché de npm
  3. `npm ci`
  4. `npm run db:generate` — hoy es casi gratis; evita que el pipeline rompa cuando
     MVP 1 introduzca modelos y el código importe `src/generated/prisma`
  5. `npm run lint`
  6. `npm run typecheck`
  7. `npm run test`
  8. `npm run build`
- **Entorno:** `DATABASE_URL` con un valor placeholder sintácticamente válido
  (p. ej. `postgresql://placeholder:placeholder@localhost:5432/placeholder`), porque
  `prisma.config.ts` lo lee al cargar. Ningún paso se conecta a una base de datos.

## 2. Workflow de DoD — `.github/workflows/pr.yml`

- **Disparadores:** `pull_request` con tipos `opened`, `edited`, `synchronize`,
  `reopened` — editar la descripción del PR re-ejecuta el check.
- **Un job `dod`** que lee el cuerpo del PR desde el payload del evento
  (`$GITHUB_EVENT_PATH`, bash + `jq`, sin acciones de terceros) y **falla** si:
  - falta la sección `## Definición de Hecho`, **o**
  - queda algún checkbox sin marcar (`- [ ]`) en el cuerpo del PR.
- Regla simple a propósito: *todos* los checkboxes del cuerpo deben estar marcados.
  Los ítems condicionales se redactan como "… si hacía falta", de modo que marcar
  también significa "no aplica".

## 3. Protección de la rama `main`

Se aplica una vez con `gh api` (se documenta el comando en `CONTRIBUTING.md` para que
sea reproducible). Configuración:

| Ajuste | Valor |
| --- | --- |
| Checks requeridos | `calidad` y `dod` (no estrictos: no exige rama al día) |
| Revisiones aprobatorias requeridas | 1 |
| Revisión de code owners requerida | sí |
| Aplicar a administradores | **no** |
| Force-push / borrar rama | bloqueado |

**Por qué los administradores quedan exentos:** hoy el repo tiene una sola cuenta
(`CovertSpecOps`); GitHub no permite aprobar tu propio PR, así que exigir revisión sin
excepción bloquearía todos los merges. Con esta configuración, la regla se vuelve
efectiva automáticamente cuando la cuenta del practicante se añada como colaborador:
sus PRs exigirán la aprobación de Aaron.

## 4. Plantilla de PR — `.github/PULL_REQUEST_TEMPLATE.md`

Se conserva todo lo existente y se reorganiza:

- **Nueva sección `## ¿Se usó IA?`** — declarar si hubo asistencia de IA y en qué
  partes (p. ej. "Claude generó el schema; los tests los escribí yo").
- **La checklist pasa a llamarse `## Definición de Hecho`** (el check `dod` busca ese
  encabezado) y suma tres ítems alineados con CLAUDE.md:
  - Verifiqué contra la documentación real las APIs sugeridas por IA (Next 16 /
    Prisma 7 / React 19 / Tailwind 4).
  - La lógica de negocio de este PR viene con tests.
  - No hay textos de interfaz "quemados": todo string visible está en `src/i18n/`.
- Los checkboxes existentes (rama, PR pequeño, cuatro puertas, sin secretos ni datos
  reales, "entiendo cada línea", docs) se mantienen tal cual.

## 5. CODEOWNERS — `.github/CODEOWNERS`

Una línea: `* @CovertSpecOps`. GitHub solicita automáticamente la revisión de Aaron en
cada PR y habilita el ajuste "require code owner review" de la protección de rama.

## 6. Documentación

- **`CONTRIBUTING.md`:** sección nueva — el CI ejecuta las cuatro puertas en cada PR;
  el merge se bloquea hasta que `calidad` y `dod` estén en verde y haya aprobación.
  Incluye el comando `gh api` de la protección de rama.
- **`docs/arquitectura.md`:** entrada de decisión — CI en GitHub Actions, sin CD por
  ahora, y la mejora futura documentada: añadir un contenedor de servicio Postgres +
  `prisma migrate deploy` al CI cuando llegue el esquema de MVP 1.
- **`README.md`:** badge de estado del CI al inicio.

## 7. Entrega y verificación

1. Rama `chore/ci-pipeline` (este diseño ya vive ahí).
2. Ejecutar las cuatro puertas en local antes de abrir el PR.
3. Abrir el PR — el propio PR es la prueba en vivo de ambos workflows.
4. Verificar en la pestaña Actions que `calidad` y `dod` corren en verde.
5. Aplicar la protección de rama **después** de esa primera ejecución (así GitHub ya
   conoce los nombres de los checks).
6. Verificar que el PR muestra los checks y la revisión como requisitos.
7. Merge por Aaron.

## Fuera de alcance (futuro documentado)

- **CD / hosting + Postgres gestionado** — decidir cuando haya algo que desplegar.
- **Postgres real en CI** (service container + `migrate deploy` + seed de humo) —
  cuando MVP 1 introduzca el esquema y las migraciones.
- Lint de mensajes de commit (commitlint) y títulos semánticos de PR.
- Dependabot / actualizaciones automáticas de dependencias.
