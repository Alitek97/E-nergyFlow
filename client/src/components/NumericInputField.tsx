import React, { memo, useCallback, useMemo, useState } from "react";
import { View, StyleSheet, Pressable, type StyleProp, type TextStyle } from "react-native";

import { ThemedText } from "./ThemedText";
import { NumberText } from "./NumberText";
import { NumericKeypad } from "./NumericKeypad";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
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

const INVALID_BORDER_COLOR = "#F4B400";
const INVALID_BG_COLOR = "rgba(244, 180, 0, 0.08)";

export const NumericInputField = memo(function NumericInputField({ label, value, onChangeValue, testID, isInvalid, textStyle, labelStyle }: NumericInputFieldProps) {
  const { theme } = useTheme();
  const [showKeypad, setShowKeypad] = useState(false);

  const displayValue = useMemo(() => formatWithCommas(stripCommas(value)), [value]);

  const handleChangeValue = useCallback((newValue: string) => {
    onChangeValue(stripCommas(newValue));
  }, [onChangeValue]);

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
            backgroundColor: isInvalid ? INVALID_BG_COLOR : theme.backgroundSecondary, 
            borderColor: isInvalid ? INVALID_BORDER_COLOR : theme.border,
            borderWidth: isInvalid ? 1.5 : 1,
          },
        ]}
        onPress={openKeypad}
        testID={testID}
      >
        <ThemedText numberOfLines={1} semanticVariant="tableCellLabel" style={[styles.label, { color: theme.textSecondary }, labelStyle]}>
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
    height: 56,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    justifyContent: "center",
  },
  label: {
    marginBottom: 2,
  },
  value: {
    minWidth: 0,
  },
});
