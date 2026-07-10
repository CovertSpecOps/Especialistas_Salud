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
