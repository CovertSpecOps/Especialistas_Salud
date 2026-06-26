// Configuración de internacionalización (i18n).
//
// La interfaz es 100% en español. Esta estructura existe para que añadir
// inglés (u otro idioma) más adelante sea trivial: se agrega "en" a `locales`
// y un archivo dictionaries/en.json con las mismas claves que es.json.

export const locales = ["es"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "es";
