import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "@/components/ThemedText";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSyncStatus } from "@/contexts/SyncContext";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing, withAlpha } from "@/constants/theme";

export function SyncStatusIndicator() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { status, pendingCount } = useSyncStatus();

  const config = useMemo(() => {
    switch (status) {
      case "offline":
        return {
          icon: "wifi-off" as const,
          label: t("sync_status_offline"),
          color: theme.warning,
        };
      case "syncing":
        return {
          icon: "refresh-cw" as const,
          label: t("sync_status_syncing"),
          color: theme.primary,
        };
      case "failed":
        return {
          icon: "alert-circle" as const,
          label: t("sync_status_failed"),
          color: theme.error,
        };
      default:
        return {
          icon: "check-circle" as const,
          label: t("sync_status_synced"),
          color: theme.success,
        };
    }
  }, [status, t, theme.error, theme.primary, theme.success, theme.warning]);

  const label =
    pendingCount > 0 ? `${config.label} (${pendingCount})` : config.label;

  return (
    <View
      pointerEvents="none"
      style={[
        styles.container,
        {
          top: insets.top + Spacing.xs,
          backgroundColor: withAlpha(theme.backgroundDefault, 0.92),
          borderColor: withAlpha(config.color, 0.32),
        },
      ]}
    >
      <Feather name={config.icon} size={13} color={config.color} />
      <ThemedText
        semanticVariant="helper"
        style={[styles.text, { color: config.color }]}
      >
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    right: Spacing.md,
    zIndex: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
  },
  text: {
    lineHeight: 15,
  },
});
