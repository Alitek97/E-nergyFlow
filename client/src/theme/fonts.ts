// Central font registry for Expo `useFonts`.
// Import `loadFonts()` in `App.tsx` and use `FONT_FAMILIES` everywhere else.
export const FONT_FAMILIES = {
  englishRegular: "English-Regular",
  englishSemiBold: "English-SemiBold",
  englishBold: "English-Bold",
  arabicRegular: "Arabic-Regular",
  arabicSemiBold: "Arabic-SemiBold",
  arabicBold: "Arabic-Bold",
  numbers: "Numbers",
} as const;

export type FontFamilyKey = keyof typeof FONT_FAMILIES;
export type FontFamilyName = (typeof FONT_FAMILIES)[FontFamilyKey];

export function loadFonts() {
  return {
    [FONT_FAMILIES.englishRegular]: require("../../../assets/fonts/English-Regular.ttf"),
    [FONT_FAMILIES.englishSemiBold]: require("../../../assets/fonts/English-SemiBold.ttf"),
    [FONT_FAMILIES.englishBold]: require("../../../assets/fonts/English-Bold.ttf"),
    [FONT_FAMILIES.arabicRegular]: require("../../../assets/fonts/Arabic-Regular.ttf"),
    [FONT_FAMILIES.arabicSemiBold]: require("../../../assets/fonts/Arabic-SemiBold.ttf"),
    [FONT_FAMILIES.arabicBold]: require("../../../assets/fonts/Arabic-Bold.ttf"),
    [FONT_FAMILIES.numbers]: require("../../../assets/fonts/Numbers.ttf"),
  } as const;
}

