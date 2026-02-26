import React, { useState } from "react";
import { View, StyleSheet, Pressable, Modal } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "./ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { Language } from "@/lib/i18n";

interface LanguageOption {
  code: Language;
  name: string;
  nativeName: string;
}

const LANGUAGES: LanguageOption[] = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "ar", name: "Arabic", nativeName: "العربية" },
];

export function LanguageSwitcher() {
  const { theme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const [showModal, setShowModal] = useState(false);

  const handleSelectLanguage = (lang: Language) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLanguage(lang);
    setShowModal(false);
  };

  const currentLang = LANGUAGES.find((l) => l.code === language);

  return (
    <>
      <Pressable
        style={[styles.button, { backgroundColor: theme.primary + "20" }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setShowModal(true);
        }}
        testID="button-language"
      >
        <Feather name="globe" size={18} color={theme.primary} />
        <ThemedText type="small" style={{ color: theme.primary, fontWeight: "600" }}>
          {currentLang?.code.toUpperCase()}
        </ThemedText>
      </Pressable>

      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setShowModal(false)}>
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <ThemedText type="h3">{t("language")}</ThemedText>
              <Pressable onPress={() => setShowModal(false)}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>

            {LANGUAGES.map((lang) => (
              <Pressable
                key={lang.code}
                style={[
                  styles.languageOption,
                  language === lang.code && { backgroundColor: theme.primary + "15" },
                ]}
                onPress={() => handleSelectLanguage(lang.code)}
              >
                <View style={styles.languageInfo}>
                  <ThemedText type="body" style={{ fontWeight: "600" }}>
                    {lang.nativeName}
                  </ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>
                    {lang.name}
                  </ThemedText>
                </View>
                {language === lang.code ? (
                  <Feather name="check" size={20} color={theme.primary} />
                ) : null}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    gap: Spacing.xs,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  modalContent: {
    width: "100%",
    maxWidth: 320,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
    borderBottomWidth: 1,
  },
  languageOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
  },
  languageInfo: {
    flex: 1,
  },
});
