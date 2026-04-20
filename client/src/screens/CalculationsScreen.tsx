import React, { memo, useMemo } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { FeederCode } from "@/components/FeederCode";
import { NumberText } from "@/components/NumberText";
import { OverviewStatCardContent } from "@/components/OverviewStatCardContent";
import { ValueWithUnit } from "@/components/ValueWithUnit";
import { useTheme } from "@/hooks/useTheme";
import {
  getResponsiveScrollContentStyle,
  getResponsiveValue,
  useResponsiveLayout,
} from "@/hooks/useResponsiveLayout";
import { useScadaEffects } from "@/hooks/useScadaEffects";
import { Spacing } from "@/constants/theme";
import { useDay } from "@/contexts/DayContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUnits } from "@/contexts/UnitsContext";
import { useRTL } from "@/hooks/useRTL";
import { ScreenBackground } from "@/components/visual/ScreenBackground";
import { EnergyFlowOverlay } from "@/components/visual/EnergyFlowOverlay";
import { ScadaGridOverlay } from "@/components/visual/ScadaGridOverlay";
import { getFlowLabelAndStyle } from "@/lib/flowLabel";
import { computeCalculationsSummary } from "@/shared/lib/dayCalculations";
import { formatEnergy, formatGas, formatPower } from "@/utils/units";

interface StatCardProps {
  title: string;
  value: string;
  unit: string;
  accentColor: string;
  icon: string;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

const TURBINE_COLUMN_WIDTH = 72;
const SECTION_GAP = 28;
const CARD_PADDING = 20;
const ROW_GAP = 14;
const SCADA_RADIUS = 18;
const ENABLE_POWER_GRID_BG = true;
const ENABLE_ENERGY_FLOW = true;
const ENABLE_SCADA_GRID = true;
const SCADA_VISUAL_VERIFY = false;
const GAS_TABLE_COLUMN_FLEX = 1;

const StatCard = memo(function StatCard({
  title,
  value,
  unit,
  accentColor,
  icon,
  fullWidth,
  style,
}: StatCardProps) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.energyCard,
        fullWidth && styles.energyCardFull,
        style,
        {
          shadowColor: theme.primary,
          backgroundColor: theme.backgroundDefault,
          borderColor: theme.border,
        },
      ]}
    >
      <View
        style={[
          styles.energyIconCircle,
          { backgroundColor: accentColor + "24" },
        ]}
      >
        <Feather name={icon as any} size={20} color={accentColor} />
      </View>
      <ThemedText
        semanticVariant="labelSecondary"
        style={{ color: theme.textSecondary, marginTop: Spacing.sm }}
      >
        {title}
      </ThemedText>
      <ValueWithUnit
        value={value}
        unit={unit}
        type="h2"
        valueStyle={{ color: accentColor }}
        unitStyle={{ color: theme.textSecondary }}
      />
    </View>
  );
});

export default function CalculationsScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme, isDark } = useTheme();
  const layout = useResponsiveLayout();
  const { day, dateKey } = useDay();
  const { t, isRTL } = useLanguage();
  const { unitsConfig } = useUnits();
  const { rtlRow, rtlText } = useRTL();
  const { scadaEffectsEnabled } = useScadaEffects();
  const backgroundOpacity =
    SCADA_VISUAL_VERIFY && scadaEffectsEnabled ? 0.12 : 0.06;
  const flowOpacity = SCADA_VISUAL_VERIFY && scadaEffectsEnabled ? 0.18 : 0.08;
  const gridOpacity = SCADA_VISUAL_VERIFY && scadaEffectsEnabled ? 0.1 : 0.04;

  const calculations = useMemo(() => {
    return computeCalculationsSummary(day);
  }, [day]);

  const flowStyle = useMemo(
    () => getFlowLabelAndStyle(calculations.exportVal >= 0, t, theme),
    [calculations.exportVal, t, theme],
  );
  const productionText = useMemo(
    () =>
      formatEnergy(calculations.production, unitsConfig, {
        prefer: "fixed",
        precision: "adaptive",
      }),
    [calculations.production, unitsConfig],
  );
  const flowText = useMemo(
    () =>
      formatEnergy(Math.abs(calculations.exportVal), unitsConfig, {
        prefer: "fixed",
        precision: "adaptive",
      }),
    [calculations.exportVal, unitsConfig],
  );
  const consumptionText = useMemo(
    () =>
      formatEnergy(calculations.consumption, unitsConfig, {
        prefer: "fixed",
        precision: "adaptive",
      }),
    [calculations.consumption, unitsConfig],
  );
  const totalGasText = useMemo(
    () => formatGas(calculations.totalGasM3, unitsConfig, { display: "smart" }),
    [calculations.totalGasM3, unitsConfig],
  );
  const gasUnitText = useMemo(
    () => formatGas(0, unitsConfig).unitText,
    [unitsConfig],
  );
  const isCompactPhone = layout.isCompactPhone;
  const showWideLayout = layout.isWideLayout;
  const sectionSpacingStyle = { marginTop: SECTION_GAP };
  const scrollContentStyle = useMemo(
    () =>
      getResponsiveScrollContentStyle(layout, {
        headerHeight,
        tabBarHeight,
        topSpacing: Spacing.lg,
        bottomSpacing: Spacing.xl,
      }),
    [headerHeight, layout, tabBarHeight],
  );
  const energyCardStyle = showWideLayout ? styles.energyCardWide : undefined;
  const turbineTableMinWidth = getResponsiveValue(layout, {
    compactPhone: 520,
    largePhone: 560,
    widePhone: layout.contentWidth,
    tablet: layout.contentWidth,
    default: layout.contentWidth,
  });
  const productionAccent = theme.primary;
  const flowAccent = flowStyle.color;
  const consumptionAccent = theme.warning;
  const cardBackgroundColor = theme.backgroundDefault;
  const cardBorderColor = theme.border;
  const dividerColor = theme.border;
  const tableHeaderSurfaceColor = cardBackgroundColor;
  const tableAlternateRowColor = theme.backgroundSecondary;
  const totalGasAccentColor = theme.warning;
  const totalGasBorderColor = cardBorderColor;
  const totalGasBackgroundColor = cardBackgroundColor;
  const readyTurbines = calculations.turbineData.filter(
    (row) => !row.isStopped && !row.hasError,
  ).length;
  const flaggedTurbines = calculations.turbineData.filter(
    (row) => row.hasError,
  ).length;
  const stoppedTurbines = calculations.turbineData.filter(
    (row) => row.isStopped,
  ).length;
  const avgOutput = readyTurbines
    ? calculations.turbineData.reduce(
        (sum, row) => sum + (row.mwPerHr ?? 0),
        0,
      ) / readyTurbines
    : 0;
  const avgOutputText = useMemo(
    () => formatPower(avgOutput, unitsConfig, { display: "smart" }),
    [avgOutput, unitsConfig],
  );
  const snapshotItems = [
    {
      key: "ready",
      label: t("calculations_ready_turbines"),
      value: readyTurbines,
      tone: theme.success,
    },
    {
      key: "flagged",
      label: t("calculations_flagged_turbines"),
      value: flaggedTurbines,
      tone: theme.error,
    },
    {
      key: "stopped",
      label: t("calculations_stopped_turbines"),
      value: stoppedTurbines,
      tone: theme.warning,
    },
    {
      key: "avg",
      label: t("calculations_avg_output"),
      value: avgOutputText.valueText,
      unit: `${avgOutputText.unitText}/h`,
      tone: theme.primary,
    },
  ] as const;

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View style={styles.overlayRoot}>
        <View pointerEvents="none" style={styles.backgroundLayer}>
          <ScreenBackground
            enabled={ENABLE_POWER_GRID_BG}
            opacity={backgroundOpacity}
          />
        </View>
        {scadaEffectsEnabled ? (
          <View pointerEvents="none" style={styles.flowLayer}>
            <EnergyFlowOverlay
              enabled={ENABLE_ENERGY_FLOW && isDark}
              opacity={flowOpacity}
            />
          </View>
        ) : null}
        {scadaEffectsEnabled ? (
          <View pointerEvents="none" style={styles.gridLayer}>
            <ScadaGridOverlay
              enabled={ENABLE_SCADA_GRID && isDark}
              opacity={gridOpacity}
            />
          </View>
        ) : null}
        <View style={styles.contentLayer}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={scrollContentStyle}
            scrollIndicatorInsets={{ bottom: insets.bottom }}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View
              entering={FadeInDown.duration(240)}
              style={styles.pageHeader}
            >
              <View style={styles.dateLineRow}>
                <View
                  style={[
                    styles.dateLineSegment,
                    { backgroundColor: theme.border },
                  ]}
                />
                <NumberText size="small" style={{ color: theme.primary }}>
                  {dateKey}
                </NumberText>
                <View
                  style={[
                    styles.dateLineSegment,
                    { backgroundColor: theme.border },
                  ]}
                />
              </View>
            </Animated.View>

            <Animated.View
              entering={FadeInDown.delay(40).duration(300)}
              style={[
                styles.overviewCard,
                {
                  backgroundColor: cardBackgroundColor,
                  borderColor: cardBorderColor,
                },
              ]}
            >
              <View style={[styles.overviewHeader, rtlRow]}>
                <View style={[styles.overviewTitleRow, rtlRow]}>
                  <View
                    style={[
                      styles.dateIconCircle,
                      { backgroundColor: theme.primary + "20" },
                    ]}
                  >
                    <Feather name="activity" size={16} color={theme.primary} />
                  </View>
                  <View style={styles.overviewTitleText}>
                    <ThemedText semanticVariant="sectionTitle">
                      {t("calculations_overview")}
                    </ThemedText>
                    <ThemedText
                      semanticVariant="helper"
                      style={{ color: theme.textSecondary }}
                    >
                      {t("calculations_hint")}
                    </ThemedText>
                  </View>
                </View>
              </View>

              <View style={[styles.snapshotGrid, { gap: layout.gridGap }]}>
                {snapshotItems.map((item) => (
                  <View
                    key={item.key}
                    style={[
                      styles.snapshotItem,
                      { backgroundColor: item.tone + "10" },
                    ]}
                  >
                    <OverviewStatCardContent
                      centered
                      label={item.label}
                      value={item.value}
                      unit={"unit" in item ? item.unit : undefined}
                      toneColor={item.tone}
                    />
                  </View>
                ))}
              </View>
            </Animated.View>

            <Animated.View
              entering={FadeInDown.delay(50).duration(300)}
              style={sectionSpacingStyle}
            >
              <View style={styles.sectionHeader}>
                <ThemedText
                  semanticVariant="sectionTitle"
                  style={styles.sectionTitle}
                >
                  {t("energy_summary")}
                </ThemedText>
                <ThemedText
                  semanticVariant="helper"
                  style={{ color: theme.textSecondary }}
                >
                  {flowStyle.text}
                </ThemedText>
              </View>
              <View
                style={[
                  styles.energyGrid,
                  { gap: layout.gridGap },
                  isCompactPhone && styles.energyGridCompact,
                ]}
              >
                <StatCard
                  title={t("production")}
                  value={productionText.valueText}
                  unit={productionText.unitText}
                  accentColor={productionAccent}
                  icon="zap"
                  style={energyCardStyle}
                />
                <StatCard
                  title={flowStyle.text}
                  value={flowText.valueText}
                  unit={flowText.unitText}
                  accentColor={flowAccent}
                  icon={
                    calculations.exportVal >= 0
                      ? "arrow-up-right"
                      : "arrow-down-left"
                  }
                  style={energyCardStyle}
                />
                <StatCard
                  title={t("consumption")}
                  value={consumptionText.valueText}
                  unit={consumptionText.unitText}
                  accentColor={consumptionAccent}
                  icon="home"
                  fullWidth={!showWideLayout}
                  style={energyCardStyle}
                />
              </View>
            </Animated.View>

            <Animated.View
              entering={FadeInDown.delay(150).duration(300)}
              style={sectionSpacingStyle}
            >
              <View style={styles.sectionHeader}>
                <ThemedText
                  semanticVariant="sectionTitle"
                  style={styles.sectionTitle}
                >
                  {t("gas_consumption")}
                </ThemedText>
                <ThemedText
                  semanticVariant="helper"
                  style={{ color: theme.textSecondary }}
                >
                  {t("calculations_table_hint")}
                </ThemedText>
              </View>

              <View
                style={[
                  styles.gasSectionLayout,
                  showWideLayout && styles.gasSectionLayoutWide,
                ]}
              >
                <View
                  style={[
                    styles.card,
                    styles.systemCard,
                    styles.gasTableCard,
                    {
                      shadowColor: theme.cardShadow,
                      backgroundColor: cardBackgroundColor,
                      borderColor: cardBorderColor,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.cardHeader,
                      rtlRow,
                      { borderBottomColor: dividerColor, gap: Spacing.md },
                    ]}
                  >
                    <View
                      style={[
                        styles.iconCircle,
                        { backgroundColor: theme.warningSoft },
                      ]}
                    >
                      <Feather name="droplet" size={18} color={theme.warning} />
                    </View>
                    <View style={styles.cardHeaderText}>
                      <ThemedText semanticVariant="labelPrimary">
                        {t("per_turbine")}
                      </ThemedText>
                      <ThemedText
                        semanticVariant="helper"
                        style={{ color: theme.textSecondary }}
                      >
                        {t("calculations_table_hint")}
                      </ThemedText>
                    </View>
                  </View>

                  <ScrollView
                    horizontal={!showWideLayout}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={
                      !showWideLayout ? styles.tableScrollContent : undefined
                    }
                  >
                    <View
                      style={[
                        styles.tableContent,
                        !showWideLayout && { minWidth: turbineTableMinWidth },
                      ]}
                    >
                      <View
                        style={[
                          styles.tableHeader,
                          rtlRow,
                          {
                            backgroundColor: tableHeaderSurfaceColor,
                            borderBottomColor: dividerColor,
                          },
                        ]}
                      >
                        <View
                          style={[styles.tableCell, styles.tableColumnTurbine]}
                        >
                          <ThemedText
                            semanticVariant="tableHeader"
                            style={[
                              styles.tableHeaderText,
                              styles.turbineHeaderCell,
                              { color: theme.textSecondary },
                            ]}
                          >
                            {t("turbine")}
                          </ThemedText>
                        </View>
                        <View
                          style={[styles.tableCell, styles.tableColumnNumeric]}
                        >
                          <ThemedText
                            semanticVariant="tableHeader"
                            style={[
                              styles.tableHeaderText,
                              styles.numericHeaderCell,
                              { color: theme.textSecondary },
                            ]}
                          >
                            {`${t("diff")} (${unitsConfig.energyUnit})`}
                          </ThemedText>
                        </View>
                        <View
                          style={[styles.tableCell, styles.tableColumnNumeric]}
                        >
                          <ThemedText
                            semanticVariant="tableHeader"
                            style={[
                              styles.tableHeaderText,
                              styles.numericHeaderCell,
                              { color: theme.textSecondary },
                            ]}
                          >
                            {`${unitsConfig.powerUnit}/h`}
                          </ThemedText>
                        </View>
                        <View
                          style={[styles.tableCell, styles.tableColumnNumeric]}
                        >
                          <ThemedText
                            semanticVariant="tableHeader"
                            style={[
                              styles.tableHeaderText,
                              styles.numericHeaderCell,
                              { color: theme.textSecondary },
                            ]}
                          >
                            {`${t("gas_consumed")} (${gasUnitText})`}
                          </ThemedText>
                        </View>
                      </View>

                      {calculations.turbineData.map((r, index) => (
                        <View
                          key={r.t}
                          style={[
                            styles.tableRow,
                            rtlRow,
                            {
                              backgroundColor: r.hasError
                                ? theme.error + "10"
                                : r.isStopped
                                  ? theme.warning + "10"
                                  : index % 2 === 0
                                    ? "transparent"
                                    : tableAlternateRowColor,
                            },
                            index < calculations.turbineData.length - 1 && {
                              borderBottomWidth: 1,
                              borderBottomColor: dividerColor,
                            },
                          ]}
                        >
                          <View
                            style={[
                              styles.tableCell,
                              styles.tableColumnTurbine,
                              styles.turbineBodyCell,
                            ]}
                          >
                            <View
                              style={[
                                styles.turbineBadgeSmall,
                                {
                                  backgroundColor: r.hasError
                                    ? theme.error + "18"
                                    : r.isStopped
                                      ? theme.warning + "18"
                                      : theme.success + "20",
                                },
                              ]}
                            >
                              <FeederCode
                                code={r.t}
                                style={[
                                  styles.turbineBadgeCodeSmall,
                                  {
                                    color: r.hasError
                                      ? theme.error
                                      : r.isStopped
                                        ? theme.warning
                                        : theme.success,
                                  },
                                ]}
                              />
                            </View>
                          </View>
                          <View
                            style={[
                              styles.tableCell,
                              styles.tableColumnNumeric,
                            ]}
                          >
                            <NumberText
                              tier="input"
                              style={[
                                styles.tableBodyText,
                                styles.numericBodyCell,
                              ]}
                            >
                              {r.diff === null
                                ? "-"
                                : formatEnergy(r.diff, unitsConfig, {
                                    prefer: "fixed",
                                    precision: "adaptive",
                                  }).valueText}
                            </NumberText>
                          </View>
                          <View
                            style={[
                              styles.tableCell,
                              styles.tableColumnNumeric,
                            ]}
                          >
                            <NumberText
                              tier="input"
                              style={[
                                styles.tableBodyText,
                                styles.numericBodyCell,
                              ]}
                            >
                              {r.mwPerHr === null
                                ? "-"
                                : formatPower(r.mwPerHr, unitsConfig, {
                                    display: "smart",
                                  }).valueText}
                            </NumberText>
                          </View>
                          <View
                            style={[
                              styles.tableCell,
                              styles.tableColumnNumeric,
                            ]}
                          >
                            <NumberText
                              tier="input"
                              style={[
                                styles.tableBodyText,
                                styles.numericBodyCell,
                                { color: theme.warning },
                              ]}
                            >
                              {r.gasM3 === null
                                ? "-"
                                : formatGas(r.gasM3, unitsConfig, {
                                    display: "smart",
                                  }).valueText}
                            </NumberText>
                          </View>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                </View>

                <View
                  style={[
                    styles.totalGasCard,
                    showWideLayout && styles.totalGasCardWide,
                    {
                      shadowColor: theme.cardShadow,
                      borderColor: totalGasBorderColor,
                      backgroundColor: totalGasBackgroundColor,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.totalGasIconCircle,
                      { backgroundColor: theme.warningSoft },
                    ]}
                  >
                    <Feather
                      name="droplet"
                      size={22}
                      color={totalGasAccentColor}
                    />
                  </View>
                  <ThemedText
                    semanticVariant="labelPrimary"
                    style={{ color: theme.text, marginTop: Spacing.sm }}
                  >
                    {t("total_gas")}
                  </ThemedText>
                  <ValueWithUnit
                    value={totalGasText.valueText}
                    unit={totalGasText.unitText}
                    type="h2"
                    valueStyle={{ color: totalGasAccentColor }}
                    unitStyle={{ color: theme.textSecondary }}
                  />
                </View>
              </View>
            </Animated.View>

            <Animated.View
              entering={FadeInDown.delay(250).duration(300)}
              style={sectionSpacingStyle}
            >
              <View style={styles.sectionHeader}>
                <ThemedText
                  semanticVariant="sectionTitle"
                  style={styles.sectionTitle}
                >
                  {t("formula_reference")}
                </ThemedText>
                <ThemedText
                  semanticVariant="helper"
                  style={{ color: theme.textSecondary }}
                >
                  {t("calculations_formula_hint")}
                </ThemedText>
              </View>

              <View
                style={[
                  styles.card,
                  styles.systemCard,
                  {
                    shadowColor: theme.primary,
                    backgroundColor: cardBackgroundColor,
                    borderColor: cardBorderColor,
                  },
                ]}
              >
                <View
                  style={[
                    styles.formulaGroupHeader,
                    { borderBottomColor: dividerColor },
                  ]}
                >
                  <ThemedText
                    semanticVariant="tableHeader"
                    style={{ color: theme.textSecondary }}
                  >
                    {t("formula_energy_group")}
                  </ThemedText>
                </View>
                <View style={styles.formulaTable}>
                  <View
                    style={[
                      styles.formulaTableRow,
                      isCompactPhone && styles.formulaTableRowCompact,
                      {
                        flexDirection: isRTL ? "row-reverse" : "row",
                        borderBottomColor: dividerColor,
                      },
                    ]}
                  >
                    <ThemedText
                      semanticVariant="labelSecondary"
                      style={[
                        styles.formulaTableLabel,
                        rtlText,
                        {
                          color: theme.textSecondary,
                          textAlign: isRTL ? "right" : "left",
                        },
                      ]}
                    >
                      {t("production")}
                    </ThemedText>
                    <ThemedText
                      semanticVariant="tableCell"
                      style={[
                        styles.formulaTableValue,
                        {
                          color: theme.primary,
                          textAlign: isRTL ? "left" : "right",
                        },
                      ]}
                    >
                      {t("sum_turbine_diff")}
                    </ThemedText>
                  </View>
                  <View
                    style={[
                      styles.formulaTableRow,
                      isCompactPhone && styles.formulaTableRowCompact,
                      {
                        flexDirection: isRTL ? "row-reverse" : "row",
                        borderBottomColor: dividerColor,
                      },
                    ]}
                  >
                    <ThemedText
                      semanticVariant="labelSecondary"
                      style={[
                        styles.formulaTableLabel,
                        rtlText,
                        {
                          color: theme.textSecondary,
                          textAlign: isRTL ? "right" : "left",
                        },
                      ]}
                    >
                      {t("export_withdrawal_label")}
                    </ThemedText>
                    <ThemedText
                      semanticVariant="tableCell"
                      style={[
                        styles.formulaTableValue,
                        {
                          color: theme.primary,
                          textAlign: isRTL ? "left" : "right",
                        },
                      ]}
                    >
                      {t("sum_feeder_diff")}
                    </ThemedText>
                  </View>
                  <View
                    style={[
                      styles.formulaTableRow,
                      styles.formulaTableRowLast,
                      isCompactPhone && styles.formulaTableRowCompact,
                      { flexDirection: isRTL ? "row-reverse" : "row" },
                    ]}
                  >
                    <ThemedText
                      semanticVariant="labelSecondary"
                      style={[
                        styles.formulaTableLabel,
                        rtlText,
                        {
                          color: theme.textSecondary,
                          textAlign: isRTL ? "right" : "left",
                        },
                      ]}
                    >
                      {t("consumption")}
                    </ThemedText>
                    <ThemedText
                      semanticVariant="tableCell"
                      style={[
                        styles.formulaTableValue,
                        {
                          color: theme.primary,
                          textAlign: isRTL ? "left" : "right",
                        },
                      ]}
                    >
                      {t("production_minus_export")}
                    </ThemedText>
                  </View>
                </View>
                <View
                  style={[
                    styles.formulaGroupHeader,
                    styles.gasGroupHeader,
                    {
                      borderTopColor: dividerColor,
                      borderBottomColor: dividerColor,
                    },
                  ]}
                >
                  <ThemedText
                    semanticVariant="tableHeader"
                    style={{ color: theme.textSecondary }}
                  >
                    {t("formula_gas_group")}
                  </ThemedText>
                </View>
                <View style={styles.formulaGasSection}>
                  <View
                    style={[
                      styles.gasEquationHeader,
                      { flexDirection: isRTL ? "row-reverse" : "row" },
                    ]}
                  >
                    <ThemedText
                      semanticVariant="labelPrimary"
                      style={{ color: theme.warning }}
                    >
                      {isRTL ? "استهلاك الغاز" : "Gas"}
                    </ThemedText>
                    <ThemedText
                      semanticVariant="labelPrimary"
                      style={{ color: theme.warning }}
                    >
                      =
                    </ThemedText>
                  </View>

                  <View style={styles.gasEquationBlock}>
                    <View
                      style={[
                        styles.gasEquationRow,
                        isCompactPhone && styles.gasEquationRowCompact,
                      ]}
                    >
                      <ThemedText
                        semanticVariant="tableHeader"
                        style={[
                          styles.gasEquationExpression,
                          { color: theme.warning },
                        ]}
                      >
                        Diff × 1000
                      </ThemedText>
                      <ThemedText
                        semanticVariant="labelSecondary"
                        style={[
                          styles.gasEquationCondition,
                          {
                            color: theme.textSecondary,
                            textAlign: isRTL ? "right" : "left",
                          },
                        ]}
                      >
                        {t("gas_rule_low")}
                      </ThemedText>
                    </View>

                    <View
                      style={[
                        styles.gasEquationRow,
                        isCompactPhone && styles.gasEquationRowCompact,
                      ]}
                    >
                      <ThemedText
                        semanticVariant="tableHeader"
                        style={[
                          styles.gasEquationExpression,
                          { color: theme.warning },
                        ]}
                      >
                        Diff × 700
                      </ThemedText>
                      <ThemedText
                        semanticVariant="labelSecondary"
                        style={[
                          styles.gasEquationCondition,
                          {
                            color: theme.textSecondary,
                            textAlign: isRTL ? "right" : "left",
                          },
                        ]}
                      >
                        {t("gas_rule_mid")}
                      </ThemedText>
                    </View>

                    <View
                      style={[
                        styles.gasEquationRow,
                        isCompactPhone && styles.gasEquationRowCompact,
                      ]}
                    >
                      <ThemedText
                        semanticVariant="tableHeader"
                        style={[
                          styles.gasEquationExpression,
                          { color: theme.warning },
                        ]}
                      >
                        Diff × 500
                      </ThemedText>
                      <ThemedText
                        semanticVariant="labelSecondary"
                        style={[
                          styles.gasEquationCondition,
                          {
                            color: theme.textSecondary,
                            textAlign: isRTL ? "right" : "left",
                          },
                        ]}
                      >
                        {t("gas_rule_high")}
                      </ThemedText>
                    </View>

                    <View
                      style={[
                        styles.gasEquationRow,
                        styles.gasEquationRowLast,
                        isCompactPhone && styles.gasEquationRowCompact,
                      ]}
                    >
                      <ThemedText
                        semanticVariant="tableHeader"
                        style={[
                          styles.gasEquationExpression,
                          { color: theme.warning },
                        ]}
                      >
                        Diff × 420
                      </ThemedText>
                      <ThemedText
                        semanticVariant="labelSecondary"
                        style={[
                          styles.gasEquationCondition,
                          {
                            color: theme.textSecondary,
                            textAlign: isRTL ? "right" : "left",
                          },
                        ]}
                      >
                        {t("gas_rule_top")}
                      </ThemedText>
                    </View>
                  </View>
                </View>
              </View>
            </Animated.View>
          </ScrollView>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlayRoot: {
    flex: 1,
    position: "relative",
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  flowLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  gridLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
  contentLayer: {
    flex: 1,
    zIndex: 3,
  },
  scrollView: {
    flex: 1,
  },
  pageHeader: {
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  dateLineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  dateLineSegment: {
    flex: 1,
    height: 1,
    opacity: 0.55,
  },
  overviewCard: {
    borderRadius: SCADA_RADIUS,
    borderWidth: 1,
    padding: CARD_PADDING,
    marginBottom: Spacing.sm,
    gap: Spacing.lg,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 22,
    elevation: 10,
  },
  overviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  overviewTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    flex: 1,
    minWidth: 0,
  },
  overviewTitleText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  snapshotGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  snapshotItem: {
    flexGrow: 1,
    flexBasis: 130,
    minHeight: 78,
    borderRadius: 16,
    padding: Spacing.md,
    justifyContent: "space-between",
    alignItems: "center",
  },
  dateIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    marginBottom: 4,
  },
  sectionHeader: {
    marginBottom: Spacing.md,
  },
  energyGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  energyGridCompact: {
    gap: Spacing.sm,
  },
  energyCard: {
    flex: 1,
    minWidth: 128,
    flexBasis: "48%",
    padding: CARD_PADDING,
    borderRadius: SCADA_RADIUS,
    borderWidth: 1,
    alignItems: "center",
    gap: Spacing.xs,
    minHeight: 156,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 9,
  },
  energyCardFull: {
    flexBasis: "100%",
    width: "100%",
  },
  energyCardWide: {
    flexBasis: "31.5%",
    minWidth: 0,
  },
  energyIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    borderRadius: SCADA_RADIUS,
    marginBottom: Spacing.lg,
    overflow: "hidden",
  },
  systemCard: {
    borderWidth: 1,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 9,
  },
  gasSectionLayout: {
    gap: Spacing.lg,
  },
  gasSectionLayoutWide: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  gasTableCard: {
    flex: 1,
    marginBottom: 0,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: CARD_PADDING,
    borderBottomWidth: 1,
  },
  cardHeaderText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
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
    paddingHorizontal: CARD_PADDING,
    paddingVertical: ROW_GAP,
    borderBottomWidth: 1,
    minHeight: 50,
    alignItems: "center",
  },
  tableRow: {
    flexDirection: "row",
    paddingHorizontal: CARD_PADDING,
    paddingVertical: ROW_GAP,
    alignItems: "center",
    minHeight: 52,
  },
  tableCell: {
    justifyContent: "center",
    alignItems: "center",
    minHeight: 24,
  },
  tableColumnTurbine: {
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: TURBINE_COLUMN_WIDTH,
    width: TURBINE_COLUMN_WIDTH,
  },
  tableColumnNumeric: {
    flexGrow: GAS_TABLE_COLUMN_FLEX,
    flexShrink: 1,
    flexBasis: 0,
  },
  tableHeaderText: {
    textAlign: "center",
    width: "100%",
    alignSelf: "center",
    includeFontPadding: false,
  },
  tableBodyText: {
    textAlign: "center",
    flex: 1,
    width: "100%",
    alignSelf: "center",
    includeFontPadding: false,
  },
  numericHeaderCell: {
    fontSize: 12,
    textAlign: "center",
  },
  numericBodyCell: {
    fontVariant: ["tabular-nums", "lining-nums"],
    textAlign: "center",
  },
  turbineHeaderCell: {
    textAlign: "center",
  },
  turbineBodyCell: {
    justifyContent: "center",
    alignItems: "center",
  },
  turbineBadgeSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  turbineBadgeCodeSmall: {
    fontSize: 14,
    lineHeight: 19,
  },
  tableScrollContent: {
    minWidth: "100%",
  },
  tableContent: {
    width: "100%",
  },
  totalGasCard: {
    marginTop: SECTION_GAP,
    marginBottom: Spacing.sm,
    borderRadius: SCADA_RADIUS,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: CARD_PADDING,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 9,
    minHeight: 148,
  },
  totalGasCardWide: {
    flex: 0.34,
    marginTop: 0,
    marginBottom: 0,
  },
  totalGasIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  formulaGroupHeader: {
    paddingHorizontal: CARD_PADDING,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
    borderBottomWidth: 1,
    borderTopWidth: 0,
  },
  gasGroupHeader: {
    marginTop: Spacing.sm,
  },
  formulaTable: {
    paddingHorizontal: CARD_PADDING,
    paddingTop: Spacing.xs,
  },
  formulaTableRow: {
    alignItems: "center",
    minHeight: 48,
    borderBottomWidth: 1,
    gap: Spacing.md,
  },
  formulaTableRowCompact: {
    alignItems: "flex-start",
    flexWrap: "wrap",
    paddingVertical: Spacing.xs,
  },
  formulaTableRowLast: {
    borderBottomWidth: 0,
    paddingBottom: Spacing.sm,
  },
  formulaTableLabel: {
    flex: 0.9,
  },
  formulaTableValue: {
    flex: 1.1,
  },
  formulaGasSection: {
    marginTop: Spacing.xs,
    paddingHorizontal: CARD_PADDING,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  gasEquationHeader: {
    alignItems: "center",
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  gasEquationBlock: {
    paddingVertical: Spacing.xs,
  },
  gasEquationRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 42,
    paddingHorizontal: Spacing.xs,
    gap: Spacing.md,
  },
  gasEquationRowCompact: {
    alignItems: "flex-start",
    flexWrap: "wrap",
  },
  gasEquationRowLast: {
    marginBottom: 0,
  },
  gasEquationExpression: {
    width: 116,
    textAlign: "left",
    writingDirection: "ltr",
    fontWeight: "600",
  },
  gasEquationCondition: {
    flex: 1,
    fontSize: 12,
    lineHeight: 20,
  },
});
