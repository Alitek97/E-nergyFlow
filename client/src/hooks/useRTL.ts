import { TextStyle, ViewStyle } from "react-native";
import { useLanguage } from "@/contexts/LanguageContext";

export interface RTLStyles {
  isRTL: boolean;
  rtlText: TextStyle;
  rtlRow: ViewStyle;
  rtlRowReverse: ViewStyle;
}

export function useRTL(): RTLStyles {
  const { isRTL } = useLanguage();

  return {
    isRTL,
    rtlText: {
      writingDirection: isRTL ? "rtl" : "ltr",
      textAlign: isRTL ? "right" : "left",
    },
    rtlRow: {
      flexDirection: isRTL ? "row-reverse" : "row",
    },
    rtlRowReverse: {
      flexDirection: isRTL ? "row" : "row-reverse",
    },
  };
}

export const numberTextStyle = { writingDirection: "ltr" as const };
