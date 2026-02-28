import React, { useMemo } from "react";
import * as Haptics from "expo-haptics";

import SettingsOptionListScreen from "@/screens/settings/SettingsOptionListScreen";
import { LANGUAGES } from "@/screens/settings/settingsOptions";
import { useLanguage } from "@/contexts/LanguageContext";

export default function LanguageSettingsScreen() {
  const { t, language, setLanguage } = useLanguage();

  const options = useMemo(
    () =>
      LANGUAGES.map((option) => ({
        key: option.code,
        title: option.nativeName,
        subtitle: undefined,
        selected: language === option.code,
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setLanguage(option.code);
        },
        testID: `button-language-${option.code}`,
      })),
    [language, setLanguage]
  );

  return <SettingsOptionListScreen options={options} helperText={t("select_language")} />;
}
