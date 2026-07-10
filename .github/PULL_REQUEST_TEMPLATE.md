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
