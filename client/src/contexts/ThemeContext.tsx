import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useMemo,
  useCallback,
} from "react";
import { useColorScheme as useSystemColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  buildTheme,
  defaultThemeName,
  type AppTheme,
  type ColorThemeName,
  type ThemeMode,
} from "@/constants/theme";

const THEME_MODE_STORAGE_KEY = "pp-app:theme-mode";
const COLOR_THEME_STORAGE_KEY = "pp-app:color-theme";

interface ThemeContextType {
  mode: ThemeMode;
  isDark: boolean;
  theme: AppTheme;
  colorTheme: ColorThemeName;
  setMode: (mode: ThemeMode) => void;
  setColorTheme: (colorTheme: ColorThemeName) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useThemeMode() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useThemeMode must be used within a ThemeProvider");
  }
  return context;
}

interface ThemeProviderProps {
  children: ReactNode;
}

const VALID_MODES: ThemeMode[] = ["system", "light", "dark"];
const VALID_COLOR_THEMES: ColorThemeName[] = ["midnight", "light", "emerald", "amber"];

export function ThemeProvider({ children }: ThemeProviderProps) {
  const systemColorScheme = useSystemColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [colorTheme, setColorThemeState] = useState<ColorThemeName>(defaultThemeName);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const [savedMode, savedColorTheme] = await Promise.all([
          AsyncStorage.getItem(THEME_MODE_STORAGE_KEY),
          AsyncStorage.getItem(COLOR_THEME_STORAGE_KEY),
        ]);

        if (savedMode && VALID_MODES.includes(savedMode as ThemeMode)) {
          setModeState(savedMode as ThemeMode);
        }

        if (savedColorTheme && VALID_COLOR_THEMES.includes(savedColorTheme as ColorThemeName)) {
          setColorThemeState(savedColorTheme as ColorThemeName);
        }
      } catch (error) {
        console.error("Error loading theme:", error);
      } finally {
        setIsLoaded(true);
      }
    };

    loadTheme();
  }, []);

  const setMode = useCallback(async (newMode: ThemeMode) => {
    setModeState(newMode);
    try {
      await AsyncStorage.setItem(THEME_MODE_STORAGE_KEY, newMode);
    } catch (error) {
      console.error("Error saving theme mode:", error);
    }
  }, []);

  const setColorTheme = useCallback(async (newColorTheme: ColorThemeName) => {
    setColorThemeState(newColorTheme);
    try {
      await AsyncStorage.setItem(COLOR_THEME_STORAGE_KEY, newColorTheme);
    } catch (error) {
      console.error("Error saving color theme:", error);
    }
  }, []);

  const isDark = useMemo(() => {
    if (mode === "system") {
      return systemColorScheme === "dark";
    }
    return mode === "dark";
  }, [mode, systemColorScheme]);

  const theme = useMemo(() => {
    return buildTheme(isDark ? "dark" : "light", colorTheme);
  }, [isDark, colorTheme]);

  const value = useMemo(
    () => ({
      mode,
      isDark,
      theme,
      colorTheme,
      setMode,
      setColorTheme,
    }),
    [mode, isDark, theme, colorTheme, setMode, setColorTheme]
  );

  if (!isLoaded) {
    return null;
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
