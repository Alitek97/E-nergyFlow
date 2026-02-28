import React, { useMemo } from "react";
import { Pressable, StyleSheet, Switch, View } from "react-native";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";

import SettingsSubpageLayout from "@/components/settings/SettingsSubpageLayout";
import SettingsHeaderHint from "@/components/settings/SettingsHeaderHint";
import { ThemedText } from "@/components/ThemedText";
import { ValueWithUnit } from "@/components/ValueWithUnit";
import { BorderRadius, Spacing } from "@/constants/theme";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUnits } from "@/contexts/UnitsContext";
import { useTheme } from "@/hooks/useTheme";
import { UNITS_PRESET_OPTIONS } from "@/screens/settings/settingsOptions";
import { formatEnergy, formatGas, formatPower } from "@/utils/units";

type SegmentedOption<T extends string> = {
  key: T;
  label: string;
};

function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: SegmentedOption<T>[];
  onChange: (value: T) => void;
}) {
  const { theme } = useTheme();
  const { isRTL } = useLanguage();

  return (
    <View style={[styles.segmentedWrap, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
      {options.map((option) => {
        const selected = option.key === value;
        return (
          <Pressable
            key={option.key}
            onPress={() => onChange(option.key)}
            style={[
              styles.segmentButton,
              {
                backgroundColor: selected ? theme.primary : theme.backgroundSecondary,
                borderColor: selected ? theme.primary : theme.border,
              },
            ]}
          >
            <ThemedText semanticVariant="button" style={{ color: selected ? theme.buttonText : theme.textSecondary }}>
              {option.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function UnitsSettingsScreen() {
  const { theme } = useTheme();
  const { t, isRTL } = useLanguage();
  const { unitsConfig, setPreset, setEnergyUnit, setGasUnit, setPowerUnit, setDecimals, setUseThousands } = useUnits();

  const previewEnergy = useMemo(() => formatEnergy(2350.42, unitsConfig, { prefer: "auto" }), [unitsConfig]);
  const previewGas = useMemo(() => formatGas(1245.5, unitsConfig), [unitsConfig]);
  const previewPower = useMemo(() => formatPower(4.32, unitsConfig), [unitsConfig]);

  return (
    <SettingsSubpageLayout>
      <SettingsHeaderHint text={t("units_helper_top")} />

      <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
        <ThemedText semanticVariant="labelPrimary" style={[styles.cardTitle, { textAlign: isRTL ? "right" : "left" }]}>
          {t("units_system")}
        </ThemedText>
        {UNITS_PRESET_OPTIONS.map((option, index) => {
          const selected = unitsConfig.preset === option.preset;
          return (
            <Pressable
              key={option.preset}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setPreset(option.preset);
              }}
              style={[
                styles.optionRow,
                { flexDirection: isRTL ? "row-reverse" : "row", borderBottomColor: theme.border },
                index < UNITS_PRESET_OPTIONS.length - 1 ? styles.optionRowBorder : null,
              ]}
            >
              <View style={styles.optionTextWrap}>
                <ThemedText semanticVariant="labelPrimary" style={{ textAlign: isRTL ? "right" : "left" }}>
                  {t(option.titleKey)}
                </ThemedText>
                <ThemedText semanticVariant="labelSecondary" style={{ color: theme.textSecondary, textAlign: isRTL ? "right" : "left" }}>
                  {t(option.descKey)}
                </ThemedText>
              </View>
              {selected ? <Feather name="check" size={20} color={theme.primary} /> : null}
            </Pressable>
          );
        })}
      </View>

      {unitsConfig.preset === "custom" ? (
        <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
          <View style={[styles.configRow, { borderBottomColor: theme.border }]}>
            <ThemedText semanticVariant="labelPrimary">{t("energy_unit")}</ThemedText>
            <SegmentedControl
              value={unitsConfig.energyUnit}
              options={[
                { key: "kWh", label: "kWh" },
                { key: "MWh", label: "MWh" },
                { key: "GWh", label: "GWh" },
              ]}
              onChange={(value) => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setEnergyUnit(value);
              }}
            />
          </View>

          <View style={[styles.configRow, { borderBottomColor: theme.border }]}>
            <ThemedText semanticVariant="labelPrimary">{t("gas_unit")}</ThemedText>
            <SegmentedControl
              value={unitsConfig.gasUnit}
              options={[
                { key: "m³", label: "m³" },
                { key: "ft³", label: "ft³" },
                { key: "MMscf", label: "MMscf" },
              ]}
              onChange={(value) => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setGasUnit(value);
              }}
            />
          </View>

          <View style={styles.configRow}>
            <ThemedText semanticVariant="labelPrimary">{t("power_unit")}</ThemedText>
            <SegmentedControl
              value={unitsConfig.powerUnit}
              options={[
                { key: "kW", label: "kW" },
                { key: "MW", label: "MW" },
              ]}
              onChange={(value) => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setPowerUnit(value);
              }}
            />
          </View>
        </View>
      ) : null}

      <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
        <ThemedText semanticVariant="labelPrimary" style={[styles.cardTitle, { textAlign: isRTL ? "right" : "left" }]}>
          {t("formatting")}
        </ThemedText>
        <View style={[styles.optionRow, { flexDirection: isRTL ? "row-reverse" : "row", borderBottomColor: theme.border }, styles.optionRowBorder]}>
          <View style={styles.optionTextWrap}>
            <ThemedText semanticVariant="labelPrimary" style={{ textAlign: isRTL ? "right" : "left" }}>
              {t("decimals")}
            </ThemedText>
          </View>
          <View style={[styles.stepper, { flexDirection: isRTL ? "row-reverse" : "row", borderColor: theme.border }]}>
            <Pressable
              style={styles.stepperButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setDecimals((Math.max(0, unitsConfig.decimals - 1) as 0 | 1 | 2 | 3));
              }}
            >
              <Feather name="minus" size={16} color={theme.text} />
            </Pressable>
            <ThemedText semanticVariant="labelPrimary" style={styles.stepperValue}>
              {String(unitsConfig.decimals)}
            </ThemedText>
            <Pressable
              style={styles.stepperButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setDecimals((Math.min(3, unitsConfig.decimals + 1) as 0 | 1 | 2 | 3));
              }}
            >
              <Feather name="plus" size={16} color={theme.text} />
            </Pressable>
          </View>
        </View>
        <View style={[styles.optionRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <View style={styles.optionTextWrap}>
            <ThemedText semanticVariant="labelPrimary" style={{ textAlign: isRTL ? "right" : "left" }}>
              {t("thousands_separator")}
            </ThemedText>
            <ThemedText semanticVariant="labelSecondary" style={{ color: theme.textSecondary, textAlign: isRTL ? "right" : "left" }}>
              {unitsConfig.useThousands ? t("enabled") : t("disabled")}
            </ThemedText>
          </View>
          <Switch
            value={unitsConfig.useThousands}
            onValueChange={(value) => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setUseThousands(value);
            }}
            trackColor={{ false: theme.border, true: theme.primary + "60" }}
            thumbColor={unitsConfig.useThousands ? theme.primary : theme.textSecondary}
          />
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
        <ThemedText semanticVariant="labelPrimary" style={[styles.cardTitle, { textAlign: isRTL ? "right" : "left" }]}>
          {t("preview")}
        </ThemedText>
        <View style={[styles.previewRow, { borderBottomColor: theme.border }]}>
          <ThemedText semanticVariant="helper" style={{ color: theme.textSecondary }}>
            {t("energy_unit")}
          </ThemedText>
          <ValueWithUnit value={previewEnergy.valueText} unit={previewEnergy.unitText} />
        </View>
        <View style={[styles.previewRow, { borderBottomColor: theme.border }]}>
          <ThemedText semanticVariant="helper" style={{ color: theme.textSecondary }}>
            {t("gas_unit")}
          </ThemedText>
          <ValueWithUnit value={previewGas.valueText} unit={previewGas.unitText} />
        </View>
        <View style={styles.previewRow}>
          <ThemedText semanticVariant="helper" style={{ color: theme.textSecondary }}>
            {t("power_unit")}
          </ThemedText>
          <ValueWithUnit value={previewPower.valueText} unit={previewPower.unitText} />
        </View>
      </View>
    </SettingsSubpageLayout>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    overflow: "hidden",
  },
  cardTitle: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  optionRow: {
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 64,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  optionRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionTextWrap: {
    flex: 1,
    gap: 2,
  },
  configRow: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  segmentedWrap: {
    gap: Spacing.xs,
  },
  segmentButton: {
    flex: 1,
    minHeight: 38,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.sm,
  },
  stepper: {
    alignItems: "center",
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    overflow: "hidden",
  },
  stepperButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperValue: {
    minWidth: 34,
    textAlign: "center",
  },
  previewRow: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
