import { Platform } from "react-native";
import { typography } from "@/theme/typography";
import { spacing, radius } from "@/theme/spacing";

export type ThemeMode = "system" | "light" | "dark";
export type ResolvedThemeMode = "light" | "dark";
export type ColorThemeName = "midnight" | "light" | "emerald" | "amber";

export const defaultThemeName: ColorThemeName = "midnight";

export type ThemePalette = {
  background: string;
  card: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
  accent: string;
  accent2: string;
  danger: string;
  inputBg: string;
  inputBorder: string;
  tabBarBg: string;
  tabBarActive: string;
  tabBarInactive: string;
};

export type AppTheme = ThemePalette & {
  text: string;
  textSecondary: string;
  buttonText: string;
  tabIconDefault: string;
  tabIconSelected: string;
  link: string;
  primary: string;
  backgroundRoot: string;
  backgroundDefault: string;
  backgroundSecondary: string;
  backgroundTertiary: string;
  success: string;
  warning: string;
  error: string;
};

export const themes: Record<ColorThemeName, Record<ResolvedThemeMode, ThemePalette>> = {
  midnight: {
    light: {
      background: "#F8FAFC",
      card: "#FFFFFF",
      textPrimary: "#0F172A",
      textSecondary: "#64748B",
      border: "#E2E8F0",
      accent: "#0099CC",
      accent2: "#0EA5E9",
      danger: "#EF4444",
      inputBg: "#F1F5F9",
      inputBorder: "#E2E8F0",
      tabBarBg: "#FFFFFF",
      tabBarActive: "#0099CC",
      tabBarInactive: "#64748B",
    },
    dark: {
      background: "#0A0E1A",
      card: "#1A1F2E",
      textPrimary: "#FFFFFF",
      textSecondary: "#94A3B8",
      border: "#2D3748",
      accent: "#00D9FF",
      accent2: "#38BDF8",
      danger: "#EF4444",
      inputBg: "#252B3D",
      inputBorder: "#2D3748",
      tabBarBg: "#111827",
      tabBarActive: "#00D9FF",
      tabBarInactive: "#94A3B8",
    },
  },
  light: {
    light: {
      background: "#F9FAFB",
      card: "#FFFFFF",
      textPrimary: "#111827",
      textSecondary: "#6B7280",
      border: "#E5E7EB",
      accent: "#2563EB",
      accent2: "#3B82F6",
      danger: "#DC2626",
      inputBg: "#F3F4F6",
      inputBorder: "#E5E7EB",
      tabBarBg: "#FFFFFF",
      tabBarActive: "#2563EB",
      tabBarInactive: "#6B7280",
    },
    dark: {
      background: "#111827",
      card: "#1F2937",
      textPrimary: "#F9FAFB",
      textSecondary: "#9CA3AF",
      border: "#374151",
      accent: "#60A5FA",
      accent2: "#93C5FD",
      danger: "#F87171",
      inputBg: "#273244",
      inputBorder: "#374151",
      tabBarBg: "#1F2937",
      tabBarActive: "#60A5FA",
      tabBarInactive: "#9CA3AF",
    },
  },
  emerald: {
    light: {
      background: "#F3FCF8",
      card: "#FFFFFF",
      textPrimary: "#0F172A",
      textSecondary: "#64748B",
      border: "#CDEEE0",
      accent: "#059669",
      accent2: "#10B981",
      danger: "#DC2626",
      inputBg: "#ECFDF5",
      inputBorder: "#A7F3D0",
      tabBarBg: "#FFFFFF",
      tabBarActive: "#059669",
      tabBarInactive: "#64748B",
    },
    dark: {
      background: "#06281F",
      card: "#0B3B2D",
      textPrimary: "#ECFDF5",
      textSecondary: "#A7F3D0",
      border: "#135D46",
      accent: "#34D399",
      accent2: "#6EE7B7",
      danger: "#F87171",
      inputBg: "#0F4A37",
      inputBorder: "#1B6B51",
      tabBarBg: "#0A3327",
      tabBarActive: "#34D399",
      tabBarInactive: "#A7F3D0",
    },
  },
  amber: {
    light: {
      background: "#FFF9F2",
      card: "#FFFFFF",
      textPrimary: "#1F2937",
      textSecondary: "#6B7280",
      border: "#FDE7CA",
      accent: "#D97706",
      accent2: "#F59E0B",
      danger: "#DC2626",
      inputBg: "#FFF7ED",
      inputBorder: "#FED7AA",
      tabBarBg: "#FFFFFF",
      tabBarActive: "#D97706",
      tabBarInactive: "#6B7280",
    },
    dark: {
      background: "#2B1704",
      card: "#3A2208",
      textPrimary: "#FFF7ED",
      textSecondary: "#FCD9A6",
      border: "#6A3D0E",
      accent: "#F59E0B",
      accent2: "#FBBF24",
      danger: "#F87171",
      inputBg: "#4A2E0C",
      inputBorder: "#7A4A14",
      tabBarBg: "#331D07",
      tabBarActive: "#F59E0B",
      tabBarInactive: "#FCD9A6",
    },
  },
};

export function buildTheme(mode: ResolvedThemeMode, colorTheme: ColorThemeName): AppTheme {
  const palette = themes[colorTheme][mode];

  return {
    ...palette,
    text: palette.textPrimary,
    textSecondary: palette.textSecondary,
    buttonText: "#FFFFFF",
    tabIconDefault: palette.tabBarInactive,
    tabIconSelected: palette.tabBarActive,
    link: palette.accent,
    primary: palette.accent,
    backgroundRoot: palette.background,
    backgroundDefault: palette.card,
    backgroundSecondary: palette.inputBg,
    backgroundTertiary: palette.inputBorder,
    success: palette.accent2,
    warning: "#F59E0B",
    error: palette.danger,
  };
}

export const Colors = {
  light: buildTheme("light", defaultThemeName),
  dark: buildTheme("dark", defaultThemeName),
};

export const Spacing = {
  ...spacing,
};

export const BorderRadius = {
  ...radius,
};

export const Typography = {
  display: {
    ...typography.getVariantStyle("screenTitle", "en"),
  },
  h1: {
    ...typography.getVariantStyle("screenTitle", "en"),
  },
  h2: {
    ...typography.getVariantStyle("screenTitle", "en"),
    fontSize: typography.scale.title,
    lineHeight: typography.lineHeights.title,
    fontWeight: "600" as const,
  },
  h3: {
    ...typography.getVariantStyle("sectionTitle", "en"),
  },
  h4: {
    ...typography.getVariantStyle("labelPrimary", "en"),
    fontSize: typography.scale.subheading,
    lineHeight: typography.lineHeights.subheading,
  },
  body: {
    ...typography.getVariantStyle("tableCell", "en"),
  },
  small: {
    ...typography.getVariantStyle("labelPrimary", "en"),
    fontWeight: "400" as const,
  },
  caption: {
    ...typography.getVariantStyle("helper", "en"),
  },
  mono: {
    ...typography.getVariantStyle("valueSecondary", "en"),
    fontFamily: typography.monospace,
    fontWeight: "500" as const,
  },
  link: {
    ...typography.getVariantStyle("tableCell", "en"),
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: typography.englishRegular,
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: typography.numbersRegular,
  },
  default: {
    sans: typography.englishRegular,
    serif: "serif",
    rounded: "normal",
    mono: typography.numbersRegular,
  },
  web: {
    sans: `${typography.englishRegular}, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`,
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: typography.numbersRegular,
  },
});

export const Shadows = {
  fab: {
    shadowColor: "#00D9FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  card: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  cardElevated: {
    shadowColor: "#00D9FF",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
  },
  glow: {
    shadowColor: "#00D9FF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 16,
  },
};

export const TabletBreakpoint = 768;
export const TabletMaxContentWidth = 900;
