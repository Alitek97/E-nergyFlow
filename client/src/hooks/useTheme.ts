import { useThemeMode } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { createTypography } from "@/theme/typography";

export function useTheme() {
  const { theme, isDark, mode, setMode, colorTheme, setColorTheme } = useThemeMode();
  const { language } = useLanguage();
  const typography = createTypography(language);

  return {
    theme,
    typography,
    numberSizes: typography.numberSizes,
    isDark,
    mode,
    setMode,
    colorTheme,
    setColorTheme,
  };
}
