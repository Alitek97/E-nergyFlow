import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { Spacing } from "@/constants/theme";
import SettingsSubpageLayout from "@/components/settings/SettingsSubpageLayout";
import SettingsHeaderHint from "@/components/settings/SettingsHeaderHint";
import { SETTINGS_SUBPAGE_SIZES } from "@/components/settings/settingsSubpageStyles";

export type SettingsOptionRow = {
  key: string;
  title: string;
  subtitle?: string;
  selected: boolean;
  onPress: () => void;
  testID?: string;
};

type Props = {
  options: SettingsOptionRow[];
  helperText?: string;
};

export default function SettingsOptionListScreen({ options, helperText }: Props) {
  const { theme } = useTheme();
  const { isRTL } = useLanguage();

  return (
    <SettingsSubpageLayout>
      {helperText ? (
        <SettingsHeaderHint text={helperText} />
      ) : null}

      <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
        {options.map((option, index) => (
          <Pressable
            key={option.key}
            style={[
              styles.row,
              { flexDirection: isRTL ? "row-reverse" : "row" },
              {
                borderBottomColor: theme.border,
                borderBottomWidth: index < options.length - 1 ? StyleSheet.hairlineWidth : 0,
              },
            ]}
            onPress={option.onPress}
            accessibilityRole="button"
            accessibilityState={{ selected: option.selected }}
            testID={option.testID}
          >
            <View style={styles.rowTextBlock}>
              <ThemedText
                semanticVariant="labelPrimary"
                style={[styles.optionTitle, { textAlign: isRTL ? "right" : "left" }]}
              >
                {option.title}
              </ThemedText>
              {option.subtitle ? (
                <ThemedText
                  semanticVariant="labelSecondary"
                  style={[
                    styles.optionSubtitle,
                    { color: theme.textSecondary, textAlign: isRTL ? "right" : "left" },
                  ]}
                >
                  {option.subtitle}
                </ThemedText>
              ) : null}
            </View>

            <View style={styles.rowTrailing}>
              {option.selected ? <Feather name="check" size={20} color={theme.primary} /> : null}
            </View>
          </Pressable>
        ))}
      </View>
    </SettingsSubpageLayout>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: SETTINGS_SUBPAGE_SIZES.cardRadius,
    overflow: "hidden",
  },
  row: {
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
    minHeight: SETTINGS_SUBPAGE_SIZES.rowMinHeight,
    paddingHorizontal: Spacing.lg,
    paddingVertical: SETTINGS_SUBPAGE_SIZES.rowVerticalPadding,
    borderRadius: 0,
    marginBottom: 0,
  },
  rowTextBlock: {
    flex: 1,
    gap: 4,
    paddingHorizontal: 1,
  },
  optionTitle: {
    fontSize: SETTINGS_SUBPAGE_SIZES.rowTitleSize,
    lineHeight: 22,
    paddingVertical: 1,
  },
  optionSubtitle: {
    fontSize: SETTINGS_SUBPAGE_SIZES.rowSubtitleSize,
    lineHeight: 18,
    paddingVertical: 1,
  },
  rowTrailing: {
    width: 22,
    alignItems: "center",
    justifyContent: "center",
  },
});
