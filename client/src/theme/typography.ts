import type { TextStyle } from "react-native";
import { FONT_FAMILIES } from "@/theme/fonts";

// Typography source of truth: language-aware text fonts, fixed number font, and semantic variants.
export type TextWeight = "regular" | "semibold" | "bold";
export type NumberSizeTier = "small" | "input" | "summary" | "output" | "final" | "kpi";
export type TypographySizeToken = "xs" | "sm" | "md" | "lg" | "xl" | "xxl";
export type SupportedLanguage = "en" | "ar";
export type ResolvableLanguage = SupportedLanguage | string | null | undefined;
export type TypographyScaleToken =
  | "display"
  | "title"
  | "heading"
  | "subheading"
  | "body"
  | "caption"
  | "small";
export type TypographyVariant =
  | "screenTitle"
  | "sectionTitle"
  | "labelPrimary"
  | "labelSecondary"
  | "valuePrimary"
  | "valueSecondary"
  | "unit"
  | "helper"
  | "helperText"
  | "button"
  | "buttonText"
  | "tabLabel"
  | "tableHeader"
  | "tableCellLabel"
  | "tableCellValue"
  | "tableCell";

type TypographyVariantStyle = TextStyle & { numeric?: boolean };

export type TypographyFamilies = {
  englishRegular: string;
  englishSemiBold: string;
  englishBold: string;
  arabicRegular: string;
  arabicSemiBold: string;
  arabicBold: string;
  numbersRegular: string;
  numbersSemiBold: string;
  numbersBold: string;
  monospace: string;
  uiRegular: string;
  uiSemiBold: string;
  uiBold: string;
  sizes: Record<TypographySizeToken, number>;
  numberSizes: Record<NumberSizeTier, number>;
  scale: Record<TypographyScaleToken, number>;
  lineHeights: Record<TypographyScaleToken, number>;
  weights: Record<TextWeight, TextWeight>;
  variants: Record<TypographyVariant, TypographyVariantStyle>;
  getUIFamily: (weight?: TextWeight) => string;
  getTextFamily: (weight?: TextWeight, language?: ResolvableLanguage) => string;
  getNumberFamily: (weight?: TextWeight) => string;
  getTextInputStyle: (weight?: TextWeight, language?: ResolvableLanguage) => Pick<TextStyle, "fontFamily">;
  getVariantStyle: (variant: TypographyVariant, language?: ResolvableLanguage) => TextStyle;
};

const SCALE = 1.0;
const scaleValue = (value: number): number => Math.round(value * SCALE);

export const sizeTokens: Record<TypographySizeToken, number> = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 24,
  xxl: 32,
};

export const numberSizes: Record<NumberSizeTier, number> = {
  small: scaleValue(sizeTokens.sm),
  input: scaleValue(sizeTokens.md),
  summary: scaleValue(sizeTokens.sm),
  output: scaleValue(sizeTokens.lg),
  final: scaleValue(sizeTokens.xxl),
  kpi: scaleValue(sizeTokens.xxl),
};

export const typeScale: Record<TypographyScaleToken, number> = {
  display: scaleValue(32),
  title: scaleValue(24),
  heading: scaleValue(18),
  subheading: scaleValue(16),
  body: scaleValue(16),
  caption: scaleValue(12),
  small: scaleValue(14),
};

export const lineHeights: Record<TypographyScaleToken, number> = {
  display: 40,
  title: 32,
  heading: 26,
  subheading: 24,
  body: 24,
  caption: 18,
  small: 20,
};

const baseTypography = {
  englishRegular: FONT_FAMILIES.englishRegular,
  englishSemiBold: FONT_FAMILIES.englishSemiBold,
  englishBold: FONT_FAMILIES.englishBold,
  arabicRegular: FONT_FAMILIES.arabicRegular,
  arabicSemiBold: FONT_FAMILIES.arabicSemiBold,
  arabicBold: FONT_FAMILIES.arabicBold,
  numbersRegular: FONT_FAMILIES.numbers,
  numbersSemiBold: FONT_FAMILIES.numbers,
  numbersBold: FONT_FAMILIES.numbers,
  monospace: FONT_FAMILIES.numbers,
} as const;

function normalizeLanguage(language?: ResolvableLanguage): SupportedLanguage {
  return language === "ar" ? "ar" : "en";
}

function getUIFamilyForLanguage(language: ResolvableLanguage, weight: TextWeight = "regular"): string {
  if (normalizeLanguage(language) === "ar") {
    if (weight === "bold") return baseTypography.arabicBold;
    if (weight === "semibold") return baseTypography.arabicSemiBold;
    return baseTypography.arabicRegular;
  }

  if (weight === "bold") return baseTypography.englishBold;
  if (weight === "semibold") return baseTypography.englishSemiBold;
  return baseTypography.englishRegular;
}

function getNumberFamily(weight: TextWeight = "regular"): string {
  if (weight === "bold") return baseTypography.numbersBold;
  if (weight === "semibold") return baseTypography.numbersSemiBold;
  return baseTypography.numbersRegular;
}

function variant(scaleToken: TypographyScaleToken, weight: TextWeight, numeric = false): TypographyVariantStyle {
  return {
    fontSize: typeScale[scaleToken],
    lineHeight: lineHeights[scaleToken],
    fontWeight: weight === "regular" ? "400" : weight === "semibold" ? "600" : "700",
    numeric,
  };
}

const semanticVariants: Record<TypographyVariant, TypographyVariantStyle> = {
  screenTitle: variant("title", "bold"),
  sectionTitle: variant("heading", "semibold"),
  labelPrimary: variant("small", "semibold"),
  labelSecondary: variant("caption", "regular"),
  valuePrimary: variant("heading", "semibold", true),
  valueSecondary: variant("body", "regular", true),
  unit: variant("caption", "regular"),
  helper: variant("caption", "regular"),
  helperText: variant("caption", "regular"),
  button: variant("body", "semibold"),
  buttonText: variant("body", "semibold"),
  tabLabel: {
    ...variant("caption", "semibold"),
    fontSize: 11,
    lineHeight: 16,
  },
  tableHeader: variant("caption", "semibold"),
  tableCellLabel: variant("caption", "regular"),
  tableCellValue: variant("body", "regular"),
  tableCell: variant("body", "regular"),
};

function weightFromFontWeight(fontWeight?: TextStyle["fontWeight"]): TextWeight {
  if (fontWeight === "700" || fontWeight === "800" || fontWeight === "900" || fontWeight === "bold") {
    return "bold";
  }
  if (fontWeight === "500" || fontWeight === "600") {
    return "semibold";
  }
  return "regular";
}

export function createTypography(language: ResolvableLanguage = "en"): TypographyFamilies {
  const getTextFamily = (weight: TextWeight = "regular", lang: ResolvableLanguage = language) =>
    getUIFamilyForLanguage(lang, weight);

  const getVariantStyle = (name: TypographyVariant, lang: ResolvableLanguage = language): TextStyle => {
    const def = semanticVariants[name];
    const weight = weightFromFontWeight(def.fontWeight);

    return {
      ...def,
      fontFamily: def.numeric ? getNumberFamily(weight) : getTextFamily(weight, lang),
    };
  };

  return {
    ...baseTypography,
    uiRegular: getTextFamily("regular"),
    uiSemiBold: getTextFamily("semibold"),
    uiBold: getTextFamily("bold"),
    sizes: sizeTokens,
    numberSizes,
    scale: typeScale,
    lineHeights,
    weights: {
      regular: "regular",
      semibold: "semibold",
      bold: "bold",
    },
    variants: semanticVariants,
    getUIFamily: (weight = "regular") => getTextFamily(weight),
    getTextFamily,
    getNumberFamily,
    getTextInputStyle: (weight = "regular", lang: ResolvableLanguage = language) => ({
      fontFamily: getTextFamily(weight, lang),
    }),
    getVariantStyle,
  };
}

export function resolveTypography(language: ResolvableLanguage = "en"): TypographyFamilies {
  return createTypography(language);
}

export const typography: TypographyFamilies = createTypography("en");

const ARABIC_REGEX =
  /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
const NUMERIC_LIKE_REGEX = /^[\s+\-−–—().,/:٠-٩0-9]+$/;

export function isArabicText(text: string): boolean {
  return ARABIC_REGEX.test(text);
}

export function isNumericLikeText(text: string): boolean {
  const normalized = text.trim();
  return normalized.length > 0 && NUMERIC_LIKE_REGEX.test(normalized);
}

export function getFontFamilyForText(
  text: string,
  families: TypographyFamilies = typography,
  weight: TextWeight = "regular",
  options?: { preferNumbersForNumeric?: boolean; language?: SupportedLanguage }
): string {
  if (options?.preferNumbersForNumeric && isNumericLikeText(text)) {
    return families.getNumberFamily(weight);
  }

  if (options?.language) {
    return families.getTextFamily(weight, options.language);
  }

  return isArabicText(text) ? families.getTextFamily(weight, "ar") : families.getTextFamily(weight, "en");
}
