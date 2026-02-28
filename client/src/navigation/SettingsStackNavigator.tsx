import React from "react";
import { Pressable, StyleSheet } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { NativeStackNavigationOptions } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import SettingsScreen from "@/screens/SettingsScreen";
import AccountSettingsScreen from "@/screens/settings/AccountSettingsScreen";
import ChangePasswordScreen from "@/screens/settings/ChangePasswordScreen";
import LanguageSettingsScreen from "@/screens/settings/LanguageSettingsScreen";
import ThemeSettingsScreen from "@/screens/settings/ThemeSettingsScreen";
import ColorThemeSettingsScreen from "@/screens/settings/ColorThemeSettingsScreen";
import UnitsSettingsScreen from "@/screens/settings/UnitsSettingsScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { useLanguage } from "@/contexts/LanguageContext";
import { HeaderTitle } from "@/components/HeaderTitle";
import { useTheme } from "@/hooks/useTheme";

export type SettingsStackParamList = {
  Settings: undefined;
  AccountSettings: undefined;
  ChangePassword: undefined;
  LanguageSettings: undefined;
  ThemeSettings: undefined;
  ColorThemeSettings: undefined;
  UnitsSettings: undefined;
};

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export default function SettingsStackNavigator() {
  const screenOptions = useScreenOptions();
  const { t, isRTL } = useLanguage();
  const { theme } = useTheme();

  const renderBackButton = (onPress: () => void, side: "left" | "right") => (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        styles.backButtonBase,
        side === "right" ? styles.backButtonRight : styles.backButtonLeft,
        pressed && styles.backButtonPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={isRTL ? "رجوع" : "Back"}
    >
      <Feather name={isRTL ? "chevron-right" : "chevron-left"} size={24} color={theme.text} />
    </Pressable>
  );

  const buildDetailScreenOptions = (
    title: string,
    goBack: () => void
  ): NativeStackNavigationOptions => ({
    headerTitle: () => <HeaderTitle title={title} />,
    headerBackVisible: false,
    ...(isRTL
      ? {
          headerRight: ({ canGoBack }) => (canGoBack ? renderBackButton(goBack, "right") : null),
        }
      : {
          headerLeft: ({ canGoBack }) => (canGoBack ? renderBackButton(goBack, "left") : null),
        }),
  });

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          headerTitle: () => <HeaderTitle title={t("tab_settings")} />,
        }}
      />
      <Stack.Screen
        name="AccountSettings"
        component={AccountSettingsScreen}
        options={({ navigation }) => buildDetailScreenOptions(t("account"), navigation.goBack)}
      />
      <Stack.Screen
        name="ChangePassword"
        component={ChangePasswordScreen}
        options={({ navigation }) => buildDetailScreenOptions(t("password"), navigation.goBack)}
      />
      <Stack.Screen
        name="LanguageSettings"
        component={LanguageSettingsScreen}
        options={({ navigation }) => buildDetailScreenOptions(t("language"), navigation.goBack)}
      />
      <Stack.Screen
        name="ThemeSettings"
        component={ThemeSettingsScreen}
        options={({ navigation }) => buildDetailScreenOptions(t("theme"), navigation.goBack)}
      />
      <Stack.Screen
        name="ColorThemeSettings"
        component={ColorThemeSettingsScreen}
        options={({ navigation }) => buildDetailScreenOptions(t("color_theme"), navigation.goBack)}
      />
      <Stack.Screen
        name="UnitsSettings"
        component={UnitsSettingsScreen}
        options={({ navigation }) => buildDetailScreenOptions(t("units"), navigation.goBack)}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  backButtonBase: {
    minWidth: 34,
    minHeight: 34,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  backButtonLeft: {
    marginLeft: 2,
  },
  backButtonRight: {
    marginRight: 2,
  },
  backButtonPressed: {
    opacity: 0.55,
  },
});
