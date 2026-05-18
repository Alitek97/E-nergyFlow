import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/ThemedText";
import { BorderRadius, Shadows, Spacing, withAlpha } from "@/constants/theme";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSyncStatus } from "@/contexts/SyncContext";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import { useTheme } from "@/hooks/useTheme";
import type { SyncEngineStatus } from "@/lib/syncEngine";

type FeatherIconName = React.ComponentProps<typeof Feather>["name"];

interface StatusConfig {
  icon: FeatherIconName;
  indicatorLabel: string;
  detailsLabel: string;
  color: string;
}

function formatCount(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function formatSyncTime(
  value: string | null,
  language: "en" | "ar",
  fallback: string,
): string {
  if (!value) return fallback;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;

  try {
    return new Intl.DateTimeFormat(language === "ar" ? "ar-IQ" : "en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
}

function DetailRow({
  icon,
  label,
  value,
  valueColor,
  isRTL,
}: {
  icon: FeatherIconName;
  label: string;
  value: string;
  valueColor?: string;
  isRTL: boolean;
}) {
  const { theme } = useTheme();

  return (
    <View style={[styles.detailRow, isRTL && styles.rowRTL]}>
      <View
        style={[
          styles.detailIcon,
          {
            backgroundColor: theme.surfaceMuted,
            borderColor: theme.border,
          },
        ]}
      >
        <Feather name={icon} size={14} color={valueColor ?? theme.primary} />
      </View>
      <View style={styles.detailCopy}>
        <ThemedText
          family="text"
          semanticVariant="helper"
          style={[
            styles.detailLabel,
            { color: theme.textSecondary, textAlign: isRTL ? "right" : "left" },
          ]}
        >
          {label}
        </ThemedText>
        <ThemedText
          family="text"
          semanticVariant="labelPrimary"
          numberOfLines={2}
          style={[
            styles.detailValue,
            {
              color: valueColor ?? theme.text,
              textAlign: isRTL ? "right" : "left",
            },
          ]}
        >
          {value}
        </ThemedText>
      </View>
    </View>
  );
}

export function SyncStatusIndicator() {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { t, isRTL, language } = useLanguage();
  const layout = useResponsiveLayout();
  const {
    status,
    pendingCount,
    queueSummary,
    lastSuccessfulSyncAt,
    localDatabaseStatus,
    isOnline,
    triggerSync,
  } = useSyncStatus();
  const [detailsVisible, setDetailsVisible] = useState(false);
  const opacity = useRef(new Animated.Value(1)).current;

  const effectiveStatus: SyncEngineStatus = !isOnline ? "offline" : status;

  const config: StatusConfig = useMemo(() => {
    switch (effectiveStatus) {
      case "offline":
        return {
          icon: "wifi-off",
          indicatorLabel: t("sync_status_offline"),
          detailsLabel: t("sync_details_status_offline"),
          color: theme.warning,
        };
      case "syncing":
        return {
          icon: "refresh-cw",
          indicatorLabel: t("sync_status_syncing"),
          detailsLabel: t("sync_details_status_syncing"),
          color: theme.primary,
        };
      case "failed":
        return {
          icon: "alert-circle",
          indicatorLabel: t("sync_status_failed"),
          detailsLabel: t("sync_details_status_failed"),
          color: theme.error,
        };
      default:
        return {
          icon: "check-circle",
          indicatorLabel: t("sync_status_synced"),
          detailsLabel: t("sync_details_status_synced"),
          color: theme.success,
        };
    }
  }, [
    effectiveStatus,
    t,
    theme.error,
    theme.primary,
    theme.success,
    theme.warning,
  ]);

  const label =
    pendingCount > 0
      ? `${config.indicatorLabel} (${pendingCount})`
      : config.indicatorLabel;

  useEffect(() => {
    opacity.setValue(0.76);
    Animated.timing(opacity, {
      toValue: 1,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [config.color, label, opacity]);

  const pendingChangesText = formatCount(
    pendingCount,
    t("sync_details_change_singular"),
    t("sync_details_change_plural"),
  );

  const queueStatus = useMemo(() => {
    if (localDatabaseStatus.status !== "ready") {
      return t("sync_details_queue_unavailable");
    }

    if (queueSummary.total === 0) {
      return t("sync_details_queue_clear");
    }

    if (queueSummary.failed > 0 && queueSummary.pending > 0) {
      return `${formatCount(
        queueSummary.failed,
        t("sync_details_issue_singular"),
        t("sync_details_issue_plural"),
      )} / ${formatCount(
        queueSummary.pending,
        t("sync_details_waiting_singular"),
        t("sync_details_waiting_plural"),
      )}`;
    }

    if (queueSummary.failed > 0) {
      return formatCount(
        queueSummary.failed,
        t("sync_details_issue_singular"),
        t("sync_details_issue_plural"),
      );
    }

    return formatCount(
      queueSummary.pending,
      t("sync_details_waiting_singular"),
      t("sync_details_waiting_plural"),
    );
  }, [
    localDatabaseStatus.status,
    queueSummary.failed,
    queueSummary.pending,
    queueSummary.total,
    t,
  ]);

  const localDatabaseLabel =
    localDatabaseStatus.status === "ready"
      ? t("sync_details_database_ready")
      : localDatabaseStatus.status === "checking"
        ? t("sync_details_database_checking")
        : t("sync_details_database_unavailable");

  const lastSyncText = formatSyncTime(
    lastSuccessfulSyncAt,
    language,
    t("sync_details_last_sync_never"),
  );

  const statusHint =
    effectiveStatus === "offline"
      ? t("sync_details_offline_hint")
      : effectiveStatus === "failed"
        ? t("sync_details_failed_hint")
        : effectiveStatus === "syncing"
          ? t("sync_details_syncing_hint")
          : t("sync_details_synced_hint");

  const showRetryButton =
    queueSummary.total > 0 || effectiveStatus === "failed";
  const retryDisabled = effectiveStatus === "syncing";

  const handleRetry = useCallback(async () => {
    if (retryDisabled) return;
    await triggerSync();
  }, [retryDisabled, triggerSync]);

  const indicatorPosition = isRTL
    ? { left: Spacing.md }
    : { right: Spacing.md };
  const detailsWidth = Math.min(
    layout.screenWidth - Spacing.md * 2,
    layout.isTablet ? 380 : 344,
  );

  return (
    <>
      <Animated.View
        style={[
          styles.container,
          indicatorPosition,
          {
            top: insets.top + Spacing.xs,
            opacity,
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityHint={t("sync_details_open_hint")}
          onPress={() => setDetailsVisible(true)}
          style={({ pressed }) => [
            styles.indicator,
            isRTL && styles.rowRTL,
            {
              backgroundColor: withAlpha(theme.backgroundDefault, 0.94),
              borderColor: withAlpha(config.color, 0.32),
              opacity: pressed ? 0.78 : 1,
            },
          ]}
        >
          <Feather name={config.icon} size={13} color={config.color} />
          <ThemedText
            family="text"
            semanticVariant="helper"
            numberOfLines={1}
            style={[styles.text, { color: config.color }]}
          >
            {label}
          </ThemedText>
        </Pressable>
      </Animated.View>

      <Modal
        visible={detailsVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDetailsVisible(false)}
      >
        <Pressable
          style={[
            styles.modalOverlay,
            {
              alignItems: isRTL ? "flex-start" : "flex-end",
              backgroundColor: withAlpha(
                theme.backgroundRoot,
                isDark ? 0.58 : 0.42,
              ),
              paddingTop: insets.top + 44,
            },
          ]}
          onPress={() => setDetailsVisible(false)}
        >
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={[
              styles.detailsCard,
              {
                width: detailsWidth,
                backgroundColor: theme.backgroundDefault,
                borderColor: theme.borderStrong,
                shadowColor: theme.cardShadow,
              },
            ]}
          >
            <View style={[styles.header, isRTL && styles.rowRTL]}>
              <View style={[styles.titleGroup, isRTL && styles.rowRTL]}>
                <View
                  style={[
                    styles.statusIcon,
                    {
                      backgroundColor: withAlpha(
                        config.color,
                        isDark ? 0.18 : 0.12,
                      ),
                      borderColor: withAlpha(config.color, 0.28),
                    },
                  ]}
                >
                  <Feather name={config.icon} size={16} color={config.color} />
                </View>
                <View style={styles.titleCopy}>
                  <ThemedText
                    family="text"
                    semanticVariant="labelPrimary"
                    style={[
                      styles.title,
                      {
                        color: theme.text,
                        textAlign: isRTL ? "right" : "left",
                      },
                    ]}
                  >
                    {t("sync_details_title")}
                  </ThemedText>
                  <ThemedText
                    family="text"
                    semanticVariant="helper"
                    style={[
                      styles.subtitle,
                      {
                        color: theme.textSecondary,
                        textAlign: isRTL ? "right" : "left",
                      },
                    ]}
                  >
                    {statusHint}
                  </ThemedText>
                </View>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("cancel")}
                onPress={() => setDetailsVisible(false)}
                style={({ pressed }) => [
                  styles.closeButton,
                  {
                    backgroundColor: theme.surfaceMuted,
                    opacity: pressed ? 0.72 : 1,
                  },
                ]}
              >
                <Feather name="x" size={16} color={theme.textSecondary} />
              </Pressable>
            </View>

            <View style={styles.detailsList}>
              <DetailRow
                icon={config.icon}
                label={t("sync_details_current_status")}
                value={config.detailsLabel}
                valueColor={config.color}
                isRTL={isRTL}
              />
              <DetailRow
                icon="database"
                label={t("sync_details_pending_changes")}
                value={pendingChangesText}
                isRTL={isRTL}
              />
              <DetailRow
                icon="clock"
                label={t("sync_details_last_success")}
                value={lastSyncText}
                isRTL={isRTL}
              />
              <DetailRow
                icon="hard-drive"
                label={t("sync_details_local_database")}
                value={localDatabaseLabel}
                valueColor={
                  localDatabaseStatus.status === "unavailable"
                    ? theme.error
                    : theme.success
                }
                isRTL={isRTL}
              />
              <DetailRow
                icon="list"
                label={t("sync_details_queue_status")}
                value={queueStatus}
                valueColor={
                  queueSummary.failed > 0 && isOnline ? theme.error : undefined
                }
                isRTL={isRTL}
              />
            </View>

            {effectiveStatus === "failed" && (
              <ThemedText
                family="text"
                semanticVariant="helper"
                style={[
                  styles.issueText,
                  {
                    color: theme.textSecondary,
                    backgroundColor: theme.errorSoft,
                    borderColor: withAlpha(theme.error, 0.2),
                    textAlign: isRTL ? "right" : "left",
                  },
                ]}
              >
                {t("sync_details_failed_hint")}
              </ThemedText>
            )}

            {showRetryButton && (
              <Pressable
                accessibilityRole="button"
                disabled={retryDisabled}
                onPress={handleRetry}
                style={({ pressed }) => [
                  styles.retryButton,
                  isRTL && styles.rowRTL,
                  {
                    backgroundColor: retryDisabled
                      ? theme.surfaceMuted
                      : theme.primary,
                    opacity: pressed && !retryDisabled ? 0.84 : 1,
                  },
                ]}
              >
                {retryDisabled ? (
                  <ActivityIndicator size="small" color={theme.textSecondary} />
                ) : (
                  <Feather
                    name="refresh-cw"
                    size={15}
                    color={theme.buttonText}
                  />
                )}
                <ThemedText
                  family="text"
                  semanticVariant="button"
                  style={{
                    color: retryDisabled
                      ? theme.textSecondary
                      : theme.buttonText,
                  }}
                >
                  {retryDisabled
                    ? t("sync_details_retrying")
                    : t("sync_details_retry")}
                </ThemedText>
              </Pressable>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    zIndex: 20,
  },
  indicator: {
    minHeight: 30,
    maxWidth: 260,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
  },
  rowRTL: {
    flexDirection: "row-reverse",
  },
  text: {
    lineHeight: 15,
    flexShrink: 1,
  },
  modalOverlay: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  detailsCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    gap: Spacing.md,
    ...Shadows.card,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  titleGroup: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  titleCopy: {
    flex: 1,
    gap: 3,
  },
  statusIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    lineHeight: 19,
  },
  subtitle: {
    lineHeight: 16,
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  detailsList: {
    gap: Spacing.sm,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  detailIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  detailCopy: {
    flex: 1,
    gap: 2,
  },
  detailLabel: {
    lineHeight: 15,
  },
  detailValue: {
    lineHeight: 18,
  },
  issueText: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    lineHeight: 16,
  },
  retryButton: {
    minHeight: 42,
    borderRadius: BorderRadius.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
});
