import { translations, type Locale, type TranslationKey } from "./translations"

export function t(key: TranslationKey, locale: Locale = "en"): string {
  return (translations[locale][key] as string | undefined) ?? (translations.en[key] as string | undefined) ?? key
}

export { type Locale, type TranslationKey }
