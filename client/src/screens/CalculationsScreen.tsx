import React, { memo, useMemo, useRef } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { NumberText } from "@/components/NumberText";
import { ValueWithUnit, UNITS } from "@/components/ValueWithUnit";
import { useTheme } from "@/hooks/useTheme";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useDay } from "@/contexts/DayContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRTL } from "@/hooks/useRTL";
import { getFlowLabelAndStyle } from "@/lib/flowLabel";
import {
  format2,
  format4,
} from "@/lib/storage";
import { computeCalculationsSummary } from "@/shared/lib/dayCalculations";

interface StatCardProps {
  title: string;
  value: string;
  unit: string;
  subtitle?: string;
  tone?: "blue" | "green" | "red" | "yellow";
  icon?: string;
  fullWidth?: boolean;
}

const StatCard = memo(function StatCard({ title, value, unit, subtitle, tone = "blue", icon, fullWidth }: StatCardProps) {
  const { theme } = useTheme();

  const colors = {
    blue: theme.primary,
    green: theme.success,
    red: theme.error,
    yellow: theme.warning,
  };

  const color = colors[tone];

  return (
    <View style={[styles.statCard, fullWidth && styles.statCardFull, { backgroundColor: color + "15", borderColor: color }]}>
      {icon ? (
        <View style={[styles.statIconCircle, { backgroundColor: color + "20" }]}>
          <Feather name={icon as any} size={20} color={color} />
        </View>
      ) : null}
      <ThemedText semanticVariant="labelPrimary" style={{ color, marginTop: icon ? Spacing.sm : 0 }}>
        {title}
      </ThemedText>
      <ValueWithUnit 
        value={value} 
        unit={unit}
        type="h2"
        valueStyle={{ color }}
        unitStyle={{ color: theme.textSecondary }}
      />
      {subtitle ? (
        <ThemedText semanticVariant="helper" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
          {subtitle}
        </ThemedText>
      ) : null}
    </View>
  );
});

export default function CalculationsScreen() {
  const renderCountRef = useRef(0);
  if (__DEV__) {
    renderCountRef.current += 1;
    console.log(`[render] CalculationsScreen #${renderCountRef.current}`);
  }

  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const layout = useResponsiveLayout();
  const { day, dateKey } = useDay();
  const { t, isRTL } = useLanguage();
  const { rtlRow, rtlText } = useRTL();

  const calculations = useMemo(() => {
    return computeCalculationsSummary(day);
  }, [day]);

  const flowStyle = useMemo(
    () => getFlowLabelAndStyle(calculations.exportVal >= 0, t, theme),
    [calculations.exportVal, t, theme]
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: tabBarHeight + Spacing.xl,
          paddingHorizontal: layout.horizontalPadding,
          maxWidth: layout.isTablet ? layout.contentMaxWidth : undefined,
          alignSelf: layout.isTablet ? "center" : undefined,
          width: layout.isTablet ? "100%" : undefined,
        }}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(300)} style={[styles.dateHeader, rtlRow, { gap: Spacing.md }]}>
          <View style={[styles.dateIconCircle, { backgroundColor: theme.primary + "20" }]}>
            <Feather name="calendar" size={16} color={theme.primary} />
          </View>
          <View style={[styles.inlineValueRow, rtlRow]}>
            <ThemedText semanticVariant="labelSecondary" style={{ color: theme.textSecondary }}>
              {t("calculations_for")}
            </ThemedText>
            <NumberText size="summary" style={{ color: theme.text }}>
              {dateKey}
            </NumberText>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(50).duration(300)}>
          <ThemedText semanticVariant="sectionTitle" style={styles.sectionTitle}>
            {t("energy_summary")}
          </ThemedText>
          <View style={layout.isTablet ? styles.tabletStatsGrid : styles.mobileStatsStack}>
            <StatCard
              title={t("production")}
              value={format2(calculations.production)}
              unit={UNITS.energy}
              tone="green"
              icon="zap"
              fullWidth={!layout.isTablet}
            />
            <StatCard
              title={flowStyle.text}
              value={format2(Math.abs(calculations.exportVal))}
              unit={UNITS.energy}
              tone={flowStyle.tone}
              icon={calculations.exportVal >= 0 ? "arrow-up-right" : "arrow-down-left"}
              fullWidth={!layout.isTablet}
            />
            <StatCard
              title={t("consumption")}
              value={format2(calculations.consumption)}
              unit={UNITS.energy}
              tone="yellow"
              icon="home"
              fullWidth={!layout.isTablet}
            />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(150).duration(300)}>
          <ThemedText semanticVariant="sectionTitle" style={styles.sectionTitle}>
            {t("gas_consumption")}
          </ThemedText>

          <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
            <View style={[styles.cardHeader, rtlRow, { borderBottomColor: theme.border, gap: Spacing.md }]}>
              <View style={[styles.iconCircle, { backgroundColor: theme.warning + "20" }]}>
                <Feather name="droplet" size={18} color={theme.warning} />
              </View>
              <ThemedText semanticVariant="labelPrimary">
                {t("per_turbine")}
              </ThemedText>
            </View>

            <View style={[styles.tableHeader, rtlRow, { borderBottomColor: theme.border }]}>
              <ThemedText semanticVariant="tableHeader" style={[styles.tableCell, { flex: 0.8, color: theme.textSecondary }]}>
                {t("turbine")}
              </ThemedText>
              <ThemedText semanticVariant="tableHeader" style={[styles.tableCell, { color: theme.textSecondary }]}>
                {t("diff_mwh")}
              </ThemedText>
              <ThemedText semanticVariant="tableHeader" style={[styles.tableCell, { color: theme.textSecondary }]}>
                {t("mw_per_hr")}
              </ThemedText>
              <ThemedText semanticVariant="tableHeader" style={[styles.tableCell, { color: theme.textSecondary }]}>
                {t("gas_m3")}
              </ThemedText>
              <ThemedText semanticVariant="tableHeader" style={[styles.tableCell, { color: theme.textSecondary }]}>
                {t("mmscf_unit")}
              </ThemedText>
            </View>

            {calculations.turbineData.map((r, index) => (
              <View
                key={r.t}
                style={[
                  styles.tableRow,
                  rtlRow,
                  index < calculations.turbineData.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: theme.border,
                  },
                ]}
              >
                <View style={[styles.tableCell, { flex: 0.8, flexDirection: "row", alignItems: "center" }]}>
                  <View style={[styles.turbineBadgeSmall, { backgroundColor: theme.success + "20" }]}>
                    <ThemedText semanticVariant="labelPrimary" style={{ color: theme.success }}>
                      {r.t}
                    </ThemedText>
                  </View>
                </View>
                <NumberText tier="input" style={styles.tableCell}>
                  {format2(r.diff)}
                </NumberText>
                <NumberText tier="input" style={styles.tableCell}>
                  {format2(r.mwPerHr)}
                </NumberText>
                <NumberText tier="input" style={[styles.tableCell, { color: theme.warning }]}>
                  {format2(r.gasM3)}
                </NumberText>
                <NumberText tier="input" style={[styles.tableCell, { color: theme.warning }]}>
                  {format4(r.gasMMscf)}
                </NumberText>
              </View>
            ))}
          </View>

          <View style={styles.statsRow}>
            <StatCard
              title={t("total_gas")}
              value={format2(calculations.totalGasM3)}
              unit={UNITS.gasM3}
              tone="yellow"
              icon="droplet"
            />
            <StatCard
              title={t("total_gas")}
              value={format4(calculations.totalGasMMscf)}
              unit={UNITS.gasMMscf}
              tone="yellow"
              icon="droplet"
            />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(250).duration(300)}>
          <ThemedText semanticVariant="sectionTitle" style={styles.sectionTitle}>
            {t("formula_reference")}
          </ThemedText>

          <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
            <View style={[styles.formulaRow, rtlRow, { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
              <View style={[styles.formulaLabelRow, rtlRow]}>
                <View style={[styles.formulaDot, { backgroundColor: theme.success }]} />
                <ThemedText semanticVariant="labelSecondary" style={{ color: theme.textSecondary }}>
                  {t("production")}
                </ThemedText>
              </View>
              <ThemedText semanticVariant="tableCell" style={{ color: theme.primary }}>
                {t("sum_turbine_diff")}
              </ThemedText>
            </View>
            <View style={[styles.formulaRow, rtlRow, { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
              <View style={[styles.formulaLabelRow, rtlRow]}>
                <View style={[styles.formulaDot, { backgroundColor: theme.primary }]} />
                <ThemedText semanticVariant="labelSecondary" style={{ color: theme.textSecondary }}>
                  {t("export_withdrawal_label")}
                </ThemedText>
              </View>
              <ThemedText semanticVariant="tableCell" style={{ color: theme.primary }}>
                {t("sum_feeder_diff")}
              </ThemedText>
            </View>
            <View style={[styles.formulaRow, rtlRow, { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
              <View style={[styles.formulaLabelRow, rtlRow]}>
                <View style={[styles.formulaDot, { backgroundColor: theme.warning }]} />
                <ThemedText semanticVariant="labelSecondary" style={{ color: theme.textSecondary }}>
                  {t("consumption")}
                </ThemedText>
              </View>
              <ThemedText semanticVariant="tableCell" style={{ color: theme.primary }}>
                {t("production_minus_export")}
              </ThemedText>
            </View>
            <View style={[styles.formulaRow, rtlRow]}>
              <View style={[styles.formulaLabelRow, rtlRow]}>
                <View style={[styles.formulaDot, { backgroundColor: theme.warning }]} />
                <ThemedText semanticVariant="labelSecondary" style={{ color: theme.textSecondary }}>
                  {t("gas_formula")}
                </ThemedText>
              </View>
              <View style={styles.gasFormulas}>
                <View style={styles.gasFormulaRow}>
                  <ThemedText semanticVariant="tableHeader" style={{ color: theme.textSecondary }} numeric>MW/h ≤ 3:</ThemedText>
                  <ThemedText semanticVariant="tableHeader" style={{ color: theme.warning }} numeric>
                    Diff × 1000
                  </ThemedText>
                </View>
                <View style={styles.gasFormulaRow}>
                  <ThemedText semanticVariant="tableHeader" style={{ color: theme.textSecondary }} numeric>MW/h ≤ 5:</ThemedText>
                  <ThemedText semanticVariant="tableHeader" style={{ color: theme.warning }} numeric>
                    Diff × 700
                  </ThemedText>
                </View>
                <View style={styles.gasFormulaRow}>
                  <ThemedText semanticVariant="tableHeader" style={{ color: theme.textSecondary }} numeric>MW/h ≤ 8:</ThemedText>
                  <ThemedText semanticVariant="tableHeader" style={{ color: theme.warning }} numeric>
                    Diff × 500
                  </ThemedText>
                </View>
                <View style={styles.gasFormulaRow}>
                  <ThemedText semanticVariant="tableHeader" style={{ color: theme.textSecondary }} numeric>{"MW/h > 8:"}</ThemedText>
                  <ThemedText semanticVariant="tableHeader" style={{ color: theme.warning }} numeric>
                    Diff × 420
                  </ThemedText>
                </View>
              </View>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  dateHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  inlineValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },
  dateIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  statsRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  mobileStatsStack: {
    flexDirection: "column",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  tabletStatsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    minWidth: 140,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    alignItems: "center",
    gap: Spacing.xs,
    minHeight: 152,
  },
  statCardFull: {
    flex: undefined,
    width: "100%",
  },
  statIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  statValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: Spacing.xs,
  },
  card: {
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderBottomWidth: 1,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  tableHeader: {
    flexDirection: "row",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    minHeight: 48,
    alignItems: "center",
  },
  tableRow: {
    flexDirection: "row",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    alignItems: "center",
    minHeight: 48,
  },
  tableCell: {
    flex: 1,
    textAlign: "center",
    includeFontPadding: false,
  },
  turbineBadgeSmall: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  formulaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  formulaLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  formulaDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  gasFormulas: {
    alignItems: "flex-end",
    flexShrink: 1,
  },
  gasFormulaRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
});
