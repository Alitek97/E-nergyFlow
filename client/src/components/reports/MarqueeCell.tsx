import React, { memo, useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import TextTicker from "react-native-text-ticker";

import { useTheme } from "@/hooks/useTheme";

interface MarqueeCellProps {
  value: string | number | null | undefined;
  active: boolean;
}

function toDisplayValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

export const MarqueeCell = memo(function MarqueeCell({
  value,
  active,
}: MarqueeCellProps) {
  const { theme, typography } = useTheme();
  const tickerRef = useRef<TextTicker | null>(null);
  const displayValue = toDisplayValue(value);

  useEffect(() => {
    if (!tickerRef.current) return;
    const ticker = tickerRef.current as unknown as {
      startAnimation?: () => void;
      stopAnimation?: () => void;
    };
    if (active) {
      ticker.startAnimation?.();
      return;
    }
    ticker.stopAnimation?.();
  }, [active, displayValue]);

  return (
    <View style={styles.container}>
      <TextTicker
        ref={tickerRef}
        duration={7000}
        loop
        bounce={false}
        scroll={false}
        marqueeOnMount={active}
        marqueeDelay={500}
        repeatSpacer={40}
        shouldAnimateTreshold={8}
        useNativeDriver
        isInteraction={false}
        disabled={!active}
        isRTL={false}
        numberOfLines={1}
        style={[
          styles.text,
          {
            color: theme.text,
            fontFamily: typography.getNumberFamily("regular"),
          },
        ]}
      >
        {displayValue}
      </TextTicker>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: "100%",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    includeFontPadding: false,
    lineHeight: 20,
    paddingHorizontal: 4,
    textAlign: "center",
    writingDirection: "ltr",
    fontVariant: ["tabular-nums"],
  },
});
