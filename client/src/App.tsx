import React, { useEffect } from "react";
import { StyleSheet, View, Text } from "react-native";
import { NavigationContainer, DefaultTheme, DarkTheme, Theme } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import { ToastProvider } from "@/components/ui/Toast";
import { ThemedText } from "@/components/ThemedText";

import { RootStackNavigator } from "@/navigation";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { DayProvider } from "@/contexts/DayContext";
import { LanguageProvider, useLanguage } from "@/contexts/LanguageContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider, useThemeMode } from "@/contexts/ThemeContext";
import { UnitsProvider } from "@/contexts/UnitsContext";
import { AuthScreen } from "@/screens/AuthScreen";
import { getFontFamilyForText, typography } from "@/theme/typography";
import { loadFonts } from "@/theme/fonts";

void SplashScreen.preventAutoHideAsync();

function BootText({ children }: { children: string }) {
  return (
    <Text
      style={[
        styles.loadingText,
        {
          fontFamily: getFontFamilyForText(children, typography, "regular"),
        },
      ]}
    >
      {children}
    </Text>
  );
}

function useNavigationTheme(): Theme {
  const { theme, isDark } = useThemeMode();
  
  const baseTheme = isDark ? DarkTheme : DefaultTheme;
  
  return {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      primary: theme.primary,
      background: theme.backgroundRoot,
      card: theme.backgroundDefault,
      text: theme.text,
      border: theme.border,
      notification: theme.primary,
    },
  };
}

function AuthenticatedApp() {
  const { isDark } = useThemeMode();
  const { isRTL } = useLanguage();
  const navigationTheme = useNavigationTheme();
  
  return (
    <DayProvider>
      <SafeAreaProvider>
        <GestureHandlerRootView style={styles.root}>
          <KeyboardProvider>
            <NavigationContainer 
              key={isRTL ? "rtl" : "ltr"}
              theme={navigationTheme}
            >
              <RootStackNavigator />
            </NavigationContainer>
            <StatusBar style={isDark ? "light" : "dark"} />
          </KeyboardProvider>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </DayProvider>
  );
}

function AppContent() {
  const { user, loading, isConfigured } = useAuth();
  const { theme, isDark } = useThemeMode();

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.backgroundDefault }]}>
        <ThemedText type="body" style={[styles.loadingText, { color: theme.textSecondary }]}>
          Loading...
        </ThemedText>
      </View>
    );
  }

  // If Supabase is not configured, run app in local-only mode
  // User can still use the app with local storage, just no cloud sync
  if (!isConfigured) {
    return <AuthenticatedApp />;
  }

  if (!user) {
    return (
      <SafeAreaProvider>
        <GestureHandlerRootView style={styles.root}>
          <AuthScreen />
          <StatusBar style={isDark ? "light" : "dark"} />
        </GestureHandlerRootView>
      </SafeAreaProvider>
    );
  }

  return <AuthenticatedApp />;
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts(loadFonts());

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  if (fontError) {
    return (
      <View style={styles.loadingContainer}>
        <BootText>Unable to load fonts. Please restart the app.</BootText>
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ErrorBoundary>
          <ToastProvider>
            <LanguageProvider>
              <UnitsProvider>
                <AuthProvider>
                  <AppContent />
                </AuthProvider>
              </UnitsProvider>
            </LanguageProvider>
          </ToastProvider>
        </ErrorBoundary>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
  },
});
