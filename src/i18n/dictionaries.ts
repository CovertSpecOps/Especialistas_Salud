// Punto de acceso a los textos de la interfaz.
//
// Uso (en un Server Component):
//   import { getDictionary } from "@/i18n/dictionaries";
//   const t = getDictionary();
//   <h1>{t.home.title}</h1>
//
// Centralizar los textos aquí mantiene la UI libre de strings "quemados"
// y deja todo listo para traducir a otros idiomas.

import type { Locale } from "./config";
import { defaultLocale } from "./config";
import es from "./dictionaries/es.json";

const dictionaries = { es } as const;

export type Dictionary = typeof es;

export function getDictionary(locale: Locale = defaultLocale): Dictionary {
  return dictionaries[locale];
}
