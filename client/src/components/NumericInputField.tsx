import React, { memo, useCallback, useMemo, useState } from "react";
import {
  StyleSheet,
  Pressable,
  type StyleProp,
  type TextStyle,
} from "react-native";

import { ThemedText } from "./ThemedText";
import { NumberText } from "./NumberText";
import { NumericKeypad } from "./NumericKeypad";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing, withAlpha } from "@/constants/theme";
import { formatWithCommas, stripCommas } from "@/lib/storage";

interface NumericInputFieldProps {
  label: string;
  value: string;
  onChangeValue: (value: string) => void;
  testID?: string;
  isInvalid?: boolean;
  textStyle?: StyleProp<TextStyle>;
  labelStyle?: StyleProp<TextStyle>;
}

export const NumericInputField = memo(function NumericInputField({
  label,
  value,
  onChangeValue,
  testID,
  isInvalid,
  textStyle,
  labelStyle,
}: NumericInputFieldProps) {
  const { theme } = useTheme();
  const [showKeypad, setShowKeypad] = useState(false);
  const invalidBorderColor = theme.warning;
  const invalidBackgroundColor = withAlpha(theme.warning, 0.12);

  const displayValue = useMemo(
    () => formatWithCommas(stripCommas(value)),
    [value],
  );

  const handleChangeValue = useCallback(
    (newValue: string) => {
      onChangeValue(stripCommas(newValue));
    },
    [onChangeValue],
  );

  const openKeypad = useCallback(() => {
    setShowKeypad(true);
  }, []);

  const closeKeypad = useCallback(() => {
    setShowKeypad(false);
  }, []);

  return (
    <>
      <Pressable
        style={[
          styles.container,
          {
            backgroundColor: isInvalid
              ? invalidBackgroundColor
              : theme.surfaceRaised,
            borderColor: isInvalid ? invalidBorderColor : theme.borderStrong,
            borderWidth: isInvalid ? 1.5 : 1,
            shadowColor: theme.cardShadow,
          },
        ]}
        onPress={openKeypad}
        testID={testID}
      >
        <ThemedText
          numberOfLines={1}
          semanticVariant="tableCellLabel"
          style={[styles.label, { color: theme.textSecondary }, labelStyle]}
        >
          {label}
        </ThemedText>
        <NumberText
          tier="input"
          numberOfLines={1}
          style={[
            styles.value,
            { color: value ? theme.text : theme.textSecondary },
            textStyle,
          ]}
        >
          {displayValue || "0"}
        </NumberText>
      </Pressable>

      <NumericKeypad
        visible={showKeypad}
        value={stripCommas(value)}
        onChangeValue={handleChangeValue}
        onClose={closeKeypad}
        label={label}
        textStyle={textStyle}
      />
    </>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 76,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    justifyContent: "space-between",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  label: {
    marginBottom: Spacing.xs,
  },
  value: {
    minWidth: 0,
  },
});
