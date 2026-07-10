# Arquitectura y decisiones de diseño

Documento vivo. Recoge el modelo conceptual acordado y las decisiones de diseño. Si tomas
una decisión nueva, anótala aquí.

## Principios

- **Especialidad = dato, no comportamiento.** El sistema es agnóstico a la disciplina.
- **Una responsabilidad por entidad.** `User` autentica; `Professional` describe al
  profesional; `Specialty` es catálogo; etc.
- **MVP primero, escalabilidad después.** La solución más simple que cumpla, con las
  mejoras futuras documentadas.
- **Soft delete + auditoría.** No se borran filas; se desactivan. Timestamps en todo.
- **IDs para relacionar, nombres para mostrar.** `cuid()` como identificador.

## Modelo conceptual (MVP)

> Diseño conceptual acordado. La implementación en `prisma/schema.prisma` es tarea del
> equipo (ver issues). Los nombres de campos son orientativos.

### Roles

`enum Role { ADMIN, PROFESSIONAL }` — no hay tabla `Role` (no aporta en el MVP).

### User — autenticación

`id (cuid)`, `email` (único, solo para login), `passwordHash`, `role`, `active`,
`createdAt`, `updatedAt`. La contraseña siempre hasheada. Soft delete vía `active`.

### Specialty — catálogo de especialidades

`id`, `nombre` (único), `descripcion`, `activa`, timestamps. Un admin puede ampliar la
lista. Sin duplicados.

### Professional — perfil del profesional

`id`, `userId`, `specialtyId`, `nombre`, `apellidos`, `correoContacto`, `telefono`,
`activo`, timestamps.

- `User` ↔ `Professional` = **1:1**.
- `Specialty` → `Professional` = **1:N** (un profesional, una especialidad en el MVP).
- _Futuro:_ N:M vía tabla intermedia si un profesional necesita varias especialidades.

### Patient — ficha del paciente

`id`, `identificacion` (única cuando exista), `nombre`, `apellidos`, `fechaNacimiento`,
`telefono`, `correo`, `direccion`, `alergias`, `condiciones`, `notasGenerales`, `activo`,
timestamps.

- El **nombre NO es único**.
- Detección de **posibles duplicados** por nombre + fecha de nacimiento + correo +
  teléfono + identificación: se **advierte**, no se bloquea de forma agresiva.

### Appointment — cita / evento clínico

`id`, `patientId`, `professionalId`, `fecha`, `hora`, `estado`, `motivo`, timestamps.

- `estado`: `enum { PROGRAMADA, CONFIRMADA, COMPLETADA, CANCELADA, NO_ASISTIO }`.
- `Patient` → `Appointment` = **1:N**.
- Duración fija de **30 min** en el MVP (configurable en el futuro).
- **No se permiten dos citas simultáneas** para un mismo profesional. La disponibilidad
  se calcula desde la aplicación consultando la base y mostrando solo horarios libres.

### ClinicalNote — documentación clínica

`id`, `appointmentId`, `tipo`, `contenido`, timestamps.

- `Appointment` → `ClinicalNote` = **1:1**.
- `tipo`: `enum { CLINICA, ADMINISTRATIVA }`.
- **Regla:** si `Appointment.estado == COMPLETADA`, la nota clínica es **obligatoria**
  (motivos clínicos, legales, de auditoría y de continuidad del tratamiento).

### Attachment — archivos

`id`, `patientId` (**obligatorio**), `appointmentId` (**opcional**), `nombreArchivo`,
`rutaArchivo`, `tipoArchivo`, timestamps.

- `Patient` → `Attachment` = **1:N**; relación opcional con `Appointment`.
- El paciente es obligatorio porque hay documentos del paciente que no pertenecen a una
  cita concreta. Permite validar `appointment.patientId == attachment.patientId`.

## Decisiones abiertas (a resolver durante el MVP)

Estas piezas del alcance todavía **no** tienen diseño cerrado. Hay que diseñarlas antes
de implementarlas:

1. **Plantillas de notas de sesión seleccionables.** El alcance pide plantillas
   _por visita_ (consulta general, fisioterapia, nutrición, dental, médica) entregadas
   **como datos**, más un campo libre siempre disponible. El `tipo` actual de
   `ClinicalNote` (`CLINICA`/`ADMINISTRATIVA`) es un eje distinto al de "plantilla":
   falta modelar el mecanismo de plantillas (¿entidad `NoteTemplate` + campos
   estructurados en JSON?). **Pendiente de diseño.**
2. **Implementación de autenticación.** Hay `passwordHash` en `User`, pero falta decidir
   _cómo_ (librería tipo Auth.js vs. solución propia) y cómo se modelan las sesiones.

## Roadmap de implementación (issues)

1. **MVP 1 — Esquema de datos base:** `User`, `Specialty`, `Professional` con relaciones
   reales en Prisma + primera migración + seed mínimo.
2. MVP 2 — `Patient` (con detección de duplicados) + búsqueda.
3. MVP 3 — `Appointment` + agenda y cálculo de disponibilidad.
4. MVP 4 — `ClinicalNote` + plantillas seleccionables (requiere cerrar la decisión 1).
5. MVP 5 — `Attachment` + línea de tiempo del paciente.
6. Autenticación y roles (puede adelantarse; requiere cerrar la decisión 2).

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
