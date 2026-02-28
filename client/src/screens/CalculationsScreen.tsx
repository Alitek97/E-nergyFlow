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
import { FeederCode } from "@/components/FeederCode";
import { NumberText } from "@/components/NumberText";
import { ValueWithUnit } from "@/components/ValueWithUnit";
import { useTheme } from "@/hooks/useTheme";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useDay } from "@/contexts/DayContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUnits } from "@/contexts/UnitsContext";
import { useRTL } from "@/hooks/useRTL";
import { getFlowLabelAndStyle } from "@/lib/flowLabel";
import { computeCalculationsSummary } from "@/shared/lib/dayCalculations";
import { formatEnergy, formatGas, formatPower } from "@/utils/units";

interface StatCardProps {
  title: string;
  value: string;
  unit: string;
  subtitle?: string;
  tone?: "blue" | "green" | "red" | "yellow";
  icon?: string;
  fullWidth?: boolean;
}

const TURBINE_COLUMN_WIDTH = 72;

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
  const { unitsConfig } = useUnits();
  const { rtlRow, rtlText } = useRTL();

  const calculations = useMemo(() => {
    return computeCalculationsSummary(day);
  }, [day]);

  const flowStyle = useMemo(
    () => getFlowLabelAndStyle(calculations.exportVal >= 0, t, theme),
    [calculations.exportVal, t, theme]
  );
  const productionText = useMemo(
    () => formatEnergy(calculations.production, unitsConfig, { prefer: "fixed" }),
    [calculations.production, unitsConfig]
  );
  const flowText = useMemo(
    () => formatEnergy(Math.abs(calculations.exportVal), unitsConfig, { prefer: "fixed" }),
    [calculations.exportVal, unitsConfig]
  );
  const consumptionText = useMemo(
    () => formatEnergy(calculations.consumption, unitsConfig, { prefer: "fixed" }),
    [calculations.consumption, unitsConfig]
  );
  const totalGasText = useMemo(
    () => formatGas(calculations.totalGasM3, unitsConfig),
    [calculations.totalGasM3, unitsConfig]
  );
  const gasUnitText = useMemo(() => formatGas(0, unitsConfig).unitText, [unitsConfig]);

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
              value={productionText.valueText}
              unit={productionText.unitText}
              tone="green"
              icon="zap"
              fullWidth={!layout.isTablet}
            />
            <StatCard
              title={flowStyle.text}
              value={flowText.valueText}
              unit={flowText.unitText}
              tone={flowStyle.tone}
              icon={calculations.exportVal >= 0 ? "arrow-up-right" : "arrow-down-left"}
              fullWidth={!layout.isTablet}
            />
            <StatCard
              title={t("consumption")}
              value={consumptionText.valueText}
              unit={consumptionText.unitText}
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
              <ThemedText
                semanticVariant="tableHeader"
                style={[styles.tableCell, styles.turbineColumn, styles.turbineHeaderCell, { color: theme.textSecondary }]}
              >
                {t("turbine")}
              </ThemedText>
              <ThemedText semanticVariant="tableHeader" style={[styles.tableCell, { flex: 1.05, color: theme.textSecondary }]}>
                {`${t("diff")} (${unitsConfig.energyUnit})`}
              </ThemedText>
              <ThemedText semanticVariant="tableHeader" style={[styles.tableCell, { flex: 1.05, color: theme.textSecondary }]}>
                {`${unitsConfig.powerUnit}/h`}
              </ThemedText>
              <ThemedText semanticVariant="tableHeader" style={[styles.tableCell, { flex: 1.2, color: theme.textSecondary }]}>
                {`${t("gas_consumed")} (${gasUnitText})`}
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
                <View style={[styles.tableCell, styles.turbineColumn, styles.turbineBodyCell]}>
                  <View style={[styles.turbineBadgeSmall, { backgroundColor: theme.success + "20" }]}>
                    <FeederCode code={r.t} style={[styles.turbineBadgeCodeSmall, { color: theme.success }]} />
                  </View>
                </View>
                <NumberText tier="input" style={[styles.tableCell, { flex: 1.05 }]}>
                  {formatEnergy(r.diff, unitsConfig, { prefer: "fixed" }).valueText}
                </NumberText>
                <NumberText tier="input" style={[styles.tableCell, { flex: 1.05 }]}>
                  {formatPower(r.mwPerHr, unitsConfig).valueText}
                </NumberText>
                <NumberText tier="input" style={[styles.tableCell, { flex: 1.2, color: theme.warning }]}>
                  {formatGas(r.gasM3, unitsConfig).valueText}
                </NumberText>
              </View>
            ))}
          </View>

          <View style={styles.statsRow}>
            <StatCard
              title={t("total_gas")}
              value={totalGasText.valueText}
              unit={totalGasText.unitText}
              tone="yellow"
              icon="droplet"
              fullWidth
            />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(250).duration(300)}>
          <ThemedText semanticVariant="sectionTitle" style={styles.sectionTitle}>
            {t("formula_reference")}
          </ThemedText>

          <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
            <View style={[styles.formulaRow, rtlRow, { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
              <View style={styles.formulaLabelColumn}>
                <View style={[styles.formulaLabelRow, rtlRow]}>
                  <View style={[styles.formulaDot, { backgroundColor: theme.success }]} />
                  <ThemedText semanticVariant="labelSecondary" style={[rtlText, { color: theme.textSecondary }]}>
                    {t("production")}
                  </ThemedText>
                </View>
              </View>
              <View style={[styles.formulaValueColumn, { alignItems: isRTL ? "flex-start" : "flex-end" }]}>
                <ThemedText semanticVariant="tableCell" style={[styles.formulaValueText, { color: theme.primary, textAlign: isRTL ? "left" : "right" }]}>
                  {t("sum_turbine_diff")}
                </ThemedText>
              </View>
            </View>
            <View style={[styles.formulaRow, rtlRow, { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
              <View style={styles.formulaLabelColumn}>
                <View style={[styles.formulaLabelRow, rtlRow]}>
                  <View style={[styles.formulaDot, { backgroundColor: theme.primary }]} />
                  <ThemedText semanticVariant="labelSecondary" style={[rtlText, { color: theme.textSecondary }]}>
                    {t("export_withdrawal_label")}
                  </ThemedText>
                </View>
              </View>
              <View style={[styles.formulaValueColumn, { alignItems: isRTL ? "flex-start" : "flex-end" }]}>
                <ThemedText semanticVariant="tableCell" style={[styles.formulaValueText, { color: theme.primary, textAlign: isRTL ? "left" : "right" }]}>
                  {t("sum_feeder_diff")}
                </ThemedText>
              </View>
            </View>
            <View style={[styles.formulaRow, rtlRow, { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
              <View style={styles.formulaLabelColumn}>
                <View style={[styles.formulaLabelRow, rtlRow]}>
                  <View style={[styles.formulaDot, { backgroundColor: theme.warning }]} />
                  <ThemedText semanticVariant="labelSecondary" style={[rtlText, { color: theme.textSecondary }]}>
                    {t("consumption")}
                  </ThemedText>
                </View>
              </View>
              <View style={[styles.formulaValueColumn, { alignItems: isRTL ? "flex-start" : "flex-end" }]}>
                <ThemedText semanticVariant="tableCell" style={[styles.formulaValueText, { color: theme.primary, textAlign: isRTL ? "left" : "right" }]}>
                  {t("production_minus_export")}
                </ThemedText>
              </View>
            </View>
            <View style={[styles.formulaRow, styles.formulaRowTop, rtlRow]}>
              <View style={styles.formulaLabelColumn}>
                <View style={[styles.formulaLabelRow, rtlRow]}>
                  <View style={[styles.formulaDot, { backgroundColor: theme.warning }]} />
                  <ThemedText semanticVariant="labelSecondary" style={[rtlText, { color: theme.textSecondary }]}>
                    {t("gas_formula")}
                  </ThemedText>
                </View>
              </View>
              <View style={[styles.formulaValueColumn, { alignItems: isRTL ? "flex-start" : "flex-end" }]}>
                <View style={[styles.gasFormulas, { alignItems: isRTL ? "flex-start" : "flex-end" }]}>
                <View style={[styles.gasFormulaRow, { justifyContent: isRTL ? "flex-start" : "flex-end" }]}>
                  <ThemedText semanticVariant="tableHeader" style={[styles.gasFormulaConditionText, { color: theme.textSecondary }]} numeric>{`${unitsConfig.powerUnit}/h ≤ 3:`}</ThemedText>
                  <ThemedText semanticVariant="tableHeader" style={[styles.gasFormulaExpressionText, { color: theme.warning }]} numeric>
                    Diff × 1000
                  </ThemedText>
                </View>
                <View style={[styles.gasFormulaRow, { justifyContent: isRTL ? "flex-start" : "flex-end" }]}>
                  <ThemedText semanticVariant="tableHeader" style={[styles.gasFormulaConditionText, { color: theme.textSecondary }]} numeric>{`${unitsConfig.powerUnit}/h ≤ 5:`}</ThemedText>
                  <ThemedText semanticVariant="tableHeader" style={[styles.gasFormulaExpressionText, { color: theme.warning }]} numeric>
                    Diff × 700
                  </ThemedText>
                </View>
                <View style={[styles.gasFormulaRow, { justifyContent: isRTL ? "flex-start" : "flex-end" }]}>
                  <ThemedText semanticVariant="tableHeader" style={[styles.gasFormulaConditionText, { color: theme.textSecondary }]} numeric>{`${unitsConfig.powerUnit}/h ≤ 8:`}</ThemedText>
                  <ThemedText semanticVariant="tableHeader" style={[styles.gasFormulaExpressionText, { color: theme.warning }]} numeric>
                    Diff × 500
                  </ThemedText>
                </View>
                <View style={[styles.gasFormulaRow, styles.gasFormulaRowLast, { justifyContent: isRTL ? "flex-start" : "flex-end" }]}>
                  <ThemedText semanticVariant="tableHeader" style={[styles.gasFormulaConditionText, { color: theme.textSecondary }]} numeric>{`${unitsConfig.powerUnit}/h > 8:`}</ThemedText>
                  <ThemedText semanticVariant="tableHeader" style={[styles.gasFormulaExpressionText, { color: theme.warning }]} numeric>
                    Diff × 420
                  </ThemedText>
                </View>
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
    flexDirection: "column",
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
  turbineColumn: {
    flex: 0,
    width: TURBINE_COLUMN_WIDTH,
  },
  turbineHeaderCell: {
    textAlign: "center",
  },
  turbineBodyCell: {
    justifyContent: "center",
    alignItems: "center",
  },
  turbineBadgeSmall: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  turbineBadgeCodeSmall: {
    fontSize: 13,
    lineHeight: 18,
  },
  formulaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.lg,
    gap: Spacing.sm,
    minHeight: 64,
  },
  formulaRowTop: {
    alignItems: "flex-start",
  },
  formulaLabelColumn: {
    flex: 1,
    minWidth: 0,
  },
  formulaLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  formulaValueColumn: {
    flex: 1,
    minWidth: 0,
  },
  formulaValueText: {
    width: "100%",
  },
  formulaDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  gasFormulas: {
    width: "100%",
    flexShrink: 1,
  },
  gasFormulaRow: {
    flexDirection: "row",
    marginBottom: Spacing.xs,
  },
  gasFormulaRowLast: {
    marginBottom: 0,
  },
  gasFormulaConditionText: {
    writingDirection: "ltr",
    textAlign: "left",
  },
  gasFormulaExpressionText: {
    writingDirection: "ltr",
    textAlign: "left",
    marginLeft: Spacing.sm,
  },
});
