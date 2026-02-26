import type { Language, TranslationKey } from "@/lib/i18n";

type TranslateFn = (key: TranslationKey) => string;

export function formatShiftBadgeLabel(
  letter: string,
  language: Language,
  t: TranslateFn
): string {
  const prefix = language === "ar" ? t("meal_prefix") : t("shift_prefix");
  return `${prefix} ${letter}`;
}
