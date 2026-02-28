import React, { useMemo } from "react";
import * as Haptics from "expo-haptics";

import SettingsOptionListScreen from "@/screens/settings/SettingsOptionListScreen";
import { THEME_OPTIONS } from "@/screens/settings/settingsOptions";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";

export default function ThemeSettingsScreen() {
  const { mode, setMode } = useTheme();
  const { t } = useLanguage();

  const options = useMemo(
    () =>
      THEME_OPTIONS.map((option) => ({
        key: option.mode,
        title: t(option.titleKey),
        subtitle: t(option.descKey),
        selected: mode === option.mode,
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setMode(option.mode);
        },
        testID: `button-theme-${option.mode}`,
      })),
    [mode, setMode, t]
  );

  return <SettingsOptionListScreen options={options} helperText={t("theme_helper_top")} />;
}
