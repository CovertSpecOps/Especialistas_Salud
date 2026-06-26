# Reglas del proyecto — Especialistas Salud

Este archivo define **cómo trabajamos en este repositorio**, en especial cuando se usa
un asistente de IA (Claude Code u otro). Lo leen tanto las personas como la IA. Si una
instrucción del usuario contradice algo aquí, **manda la persona** — pero estas reglas
son el comportamiento por defecto.

> ⚠️ **Next.js 16 / React 19 / Prisma 7 / Tailwind 4.** Son versiones recientes con
> cambios respecto a versiones anteriores. Ver también [`AGENTS.md`](./AGENTS.md). Ante la
> duda, consulta la documentación incluida en `node_modules/next/dist/docs/` y la web
> oficial **antes** de escribir código. No asumas APIs de memoria.

## 1. De qué trata el proyecto

CRM para profesionales de la salud de **cualquier** disciplina. Reglas de oro del dominio:

- **La especialidad es un dato, nunca comportamiento programado.** Prohibido un `if`
  basado en "si es fisioterapeuta…". Todo debe funcionar leyendo datos de la base.
- **Toda la interfaz va en español.** Ningún texto visible "quemado" en los componentes:
  los textos viven en `src/i18n/dictionaries/`. Así añadir inglés luego es trivial.
- **"MVP primero. Escalabilidad después."** Elige la solución más simple que cumpla el
  requisito y **documenta** la mejora futura (en `docs/` o en el PR) en lugar de
  implementarla ya. Nada de sobreingeniería.

El alcance del MVP y lo que queda para Fase 2 están en el `README.md`. **No construyas
nada de Fase 2** sin que se pida explícitamente.

## 2. Cómo se usa la IA aquí (lo más importante)

Este proyecto también es un proyecto de **aprendizaje**. La IA es un par-programador
rápido, no un autocompletado que se copia a ciegas.

1. **Arquitectura antes que código.** Antes de implementar, escribe (o pide a la IA que
   proponga) el diseño: entidades, relaciones, flujo de datos. Acuérdalo y solo entonces
   programa.
2. **Entiende cada línea que vas a commitear.** Si no puedes explicar por qué una línea
   está ahí, no la subas. Pide a la IA que te lo explique o que te haga razonar.
3. **No pegues código que no entiendes.** Vale pedir ejemplos y explicaciones; no vale
   hacer merge de algo que no comprendes.
4. **La IA puede equivocarse y "alucinar" APIs.** Verifica contra la documentación real,
   sobre todo con estas versiones nuevas. Si compila y los tests pasan, mejor; si no lo
   entiendes, sigue sin servir.
5. **Una IA no aprueba PRs.** La revisión la hace una persona (Aaron). La IA puede
   _sugerir_ revisiones, nunca sustituirlas.

## 3. Flujo de trabajo (Git / PRs)

- **Nunca trabajes directo en `main`.** Una rama por unidad de trabajo:
  `feat/…`, `fix/…`, `chore/…`, `docs/…`. Ej.: `feat/patient-records`.
- **PRs pequeños y enfocados.** Una responsabilidad por PR. Más fácil de revisar = se
  mergea antes.
- **Todo PR lo revisa Aaron antes del merge.** Abre el PR, descríbelo (qué, por qué, cómo
  probarlo) y avísale. No se mergea sin su aprobación.
- **Commits con mensaje claro** en estilo _conventional commits_:
  `feat: …`, `fix: …`, `chore: …`, `docs: …`, `test: …`, `refactor: …`.
- Commitea seguido, en incrementos que funcionan. Mejor varios commits pequeños que uno
  gigante.

## 4. Puertas de calidad (antes de abrir un PR)

Ejecuta y deja en verde, **en este orden**:

```bash
npm run lint        # ESLint
npm run typecheck   # TypeScript sin errores
npm run test        # Vitest
npm run build       # compila la build de producción
```

Si algo falla, se arregla antes de pedir revisión. No abras PRs en rojo.

## 5. Pruebas (TDD cuando aplique)

- La lógica de negocio (validaciones, cálculo de disponibilidad de citas, reglas como
  "nota clínica obligatoria si la cita está COMPLETADA") **va con tests**.
- Patrón recomendado: escribe primero un test que falle, luego el código que lo hace
  pasar. Hay un test de ejemplo en `src/i18n/dictionaries.test.ts`.
- No hace falta testear UI trivial ni configuración; sí la lógica que puede romperse.

## 6. Convenciones de código

- **TypeScript estricto.** Nada de `any` sin justificación; tipa las fronteras.
- **Una responsabilidad por archivo/entidad.** Si un archivo crece mucho, probablemente
  hace demasiado: divídelo.
- **Datos vs. presentación.** Las tablas se relacionan por **IDs**; los **nombres** solo
  se muestran. No dupliques datos que puedas obtener por relación.
- **Prisma 7.** El cliente se genera en `src/generated/prisma` (ignorado por git) y se
  importa desde ahí, no desde `@prisma/client`. La `DATABASE_URL` se lee en
  `prisma.config.ts`. Tras tocar el `schema.prisma`: `npm run db:migrate`.
- **Soft delete.** No se borran filas de pacientes/usuarios/etc.: se marca un booleano
  (`activo`/`active`). Pensamos en auditoría y trazabilidad.
- **i18n.** Cero strings de interfaz en los componentes; todo en `src/i18n/`.
- **Reglas de negocio:** principalmente en la aplicación; las restricciones críticas
  (unicidad, llaves foráneas) también en la base de datos vía Prisma.

## 7. Seguridad

- **Nunca** se commitea un secreto. Solo se versiona `.env.example`; el `.env` real está
  ignorado.
- Las contraseñas se guardan **hasheadas**, jamás en texto plano.
- No subas datos reales de pacientes. Los datos de demo (seed) son ficticios.

## 8. Documentación

- Mantén el `README.md` al día (cómo correr, variables de entorno, scripts).
- Las decisiones de arquitectura van en `docs/arquitectura.md`. Si tomas una decisión de
  diseño no obvia, anótala ahí o en la descripción del PR.
