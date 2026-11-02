export const supportedLocales = ["es-AR"] as const;
export type Locale = (typeof supportedLocales)[number];
export const defaultLocale: Locale = "es-AR";
export const messages = {
  "es-AR": {
    brand: "BAMBEE",
    tagline: "Creciendo juntos, desde el comienzo.",
    unpublished: "Información en preparación",
    saved: "Cambios guardados",
  },
} as const;
export function translate(
  key: keyof (typeof messages)["es-AR"],
  locale: Locale = defaultLocale,
) {
  return messages[locale][key];
}
