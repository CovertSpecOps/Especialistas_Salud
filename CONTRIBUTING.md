# Guía de contribución

Flujo de trabajo del proyecto. Léelo antes de tu primer cambio. Las reglas técnicas y de
uso de IA están en [`CLAUDE.md`](./CLAUDE.md).

## Regla número uno

**Nunca se trabaja directo en `main`, y todo PR lo revisa Aaron antes del merge** — incluido
el primer scaffold. Si tienes dudas de diseño, pregúntalas en el issue o en el PR _antes_ de
escribir mucho código.

## Ciclo de un cambio

1. **Actualiza `main`:**
   ```bash
   git checkout main
   git pull
   ```
2. **Crea una rama** con prefijo según el tipo de trabajo:
   ```bash
   git checkout -b feat/patient-records
   ```
   Prefijos: `feat/` (nueva funcionalidad), `fix/` (corrección), `chore/` (tareas de
   mantenimiento), `docs/` (documentación), `refactor/`, `test/`.
3. **Programa en incrementos pequeños** y commitea seguido con mensajes claros
   (_conventional commits_):
   ```
   feat: agrega modelo Patient con soft delete
   fix: corrige cálculo de horarios disponibles
   docs: documenta variables de entorno
   ```
4. **Pasa las puertas de calidad** (deben quedar en verde):
   ```bash
   npm run lint && npm run typecheck && npm run test && npm run build
   ```
5. **Sube la rama y abre el PR:**
   ```bash
   git push -u origin feat/patient-records
   ```
   Abre el Pull Request en GitHub, rellena la plantilla y **avisa a Aaron** para que lo
   revise. Responde a sus comentarios en la misma rama (nuevos commits actualizan el PR).
6. **Merge** solo cuando Aaron apruebe. Después borra la rama.

## Tamaño de los PRs

Pequeños y enfocados: una responsabilidad por PR. Es preferible una serie de PRs chicos
que se revisan rápido a uno enorme. Si un PR empieza a tocar muchas cosas distintas,
pártelo.

## Qué NO hacer

- No commitear el `.env` ni ningún secreto (solo `.env.example`).
- No subir datos reales de pacientes.
- No construir funcionalidades de **Fase 2** (ver `README.md`) sin que se pidan.
- No mergear PRs en rojo ni sin revisión humana.
