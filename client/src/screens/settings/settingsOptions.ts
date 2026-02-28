import { ColorThemeName, ThemeMode } from "@/constants/theme";
import { Language } from "@/lib/i18n";
import { UnitsPreset } from "@/utils/units";

export interface LanguageOption {
  code: Language;
  name: string;
  nativeName: string;
}

export const LANGUAGES: LanguageOption[] = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "ar", name: "Arabic", nativeName: "\u0627\u0644\u0639\u0631\u0628\u064a\u0629" },
];

export interface ThemeOption {
  mode: ThemeMode;
  titleKey: "system_theme" | "light_mode" | "dark_mode";
  descKey: "theme_system_desc" | "theme_light_desc" | "theme_dark_desc";
  icon: "smartphone" | "sun" | "moon";
}

export const THEME_OPTIONS: ThemeOption[] = [
  { mode: "system", titleKey: "system_theme", descKey: "theme_system_desc", icon: "smartphone" },
  { mode: "light", titleKey: "light_mode", descKey: "theme_light_desc", icon: "sun" },
  { mode: "dark", titleKey: "dark_mode", descKey: "theme_dark_desc", icon: "moon" },
];

export interface ColorThemeOption {
  name: ColorThemeName;
  titleKey: "color_theme_midnight" | "color_theme_light" | "color_theme_emerald" | "color_theme_amber";
  descKey:
    | "color_theme_midnight_desc"
    | "color_theme_light_desc"
    | "color_theme_emerald_desc"
    | "color_theme_amber_desc";
  icon: "moon" | "sun" | "droplet" | "sunset";
}

export const COLOR_THEME_OPTIONS: ColorThemeOption[] = [
  {
    name: "midnight",
    titleKey: "color_theme_midnight",
    descKey: "color_theme_midnight_desc",
    icon: "moon",
  },
  {
    name: "light",
    titleKey: "color_theme_light",
    descKey: "color_theme_light_desc",
    icon: "sun",
  },
  {
    name: "emerald",
    titleKey: "color_theme_emerald",
    descKey: "color_theme_emerald_desc",
    icon: "droplet",
  },
  {
    name: "amber",
    titleKey: "color_theme_amber",
    descKey: "color_theme_amber_desc",
    icon: "sunset",
  },
];

export interface UnitsPresetOption {
  preset: UnitsPreset;
  titleKey: "units_metric" | "units_english" | "units_custom";
  descKey: "units_metric_desc" | "units_english_desc" | "units_custom_desc";
}

export const UNITS_PRESET_OPTIONS: UnitsPresetOption[] = [
  { preset: "metric", titleKey: "units_metric", descKey: "units_metric_desc" },
  { preset: "english", titleKey: "units_english", descKey: "units_english_desc" },
  { preset: "custom", titleKey: "units_custom", descKey: "units_custom_desc" },
];
