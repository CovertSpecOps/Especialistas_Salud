# Pipeline de CI, DoD y protección de rama — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatizar las puertas de calidad y las reglas de PR del repositorio con GitHub Actions y protección de rama, sin introducir CD ni infraestructura de nube.

**Architecture:** Dos workflows de GitHub Actions — `CI` (job `calidad`: las cuatro puertas de CLAUDE.md tras `prisma generate`) y `PR` (job `dod`: valida que la descripción del PR contenga la sección "Definición de Hecho" con todos los checkboxes marcados, vía script bash+jq sin acciones de terceros). La protección de `main` exige ambos checks + 1 aprobación (administradores exentos mientras el repo tenga una sola cuenta). Spec: `docs/superpowers/specs/2026-07-10-ci-pipeline-design.md`.

**Tech Stack:** GitHub Actions (solo acciones oficiales `actions/*`), bash + jq, `gh` CLI, Node 24 LTS en CI.

## Global Constraints

- Rama de trabajo: `chore/ci-pipeline` (ya existe, con la spec committeada). **Nunca commitear en `main`.**
- Todos los comentarios, docs y textos en **español**.
- **Solo acciones oficiales** (`actions/checkout@v5`, `actions/setup-node@v5`). Prohibidas acciones de marketplace/terceros.
- Node **24** (LTS) en CI. `DATABASE_URL` en CI es un placeholder: `postgresql://placeholder:placeholder@localhost:5432/placeholder` (ningún paso se conecta a una BD).
- Nombres de jobs (= nombres de los checks requeridos): `calidad` y `dod`. Encabezado que valida el check: `## Definición de Hecho`. No cambiarlos: la protección de rama y la plantilla dependen de ellos.
- Commits estilo _conventional commits_ en español, terminados con la línea:
  `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`
- **Nada de CD/hosting/nube.** Fuera de alcance explícito.
- Verificado previamente: `npm run db:generate` funciona con el schema vacío (Prisma 7.8.0).

---

### Task 1: Workflow de calidad — `.github/workflows/ci.yml`

**Files:**
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Produces: job `calidad` — su nombre es el contexto del status check que la Task 6 registra como requerido.

- [ ] **Step 1: Crear el workflow**

Contenido completo de `.github/workflows/ci.yml`:

```yaml
# CI — puertas de calidad de CLAUDE.md, en el mismo orden que se exigen
# en local: lint → typecheck → test → build.
#
# Sin base de datos: `prisma generate` no se conecta a ninguna BD, pero
# prisma.config.ts lee DATABASE_URL al cargar, así que se define un
# placeholder sintácticamente válido.
#
# Diseño: docs/superpowers/specs/2026-07-10-ci-pipeline-design.md
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

# Cancela ejecuciones obsoletas de la misma rama en PRs (ahorra minutos);
# en `main` no se cancela para no perder la verificación de ningún merge.
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}

jobs:
  calidad:
    runs-on: ubuntu-latest
    env:
      DATABASE_URL: "postgresql://placeholder:placeholder@localhost:5432/placeholder"
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm run db:generate
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test
      - run: npm run build
```

- [ ] **Step 2: Verificar en local la secuencia exacta que correrá el CI**

Run:
```bash
cd /Users/covertspecops/Desktop/Especialistas_Salud && npm run db:generate && npm run lint && npm run typecheck && npm run test && npm run build
```
Expected: las cinco órdenes terminan con código 0 (generate: "Generated Prisma Client"; test: "1 passed"; build: "Compiled successfully"). La validación del YAML en sí ocurre en la primera ejecución real del PR (Task 5).

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "chore: añade workflow de CI con las cuatro puertas de calidad

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Check de DoD — script + workflow `.github/workflows/pr.yml`

**Files:**
- Create: `.github/scripts/check-dod.sh`
- Create: `.github/workflows/pr.yml`

**Interfaces:**
- Produces: `check-dod.sh <ruta-al-evento-json>` — lee `.pull_request.body` del JSON; sale 0 si el cuerpo contiene `## Definición de Hecho` y no queda ningún `- [ ]` sin marcar; sale 1 con `::error::` en caso contrario. Job `dod` — contexto del segundo check requerido (Task 6).

- [ ] **Step 1: Test primero — ejecutar el script antes de que exista (debe fallar)**

Run:
```bash
DOD_TMP="$(mktemp -d)" && printf '%s' '{"pull_request":{"body":"sin seccion"}}' > "$DOD_TMP/evento.json" && bash /Users/covertspecops/Desktop/Especialistas_Salud/.github/scripts/check-dod.sh "$DOD_TMP/evento.json"
```
Expected: FAIL — `bash: .../check-dod.sh: No such file or directory` (código ≠ 0).

- [ ] **Step 2: Escribir el script**

Contenido completo de `.github/scripts/check-dod.sh`:

```bash
#!/usr/bin/env bash
# Verifica la "Definición de Hecho" (DoD) en la descripción de un PR:
#   1. Debe existir la sección "## Definición de Hecho".
#   2. No puede quedar ningún checkbox sin marcar ("- [ ]" o "* [ ]").
#
# Uso: check-dod.sh <ruta-al-evento-json>   (en CI: "$GITHUB_EVENT_PATH")
#
# El cuerpo se lee del archivo de evento con jq — nunca se interpola en el
# shell (el cuerpo de un PR es contenido no confiable en un repo público).
set -euo pipefail

EVENT_PATH="${1:?Uso: check-dod.sh <ruta-al-evento-json>}"

BODY="$(jq -r '.pull_request.body // ""' "$EVENT_PATH")"

if ! grep -qF '## Definición de Hecho' <<<"$BODY"; then
  echo "::error::La descripción del PR no tiene la sección '## Definición de Hecho'. Usa la plantilla de PR."
  exit 1
fi

PENDIENTES="$(grep -cE '^[[:space:]]*[-*] \[ \]' <<<"$BODY" || true)"
if [ "$PENDIENTES" -gt 0 ]; then
  echo "::error::Quedan $PENDIENTES checkbox(es) sin marcar en la descripción del PR. Marca cada ítem (marcar también significa 'no aplica')."
  exit 1
fi

echo "DoD verificada: sección presente y todos los checkboxes marcados."
```

- [ ] **Step 3: Probar los tres casos (falta sección / checkbox sin marcar / todo correcto)**

Run (bloque autocontenido):
```bash
cd /Users/covertspecops/Desktop/Especialistas_Salud && DOD_TMP="$(mktemp -d)" && \
printf '%s' '{"pull_request":{"body":"## Qué hace\nAlgo"}}' > "$DOD_TMP/sin-seccion.json" && \
jq -n '{pull_request:{body:"## Definición de Hecho\n- [x] Hecho\n- [ ] Pendiente"}}' > "$DOD_TMP/sin-marcar.json" && \
jq -n '{pull_request:{body:"## Definición de Hecho\n- [x] Hecho\n- [x] También"}}' > "$DOD_TMP/correcto.json" && \
{ bash .github/scripts/check-dod.sh "$DOD_TMP/sin-seccion.json"; echo "exit=$?"; } ; \
{ bash .github/scripts/check-dod.sh "$DOD_TMP/sin-marcar.json"; echo "exit=$?"; } ; \
bash .github/scripts/check-dod.sh "$DOD_TMP/correcto.json" && echo "exit=$?"
```
Expected:
- caso 1: `::error::La descripción del PR no tiene la sección…` y `exit=1`
- caso 2: `::error::Quedan 1 checkbox(es) sin marcar…` y `exit=1`
- caso 3: `DoD verificada: sección presente y todos los checkboxes marcados.` y `exit=0`

- [ ] **Step 4: Crear el workflow del check**

Contenido completo de `.github/workflows/pr.yml`:

```yaml
# Verificación de la Definición de Hecho (DoD) del PR.
# `edited` re-ejecuta el check cuando se corrige la descripción del PR.
#
# Diseño: docs/superpowers/specs/2026-07-10-ci-pipeline-design.md
name: PR

on:
  pull_request:
    types: [opened, edited, synchronize, reopened]

jobs:
  dod:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - name: Verificar Definición de Hecho
        run: bash .github/scripts/check-dod.sh "$GITHUB_EVENT_PATH"
```

- [ ] **Step 5: Commit**

```bash
git add .github/scripts/check-dod.sh .github/workflows/pr.yml
git commit -m "chore: añade check de Definición de Hecho (dod) para los PRs

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Plantilla de PR con DoD + declaración de IA, y CODEOWNERS

**Files:**
- Modify: `.github/PULL_REQUEST_TEMPLATE.md` (reemplazo completo)
- Create: `.github/CODEOWNERS`

**Interfaces:**
- Consumes: el encabezado `## Definición de Hecho` que valida `check-dod.sh` (Task 2).
- Produces: plantilla cuyo cuerpo, con todos los checkboxes marcados, pasa el check `dod`.

- [ ] **Step 1: Reemplazar la plantilla de PR**

Contenido completo de `.github/PULL_REQUEST_TEMPLATE.md` (conserva todas las secciones y checkboxes existentes; añade la sección de IA y tres ítems nuevos a la checklist, que pasa a llamarse "Definición de Hecho"):

```markdown
<!--
  Gracias por tu PR. Manténlo pequeño y enfocado.
  Recuerda: todo PR lo revisa Aaron antes del merge.
-->

## ¿Qué hace este PR?

<!-- Describe el cambio en 1-3 frases. -->

## ¿Por qué? (contexto / decisión de diseño)

<!-- Qué problema resuelve. Si tomaste una decisión de arquitectura no obvia, explícala. -->

## ¿Cómo probarlo?

<!-- Pasos para que el revisor verifique el cambio localmente. -->

## ¿Se usó IA?

<!-- Declara si hubo asistencia de IA y en qué partes.
     Ej.: "Claude generó el schema; los tests los escribí yo." Si no hubo: "No". -->

## Definición de Hecho

<!-- El check "dod" del CI falla si falta esta sección o si queda algún
     checkbox sin marcar. Marcar un ítem condicional significa "hecho o no aplica". -->

- [ ] Trabajé en una rama (no en `main`).
- [ ] El PR es pequeño y de una sola responsabilidad.
- [ ] `npm run lint` pasa.
- [ ] `npm run typecheck` pasa.
- [ ] `npm run test` pasa.
- [ ] `npm run build` compila.
- [ ] No subo secretos ni datos reales de pacientes.
- [ ] Entiendo cada línea de código de este PR (no pegué nada que no comprenda).
- [ ] Verifiqué contra la documentación real las APIs sugeridas por IA (Next 16 / Prisma 7 / React 19 / Tailwind 4).
- [ ] La lógica de negocio de este PR viene con tests (o el PR no añade lógica de negocio).
- [ ] No hay textos de interfaz "quemados": todo string visible vive en `src/i18n/`.
- [ ] Actualicé la documentación si hacía falta (README / docs).
```

- [ ] **Step 2: Crear CODEOWNERS**

Contenido completo de `.github/CODEOWNERS`:

```
# Aaron revisa todos los PRs (ver CLAUDE.md §3).
* @CovertSpecOps
```

- [ ] **Step 3: Test de integración — la plantilla con todo marcado pasa el check `dod`**

Run (marca todos los checkboxes de la plantilla y la valida con el script real):
```bash
cd /Users/covertspecops/Desktop/Especialistas_Salud && DOD_TMP="$(mktemp -d)" && \
sed 's/- \[ \]/- [x]/' .github/PULL_REQUEST_TEMPLATE.md | jq -Rs '{pull_request:{body:.}}' > "$DOD_TMP/plantilla.json" && \
bash .github/scripts/check-dod.sh "$DOD_TMP/plantilla.json"
```
Expected: `DoD verificada: sección presente y todos los checkboxes marcados.` (código 0). Además, la plantilla **sin** marcar debe fallar:
```bash
cd /Users/covertspecops/Desktop/Especialistas_Salud && DOD_TMP="$(mktemp -d)" && \
jq -Rs '{pull_request:{body:.}}' < .github/PULL_REQUEST_TEMPLATE.md > "$DOD_TMP/plantilla-cruda.json" && \
bash .github/scripts/check-dod.sh "$DOD_TMP/plantilla-cruda.json"; echo "exit=$?"
```
Expected: `::error::Quedan 12 checkbox(es) sin marcar…` y `exit=1`.

- [ ] **Step 4: Commit**

```bash
git add .github/PULL_REQUEST_TEMPLATE.md .github/CODEOWNERS
git commit -m "chore: plantilla de PR con Definición de Hecho y declaración de IA + CODEOWNERS

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Documentación — CONTRIBUTING, arquitectura y badge del README

**Files:**
- Modify: `CONTRIBUTING.md` (dos cambios: paso 6 del ciclo, y sección nueva antes de "Qué NO hacer")
- Modify: `docs/arquitectura.md` (sección nueva al final)
- Modify: `README.md` (badge tras el título)

**Interfaces:**
- Consumes: nombres de checks `calidad` y `dod` (Tasks 1–2) y la configuración de protección (Task 6 la aplica; aquí solo se documenta).

- [ ] **Step 1: CONTRIBUTING.md — actualizar el paso 6 del ciclo**

Reemplazar la línea:
```markdown
6. **Merge** solo cuando Aaron apruebe. Después borra la rama.
```
por:
```markdown
6. **Merge** solo cuando Aaron apruebe **y los checks del CI (`calidad` y `dod`) estén en
   verde**. Después borra la rama.
```

- [ ] **Step 2: CONTRIBUTING.md — insertar sección nueva entre "Tamaño de los PRs" y "Qué NO hacer"**

Texto a insertar (con una línea en blanco antes y después; el fence de cuatro
backticks delimita el contenido y no forma parte del archivo):

````markdown
## CI y protección de `main`

Cada PR ejecuta automáticamente dos checks en GitHub Actions:

- **`calidad`** (`.github/workflows/ci.yml`): `prisma generate` + las cuatro puertas en
  el orden de siempre — `lint`, `typecheck`, `test`, `build`.
- **`dod`** (`.github/workflows/pr.yml`): la descripción del PR debe conservar la sección
  **"Definición de Hecho"** de la plantilla con **todos** los checkboxes marcados
  (marcar un ítem condicional significa "hecho o no aplica"). Si editas la descripción,
  el check se re-ejecuta solo.

La rama `main` está protegida: exige ambos checks en verde y **1 aprobación** (con
revisión de code owner — ver `.github/CODEOWNERS`). Los administradores están exentos
mientras el repositorio tenga una sola cuenta, porque GitHub no permite aprobar un PR
propio. La protección se aplicó con este comando (reproducible si hay que recrearla):

```bash
gh api --method PUT -H "Accept: application/vnd.github+json" \
  repos/CovertSpecOps/Especialistas_Salud/branches/main/protection \
  --input - <<'JSON'
{
  "required_status_checks": {
    "strict": false,
    "checks": [{ "context": "calidad" }, { "context": "dod" }]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": {
    "require_code_owner_reviews": true,
    "required_approving_review_count": 1
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false
}
JSON
```
````

- [ ] **Step 3: docs/arquitectura.md — añadir sección al final del archivo**

```markdown

## Infraestructura: CI sin CD (decisión 2026-07-10)

- **CI en GitHub Actions** (repo público → gratis). Workflow `CI` (job `calidad`):
  `prisma generate` + las cuatro puertas. Workflow `PR` (job `dod`): exige la sección
  "Definición de Hecho" completa en la descripción del PR, con un script bash+jq propio
  (sin acciones de terceros). Protección de `main`: ambos checks + 1 aprobación con
  code owners; administradores exentos mientras el repo tenga una sola cuenta.
- **Sin CD ni nube, a propósito.** El desarrollo usa Postgres local (Docker) y no hay
  hosting. Cuando exista algo que valga la pena desplegar se decidirá el proveedor
  (candidatos: Vercel + Neon/Supabase/Prisma Postgres).
- **Mejora futura del CI:** contenedor de servicio Postgres + `prisma migrate deploy`
  (+ seed de humo) cuando MVP 1 introduzca el esquema y las migraciones.

Detalle completo: [`docs/superpowers/specs/2026-07-10-ci-pipeline-design.md`](./superpowers/specs/2026-07-10-ci-pipeline-design.md).
```

- [ ] **Step 4: README.md — badge de CI tras el título**

Reemplazar:
```markdown
# Especialistas Salud
```
por:
```markdown
# Especialistas Salud

[![CI](https://github.com/CovertSpecOps/Especialistas_Salud/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/CovertSpecOps/Especialistas_Salud/actions/workflows/ci.yml)
```

- [ ] **Step 5: Verificar que las cuatro puertas siguen en verde (los docs no rompen nada, pero es la regla antes de abrir PR)**

Run:
```bash
cd /Users/covertspecops/Desktop/Especialistas_Salud && npm run lint && npm run typecheck && npm run test && npm run build
```
Expected: todo en verde, código 0.

- [ ] **Step 6: Commit**

```bash
git add CONTRIBUTING.md docs/arquitectura.md README.md
git commit -m "docs: documenta CI, protección de main y badge de estado

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: Abrir el PR y verificar los workflows en vivo

**Files:** ninguno (operaciones de git/GitHub).

**Interfaces:**
- Consumes: los workflows de Tasks 1–2 (el PR es su primera ejecución real) y la plantilla de Task 3.
- Produces: primera ejecución de los checks `calidad` y `dod` — requisito para que la Task 6 pueda registrarlos como checks requeridos con autocompletado de nombre correcto.

**Nota:** GitHub lee la plantilla de PR desde la rama por defecto (`main`), donde aún no
existe la versión nueva — por eso el cuerpo del PR se escribe explícitamente siguiendo la
plantilla nueva. Este propio cuerpo debe pasar el check `dod`.

- [ ] **Step 1: Push de la rama**

```bash
git push -u origin chore/ci-pipeline
```
Expected: rama publicada sin errores.

- [ ] **Step 2: Abrir el PR con cuerpo conforme a la plantilla nueva**

```bash
gh pr create --title "chore: pipeline de CI, Definición de Hecho y protección de main" --body "$(cat <<'CUERPO'
## ¿Qué hace este PR?

Añade el pipeline de CI (workflow `CI`, job `calidad`: generate + lint + typecheck + test + build), el check `dod` que exige la Definición de Hecho en la descripción de cada PR, la plantilla de PR con declaración de uso de IA, CODEOWNERS y la documentación correspondiente (CONTRIBUTING, arquitectura, badge). Incluye la spec y este plan.

## ¿Por qué? (contexto / decisión de diseño)

Las puertas de calidad y la revisión eran sistema de honor. Decisiones clave: sin CD ni nube por ahora (Postgres local en desarrollo); Node 24 LTS en CI; solo acciones oficiales; el check `dod` es un script bash+jq propio que lee el cuerpo del PR desde el payload del evento (nunca se interpola en el shell). Tras el merge se protege `main` (checks + 1 aprobación, admins exentos mientras haya una sola cuenta). Spec: `docs/superpowers/specs/2026-07-10-ci-pipeline-design.md`.

## ¿Cómo probarlo?

1. En local: `npm run db:generate && npm run lint && npm run typecheck && npm run test && npm run build` — todo en verde.
2. Script DoD: `bash .github/scripts/check-dod.sh <evento.json>` con los casos de prueba del plan (sección Task 2/3).
3. En este PR: los checks `calidad` y `dod` deben aparecer en verde en la pestaña Checks.

## ¿Se usó IA?

Sí — diseño acordado en sesión con Claude (Fable 5); Claude escribió los workflows, el script y la documentación siguiendo la spec aprobada. Todo verificado contra la documentación oficial y revisado línea por línea.

## Definición de Hecho

- [x] Trabajé en una rama (no en `main`).
- [x] El PR es pequeño y de una sola responsabilidad.
- [x] `npm run lint` pasa.
- [x] `npm run typecheck` pasa.
- [x] `npm run test` pasa.
- [x] `npm run build` compila.
- [x] No subo secretos ni datos reales de pacientes.
- [x] Entiendo cada línea de código de este PR (no pegué nada que no comprenda).
- [x] Verifiqué contra la documentación real las APIs sugeridas por IA (Next 16 / Prisma 7 / React 19 / Tailwind 4).
- [x] La lógica de negocio de este PR viene con tests (o el PR no añade lógica de negocio).
- [x] No hay textos de interfaz "quemados": todo string visible vive en `src/i18n/`.
- [x] Actualicé la documentación si hacía falta (README / docs).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
CUERPO
)"
```
Expected: URL del PR creada.

- [ ] **Step 3: Ver los checks en vivo hasta que terminen**

Run:
```bash
gh pr checks --watch
```
Expected: `calidad` **pass** y `dod` **pass**. Si `calidad` falla, leer el log (`gh run view --log-failed`), corregir en la rama y push (el PR se actualiza). Si `dod` falla, revisar que el cuerpo del PR conserve la sección y todos los `[x]`.

---

### Task 6: Aplicar y verificar la protección de `main`

**Files:** ninguno (configuración del repositorio vía `gh api`). Se ejecuta **después** de que los checks hayan corrido al menos una vez (Task 5).

**Interfaces:**
- Consumes: contextos de check `calidad` y `dod` (nombres exactos de los jobs de Tasks 1–2).

- [ ] **Step 1: Aplicar la protección**

```bash
gh api --method PUT -H "Accept: application/vnd.github+json" \
  repos/CovertSpecOps/Especialistas_Salud/branches/main/protection \
  --input - <<'JSON'
{
  "required_status_checks": {
    "strict": false,
    "checks": [{ "context": "calidad" }, { "context": "dod" }]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": {
    "require_code_owner_reviews": true,
    "required_approving_review_count": 1
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false
}
JSON
```
Expected: respuesta JSON 200 con la configuración aplicada.

- [ ] **Step 2: Verificar la configuración**

Run:
```bash
gh api repos/CovertSpecOps/Especialistas_Salud/branches/main/protection \
  --jq '{checks: [.required_status_checks.checks[].context], estricto: .required_status_checks.strict, aprobaciones: .required_pull_request_reviews.required_approving_review_count, code_owners: .required_pull_request_reviews.require_code_owner_reviews, admins_incluidos: .enforce_admins.enabled, force_push: .allow_force_pushes.enabled}'
```
Expected:
```json
{"checks":["calidad","dod"],"estricto":false,"aprobaciones":1,"code_owners":true,"admins_incluidos":false,"force_push":false}
```

- [ ] **Step 3: Verificar que el PR refleja los requisitos**

Run:
```bash
gh pr view --json mergeStateStatus,reviewDecision --jq '{estado: .mergeStateStatus, revision: .reviewDecision}'
```
Expected: `revision` = `"REVIEW_REQUIRED"` (la aprobación pasa a ser requisito; como admin puedes mergear igualmente — exención documentada). Con esto el pipeline queda en vivo; el merge del PR lo hace Aaron.
