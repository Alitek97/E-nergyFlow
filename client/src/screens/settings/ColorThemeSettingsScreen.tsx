import React, { useMemo } from "react";
import * as Haptics from "expo-haptics";

import SettingsOptionListScreen from "@/screens/settings/SettingsOptionListScreen";
import { COLOR_THEME_OPTIONS } from "@/screens/settings/settingsOptions";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";

export default function ColorThemeSettingsScreen() {
  const { colorTheme, setColorTheme } = useTheme();
  const { t } = useLanguage();

  const options = useMemo(
    () =>
      COLOR_THEME_OPTIONS.map((option) => ({
        key: option.name,
        title: t(option.titleKey),
        subtitle: t(option.descKey),
        selected: colorTheme === option.name,
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setColorTheme(option.name);
        },
        testID: `button-color-theme-${option.name}`,
      })),
    [colorTheme, setColorTheme, t]
  );

  return <SettingsOptionListScreen options={options} helperText={t("color_theme_helper_top")} />;
}
