import { Platform } from "react-native";
import { typography } from "@/theme/typography";
import { spacing, radius } from "@/theme/spacing";

export type ThemeMode = "system" | "light" | "dark";
export type ResolvedThemeMode = "light" | "dark";
export type ColorThemeName =
  | "midnight"
  | "light"
  | "emerald"
  | "amber"
  | "purple";

export const defaultThemeName: ColorThemeName = "midnight";

export type ThemePalette = {
  background: string;
  card: string;
  surfaceRaised: string;
  surfaceMuted: string;
  surfaceOverlay: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  border: string;
  borderStrong: string;
  accent: string;
  accent2: string;
  success: string;
  warning: string;
  danger: string;
  inputBg: string;
  inputBorder: string;
  tabBarBg: string;
  tabBarActive: string;
  tabBarInactive: string;
  canvasStart: string;
  canvasEnd: string;
  heroStart: string;
  heroEnd: string;
  overlay: string;
  cardShadow: string;
};

export type AppTheme = ThemePalette & {
  text: string;
  textSecondary: string;
  textTertiary: string;
  buttonText: string;
  tabIconDefault: string;
  tabIconSelected: string;
  link: string;
  primary: string;
  backgroundRoot: string;
  backgroundDefault: string;
  backgroundSecondary: string;
  backgroundTertiary: string;
  surfaceRaised: string;
  surfaceMuted: string;
  surfaceOverlay: string;
  borderStrong: string;
  divider: string;
  accentSoft: string;
  successSoft: string;
  warningSoft: string;
  errorSoft: string;
  success: string;
  warning: string;
  error: string;
  overlay: string;
  cardShadow: string;
  canvasStart: string;
  canvasEnd: string;
  heroStart: string;
  heroEnd: string;
};

export const themes: Record<
  ColorThemeName,
  Record<ResolvedThemeMode, ThemePalette>
> = {
  midnight: {
    light: {
      background: "#EEF3FB",
      card: "#FAFCFF",
      surfaceRaised: "#FFFFFF",
      surfaceMuted: "#EBF3FF",
      surfaceOverlay: "#F4F8FF",
      textPrimary: "#171B34",
      textSecondary: "#7193A9",
      textTertiary: "#8FA1B7",
      border: "#D7E2F2",
      borderStrong: "#C7D6EC",
      accent: "#3062C8",
      accent2: "#5239AF",
      success: "#10A46F",
      warning: "#D48B2E",
      danger: "#E05C67",
      inputBg: "#F3F7FD",
      inputBorder: "#D7E4F6",
      tabBarBg: "#F6FAFF",
      tabBarActive: "#171B34",
      tabBarInactive: "#8FA1B7",
      canvasStart: "#F8FBFF",
      canvasEnd: "#EAF1FB",
      heroStart: "#FFFFFF",
      heroEnd: "#EAF2FF",
      overlay: "rgba(23, 27, 52, 0.06)",
      cardShadow: "#94A7C8",
    },
    dark: {
      background: "#070B17",
      card: "#11182F",
      surfaceRaised: "#17223F",
      surfaceMuted: "#1C2847",
      surfaceOverlay: "#202F53",
      textPrimary: "#F3F5F7",
      textSecondary: "#A2B6C4",
      textTertiary: "#6F83A0",
      border: "#243257",
      borderStrong: "#344878",
      accent: "#3062C8",
      accent2: "#7B8DFF",
      success: "#4DD596",
      warning: "#FFB657",
      danger: "#FF6B7A",
      inputBg: "#141D36",
      inputBorder: "#2B3B66",
      tabBarBg: "#0E1429",
      tabBarActive: "#F2F7FD",
      tabBarInactive: "#7E93B6",
      canvasStart: "#0B1020",
      canvasEnd: "#111A34",
      heroStart: "#171B34",
      heroEnd: "#221B49",
      overlay: "rgba(3, 8, 20, 0.42)",
      cardShadow: "#020611",
    },
  },
  light: {
    light: {
      background: "#F5F7FB",
      card: "#FFFFFF",
      surfaceRaised: "#FFFFFF",
      surfaceMuted: "#F2F5FA",
      surfaceOverlay: "#EDF2F9",
      textPrimary: "#142033",
      textSecondary: "#718199",
      textTertiary: "#96A3B5",
      border: "#DDE5F0",
      borderStrong: "#C9D5E5",
      accent: "#2563EB",
      accent2: "#5A7FFF",
      success: "#109B66",
      warning: "#D68B2C",
      danger: "#D95360",
      inputBg: "#F4F7FB",
      inputBorder: "#DDE5F0",
      tabBarBg: "#FFFFFF",
      tabBarActive: "#142033",
      tabBarInactive: "#8A99AD",
      canvasStart: "#FFFFFF",
      canvasEnd: "#EFF4FB",
      heroStart: "#FFFFFF",
      heroEnd: "#EDF3FF",
      overlay: "rgba(20, 32, 51, 0.05)",
      cardShadow: "#A1AEC4",
    },
    dark: {
      background: "#0B1020",
      card: "#171E30",
      surfaceRaised: "#1D2740",
      surfaceMuted: "#222E4B",
      surfaceOverlay: "#2A3657",
      textPrimary: "#F8FBFF",
      textSecondary: "#A4B3C7",
      textTertiary: "#7D8CA5",
      border: "#29344B",
      borderStrong: "#394760",
      accent: "#5A90FF",
      accent2: "#7CA7FF",
      success: "#43D18C",
      warning: "#FFBC67",
      danger: "#FF7F8C",
      inputBg: "#1A2439",
      inputBorder: "#324059",
      tabBarBg: "#11182A",
      tabBarActive: "#F8FBFF",
      tabBarInactive: "#7F91AB",
      canvasStart: "#101628",
      canvasEnd: "#192136",
      heroStart: "#1B243A",
      heroEnd: "#273452",
      overlay: "rgba(2, 8, 20, 0.4)",
      cardShadow: "#040913",
    },
  },
  emerald: {
    light: {
      background: "#EFF9F4",
      card: "#FFFFFF",
      surfaceRaised: "#FFFFFF",
      surfaceMuted: "#EAF8F0",
      surfaceOverlay: "#E4F4EC",
      textPrimary: "#12261D",
      textSecondary: "#5D7B6A",
      textTertiary: "#84A090",
      border: "#CDE9DC",
      borderStrong: "#B8DAC9",
      accent: "#0C9B6C",
      accent2: "#39C38C",
      success: "#0C9B6C",
      warning: "#D38D2F",
      danger: "#DD5E69",
      inputBg: "#F2FBF6",
      inputBorder: "#CFEBDD",
      tabBarBg: "#FFFFFF",
      tabBarActive: "#12261D",
      tabBarInactive: "#7F9B8B",
      canvasStart: "#F7FFFA",
      canvasEnd: "#EAF6EF",
      heroStart: "#FFFFFF",
      heroEnd: "#E6F8EE",
      overlay: "rgba(12, 155, 108, 0.05)",
      cardShadow: "#9AB9A8",
    },
    dark: {
      background: "#071711",
      card: "#10271F",
      surfaceRaised: "#153429",
      surfaceMuted: "#194033",
      surfaceOverlay: "#1D4C3D",
      textPrimary: "#F1FFF7",
      textSecondary: "#A5D6C1",
      textTertiary: "#6E9B88",
      border: "#235241",
      borderStrong: "#2F6854",
      accent: "#34D399",
      accent2: "#7CF2C7",
      success: "#34D399",
      warning: "#FFBF66",
      danger: "#FF7E87",
      inputBg: "#143126",
      inputBorder: "#275744",
      tabBarBg: "#0D221B",
      tabBarActive: "#F1FFF7",
      tabBarInactive: "#73A28C",
      canvasStart: "#0C1E17",
      canvasEnd: "#133328",
      heroStart: "#173A2E",
      heroEnd: "#1F4A3A",
      overlay: "rgba(5, 18, 13, 0.42)",
      cardShadow: "#03100B",
    },
  },
  amber: {
    light: {
      background: "#FFF8F1",
      card: "#FFFFFF",
      surfaceRaised: "#FFFFFF",
      surfaceMuted: "#FFF1E3",
      surfaceOverlay: "#FFEDDA",
      textPrimary: "#231A13",
      textSecondary: "#8B715B",
      textTertiary: "#AF9480",
      border: "#F1DDC6",
      borderStrong: "#E9CCAA",
      accent: "#D97706",
      accent2: "#F3A645",
      success: "#1E9F6F",
      warning: "#D97706",
      danger: "#D85C60",
      inputBg: "#FFF6ED",
      inputBorder: "#F2D9BB",
      tabBarBg: "#FFFFFF",
      tabBarActive: "#231A13",
      tabBarInactive: "#A08975",
      canvasStart: "#FFFDF9",
      canvasEnd: "#FFF1E3",
      heroStart: "#FFFFFF",
      heroEnd: "#FFF0DE",
      overlay: "rgba(217, 119, 6, 0.05)",
      cardShadow: "#C8AA8B",
    },
    dark: {
      background: "#170F08",
      card: "#26180F",
      surfaceRaised: "#342115",
      surfaceMuted: "#41291A",
      surfaceOverlay: "#4E311F",
      textPrimary: "#FFF8EF",
      textSecondary: "#E7C6A3",
      textTertiary: "#B28F6E",
      border: "#5C3A22",
      borderStrong: "#74492A",
      accent: "#F59E0B",
      accent2: "#FBC15B",
      success: "#3FCB94",
      warning: "#F59E0B",
      danger: "#FF7D82",
      inputBg: "#2F1D12",
      inputBorder: "#613B24",
      tabBarBg: "#20140C",
      tabBarActive: "#FFF8EF",
      tabBarInactive: "#C19B78",
      canvasStart: "#1F140B",
      canvasEnd: "#311E12",
      heroStart: "#382111",
      heroEnd: "#4B2A16",
      overlay: "rgba(15, 9, 4, 0.4)",
      cardShadow: "#100804",
    },
  },
  purple: {
    light: {
      background: "#F7F3FB",
      card: "#FCFAFF",
      surfaceRaised: "#FFFFFF",
      surfaceMuted: "#F1EBF8",
      surfaceOverlay: "#EAE3F4",
      textPrimary: "#1F1B2D",
      textSecondary: "#786F8E",
      textTertiary: "#9B92B0",
      border: "#DED6EA",
      borderStrong: "#CFC4E0",
      accent: "#7B57D1",
      accent2: "#986BEE",
      success: "#109B66",
      warning: "#D68B2C",
      danger: "#D95360",
      inputBg: "#F6F1FB",
      inputBorder: "#DDD3EB",
      tabBarBg: "#FEFCFF",
      tabBarActive: "#1F1B2D",
      tabBarInactive: "#9A90AE",
      canvasStart: "#FFFDFF",
      canvasEnd: "#F1EBF8",
      heroStart: "#FFFFFF",
      heroEnd: "#EFE7F9",
      overlay: "rgba(123, 87, 209, 0.05)",
      cardShadow: "#B1A5C8",
    },
    dark: {
      background: "#120F22",
      card: "#1B1731",
      surfaceRaised: "#241E40",
      surfaceMuted: "#2B234A",
      surfaceOverlay: "#332958",
      textPrimary: "#F5F1FA",
      textSecondary: "#B8ADD1",
      textTertiary: "#867AA5",
      border: "#3B315C",
      borderStrong: "#4C3F74",
      accent: "#B38BFF",
      accent2: "#C9A8FF",
      success: "#43D18C",
      warning: "#FFBC67",
      danger: "#FF7F8C",
      inputBg: "#211A3A",
      inputBorder: "#433766",
      tabBarBg: "#17122B",
      tabBarActive: "#F5F1FA",
      tabBarInactive: "#8F84B1",
      canvasStart: "#161129",
      canvasEnd: "#20183A",
      heroStart: "#261E44",
      heroEnd: "#352A5C",
      overlay: "rgba(8, 5, 20, 0.42)",
      cardShadow: "#070415",
    },
  },
};

export function buildTheme(
  mode: ResolvedThemeMode,
  colorTheme: ColorThemeName,
): AppTheme {
  const palette = themes[colorTheme][mode];

  return {
    ...palette,
    text: palette.textPrimary,
    textSecondary: palette.textSecondary,
    textTertiary: palette.textTertiary,
    buttonText: "#FFFFFF",
    tabIconDefault: palette.tabBarInactive,
    tabIconSelected: palette.tabBarActive,
    link: palette.accent,
    primary: palette.accent,
    backgroundRoot: palette.background,
    backgroundDefault: palette.card,
    backgroundSecondary: palette.surfaceMuted,
    backgroundTertiary: palette.surfaceOverlay,
    surfaceRaised: palette.surfaceRaised,
    surfaceMuted: palette.surfaceMuted,
    surfaceOverlay: palette.surfaceOverlay,
    borderStrong: palette.borderStrong,
    divider: palette.border,
    accentSoft: withAlpha(palette.accent, mode === "dark" ? 0.18 : 0.12),
    successSoft: withAlpha(palette.success, mode === "dark" ? 0.18 : 0.12),
    warningSoft: withAlpha(palette.warning, mode === "dark" ? 0.18 : 0.12),
    errorSoft: withAlpha(palette.danger, mode === "dark" ? 0.18 : 0.12),
    success: palette.success,
    warning: palette.warning,
    error: palette.danger,
    overlay: palette.overlay,
    cardShadow: palette.cardShadow,
    canvasStart: palette.canvasStart,
    canvasEnd: palette.canvasEnd,
    heroStart: palette.heroStart,
    heroEnd: palette.heroEnd,
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
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: typography.numbersRegular,
  },
});

export const Shadows = {
  fab: {
    shadowColor: "#0A1020",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.24,
    shadowRadius: 18,
    elevation: 10,
  },
  card: {
    shadowColor: "#0A1020",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 8,
  },
  cardElevated: {
    shadowColor: "#0A1020",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 14,
  },
  glow: {
    shadowColor: "#3062C8",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.32,
    shadowRadius: 22,
    elevation: 16,
  },
};

export function withAlpha(hexColor: string, alpha: number) {
  const sanitized = hexColor.replace("#", "");
  if (sanitized.length !== 6) {
    return hexColor;
  }

  const red = Number.parseInt(sanitized.slice(0, 2), 16);
  const green = Number.parseInt(sanitized.slice(2, 4), 16);
  const blue = Number.parseInt(sanitized.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export const TabletBreakpoint = 768;
export const TabletMaxContentWidth = 900;
