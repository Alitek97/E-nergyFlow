import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";
import Constants from "expo-constants";

import { ThemedText } from "@/components/ThemedText";
import { IconLabelRow } from "@/components/IconLabelRow";
import { useTheme } from "@/hooks/useTheme";
import { ColorThemeName, ThemeMode } from "@/constants/theme";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useRTL } from "@/hooks/useRTL";
import { Language } from "@/lib/i18n";
import type { SettingsStackParamList } from "@/navigation/SettingsStackNavigator";
import { useUnits } from "@/contexts/UnitsContext";

interface LanguageOption {
  code: Language;
  name: string;
  nativeName: string;
}

const LANGUAGES: LanguageOption[] = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "ar", name: "Arabic", nativeName: "\u0627\u0644\u0639\u0631\u0628\u064a\u0629" },
];

interface ThemeOption {
  mode: ThemeMode;
  titleKey: "system_theme" | "light_mode" | "dark_mode";
  descKey: "theme_system_desc" | "theme_light_desc" | "theme_dark_desc";
  icon: "smartphone" | "sun" | "moon";
}

const THEME_OPTIONS: ThemeOption[] = [
  { mode: "system", titleKey: "system_theme", descKey: "theme_system_desc", icon: "smartphone" },
  { mode: "light", titleKey: "light_mode", descKey: "theme_light_desc", icon: "sun" },
  { mode: "dark", titleKey: "dark_mode", descKey: "theme_dark_desc", icon: "moon" },
];

interface ColorThemeOption {
  name: ColorThemeName;
  titleKey: "color_theme_midnight" | "color_theme_light" | "color_theme_emerald" | "color_theme_amber";
  descKey:
    | "color_theme_midnight_desc"
    | "color_theme_light_desc"
    | "color_theme_emerald_desc"
    | "color_theme_amber_desc";
  icon: "moon" | "sun" | "droplet" | "sunset";
}

const COLOR_THEME_OPTIONS: ColorThemeOption[] = [
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

type AuthMode = "none" | "signup" | "signin";
type SelectionSheetKey = "language" | "theme" | "colorTheme" | null;

type SettingsRowProps = {
  icon: React.ComponentProps<typeof Feather>["name"];
  title: string;
  value?: string;
  isRTL: boolean;
  theme: ReturnType<typeof useTheme>["theme"];
  onPress?: () => void;
  testID?: string;
  valueNumberOfLines?: number;
  valueWritingDirection?: "auto" | "ltr" | "rtl";
  trailingAccessory?: React.ReactNode;
};

type SelectionSheetOption = {
  key: string;
  title: string;
  subtitle?: string;
  icon?: React.ComponentProps<typeof Feather>["name"];
  selected: boolean;
  onPress: () => void;
  testID?: string;
};

type SelectionSheetProps = {
  visible: boolean;
  title: string;
  isRTL: boolean;
  theme: ReturnType<typeof useTheme>["theme"];
  options: SelectionSheetOption[];
  onClose: () => void;
};

function SettingsRow({
  icon,
  title,
  value,
  isRTL,
  theme,
  onPress,
  testID,
  valueNumberOfLines = 1,
  valueWritingDirection,
  trailingAccessory,
}: SettingsRowProps) {
  const content = (
    <View
      style={[
        styles.settingsRow,
        { flexDirection: isRTL ? "row-reverse" : "row" },
      ]}
    >
      <View style={[styles.settingsRowStart, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <Feather name={icon} size={18} color={theme.primary} />
        <ThemedText semanticVariant="labelPrimary" style={{ textAlign: isRTL ? "right" : "left" }}>
          {title}
        </ThemedText>
      </View>

      <View style={[styles.settingsRowEnd, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        {value ? (
          <ThemedText
            semanticVariant="labelSecondary"
            style={{
              color: theme.textSecondary,
              textAlign: isRTL ? "left" : "right",
              ...(valueWritingDirection ? { writingDirection: valueWritingDirection } : {}),
            }}
            numberOfLines={valueNumberOfLines}
          >
            {value}
          </ThemedText>
        ) : null}
        {trailingAccessory}
        {onPress ? (
          <Feather name={isRTL ? "chevron-left" : "chevron-right"} size={18} color={theme.textSecondary} />
        ) : null}
      </View>
    </View>
  );

  if (!onPress) {
    return content;
  }

  return (
    <Pressable
      style={({ pressed }) => [pressed && { opacity: 0.8 }]}
      onPress={onPress}
      accessibilityRole="button"
      testID={testID}
    >
      {content}
    </Pressable>
  );
}

function SelectionSheet({ visible, title, isRTL, theme, options, onClose }: SelectionSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.sheetOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" />
        <View
          style={[
            styles.sheetContainer,
            { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
          ]}
        >
          <View
            style={[
              styles.sheetHeader,
              { flexDirection: isRTL ? "row-reverse" : "row", borderBottomColor: theme.border },
            ]}
          >
            <ThemedText semanticVariant="sectionTitle" style={{ textAlign: isRTL ? "right" : "left" }}>
              {title}
            </ThemedText>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              style={styles.sheetCloseButton}
              hitSlop={8}
            >
              <Feather name="x" size={20} color={theme.textSecondary} />
            </Pressable>
          </View>

          <View style={styles.sheetOptions}>
            {options.map((option, index) => (
              <Pressable
                key={option.key}
                style={[
                  styles.sheetOptionRow,
                  {
                    flexDirection: isRTL ? "row-reverse" : "row",
                    borderBottomColor: theme.border,
                    borderBottomWidth: index < options.length - 1 ? 1 : 0,
                  },
                ]}
                onPress={option.onPress}
                accessibilityRole="button"
                accessibilityState={{ selected: option.selected }}
                testID={option.testID}
              >
                <View style={[styles.sheetOptionStart, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                  {option.icon ? (
                    <Feather
                      name={option.icon}
                      size={18}
                      color={option.selected ? theme.primary : theme.textSecondary}
                    />
                  ) : null}
                  <View>
                    <ThemedText semanticVariant="labelPrimary" style={{ textAlign: isRTL ? "right" : "left" }}>
                      {option.title}
                    </ThemedText>
                    {option.subtitle ? (
                      <ThemedText
                        semanticVariant="labelSecondary"
                        style={{ color: theme.textSecondary, textAlign: isRTL ? "right" : "left" }}
                      >
                        {option.subtitle}
                      </ThemedText>
                    ) : null}
                  </View>
                </View>

                <View style={styles.sheetOptionEnd}>
                  {option.selected ? (
                    <View style={[styles.checkCircle, { backgroundColor: theme.primary }]}>
                      <Feather name="check" size={16} color={theme.buttonText} />
                    </View>
                  ) : null}
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function SettingsScreen() {
  const { theme, mode, setMode, colorTheme, setColorTheme, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const layout = useResponsiveLayout();
  const { t, language, setLanguage, isRTL } = useLanguage();
  const { unitsConfig } = useUnits();
  const { user, profile, signOut, signIn, isGuest, upgradeGuestAccount, authError } = useAuth();
  const { rtlRow, rtlText } = useRTL();
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();

  const [authMode, setAuthMode] = useState<AuthMode>("none");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSelectionSheet, setActiveSelectionSheet] = useState<SelectionSheetKey>(null);

  const handleSignOut = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    signOut();
  };

  const appVersion = Constants.expoConfig?.version || "1.0.0";
  const displayValue = profile?.displayName?.trim()
    ? profile.displayName
    : user?.email ?? "";
  const currentLanguageOption = LANGUAGES.find((option) => option.code === language);
  const currentThemeOption = THEME_OPTIONS.find((option) => option.mode === mode);
  const currentColorThemeOption = COLOR_THEME_OPTIONS.find((option) => option.name === colorTheme);
  const unitsPresetLabel =
    unitsConfig.preset === "metric"
      ? t("units_metric")
      : unitsConfig.preset === "english"
        ? t("units_english")
        : t("units_custom");

  const handleSelectLanguage = (lang: Language) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLanguage(lang);
  };

  const handleSelectTheme = (themeMode: ThemeMode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setMode(themeMode);
  };

  const handleSelectColorTheme = (themeName: ColorThemeName) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setColorTheme(themeName);
  };

  const closeSelectionSheet = () => setActiveSelectionSheet(null);

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setDisplayName("");
    setError(null);
    setAuthMode("none");
  };

  const handleUpgradeAccount = async () => {
    if (!email || !password) {
      setError(t("email") + " " + t("password") + " required");
      return;
    }

    if (authMode === "signup" && password !== confirmPassword) {
      setError(t("passwords_dont_match"));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (authMode === "signup") {
        const result = await upgradeGuestAccount(email, password, displayName || undefined);
        if (result.error) {
          setError(result.error);
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert(t("account_upgraded"), "", [{ text: "OK" }]);
          resetForm();
        }
      } else if (authMode === "signin") {
        const result = await signIn(email, password);
        if (result.error) {
          setError(result.error.message);
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert(t("sign_in_success"), "", [{ text: "OK" }]);
          resetForm();
        }
      }
    } catch (e: any) {
      setError(e.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const renderSetupRequiredSection = () => (
    <Animated.View entering={FadeInDown.delay(100).duration(300)}>
      <ThemedText semanticVariant="sectionTitle" style={[styles.sectionTitle, rtlText]}>
        {t("account")}
      </ThemedText>

      <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
        <View style={styles.aboutRow}>
          <IconLabelRow
            icon="alert-circle"
            iconColor={theme.warning}
            title={t("setup_required")}
            subtitle={t("setup_required_desc")}
          />
        </View>
      </View>
    </Animated.View>
  );

  const renderGuestSection = () => (
    <Animated.View entering={FadeInDown.delay(100).duration(300)}>
      <ThemedText semanticVariant="sectionTitle" style={[styles.sectionTitle, rtlText]}>
        {t("account")}
      </ThemedText>

      <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
        {authMode === "none" ? (
          <>
            <View style={[styles.aboutRow, { borderBottomColor: theme.border, borderBottomWidth: 1 }]}>
              <IconLabelRow
                icon="user"
                iconColor={theme.warning}
                title={t("guest_mode")}
                subtitle={t("guest_mode_desc")}
              />
            </View>

            <Pressable
              style={[styles.aboutRow, { borderBottomColor: theme.border, borderBottomWidth: 1 }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setAuthMode("signup");
              }}
            >
              <IconLabelRow
                icon="user-plus"
                iconColor={theme.success}
                title={t("create_account")}
                titleStyle={{ color: theme.success }}
                subtitle={t("upgrade_account_desc")}
                rightAccessory={
                  <Feather name={isRTL ? "chevron-left" : "chevron-right"} size={20} color={theme.textSecondary} />
                }
              />
            </Pressable>

            <Pressable
              style={styles.aboutRow}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setAuthMode("signin");
              }}
            >
              <IconLabelRow
                icon="log-in"
                iconColor={theme.primary}
                title={t("sign_in")}
                titleStyle={{ color: theme.primary }}
                subtitle={t("already_have_account")}
                rightAccessory={
                  <Feather name={isRTL ? "chevron-left" : "chevron-right"} size={20} color={theme.textSecondary} />
                }
              />
            </Pressable>
          </>
        ) : (
          <View style={styles.formContainer}>
            <View style={[rtlRow, { alignItems: "center", marginBottom: Spacing.lg }]}>
              <Pressable onPress={resetForm} style={{ padding: Spacing.sm }}>
                <Feather name={isRTL ? "arrow-right" : "arrow-left"} size={24} color={theme.text} />
              </Pressable>
              <ThemedText semanticVariant="sectionTitle" style={[{ flex: 1, textAlign: "center" }, rtlText]}>
                {authMode === "signup" ? t("create_account") : t("sign_in")}
              </ThemedText>
              <View style={{ width: 40 }} />
            </View>

            {error && (
              <View style={[styles.errorBox, { backgroundColor: theme.error + "20" }]}>
                <ThemedText semanticVariant="helper" style={{ color: theme.error, textAlign: "center" }}>
                  {error}
                </ThemedText>
              </View>
            )}

            <View style={styles.inputGroup}>
              <ThemedText semanticVariant="labelSecondary" style={[styles.inputLabel, { color: theme.textSecondary }, rtlText]}>
                {t("email")}
              </ThemedText>
              <TextInput
                allowFontScaling={false}
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.backgroundRoot,
                    color: theme.text,
                    borderColor: theme.border,
                    ...typography.getVariantStyle("tableCellValue"),
                    ...typography.getTextInputStyle("regular"),
                    ...(Platform.OS === "web" ? { textAlign: isRTL ? "right" as const : "left" as const } : {}),
                  },
                ]}
                value={email}
                onChangeText={setEmail}
                placeholder="email@example.com"
                placeholderTextColor={theme.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText semanticVariant="labelSecondary" style={[styles.inputLabel, { color: theme.textSecondary }, rtlText]}>
                {t("password")}
              </ThemedText>
              <TextInput
                allowFontScaling={false}
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.backgroundRoot,
                    color: theme.text,
                    borderColor: theme.border,
                    ...typography.getVariantStyle("tableCellValue"),
                    ...typography.getTextInputStyle("regular"),
                    ...(Platform.OS === "web" ? { textAlign: isRTL ? "right" as const : "left" as const } : {}),
                  },
                ]}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={theme.textSecondary}
                secureTextEntry
              />
            </View>

            {authMode === "signup" && (
              <>
                <View style={styles.inputGroup}>
                  <ThemedText semanticVariant="labelSecondary" style={[styles.inputLabel, { color: theme.textSecondary }, rtlText]}>
                    {t("confirm_password")}
                  </ThemedText>
                  <TextInput
                    allowFontScaling={false}
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.backgroundRoot,
                        color: theme.text,
                        borderColor: theme.border,
                        ...typography.getVariantStyle("tableCellValue"),
                        ...typography.getTextInputStyle("regular"),
                        ...(Platform.OS === "web" ? { textAlign: isRTL ? "right" as const : "left" as const } : {}),
                      },
                    ]}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="••••••••"
                    placeholderTextColor={theme.textSecondary}
                    secureTextEntry
                  />
                </View>

                <View style={styles.inputGroup}>
                  <ThemedText semanticVariant="labelSecondary" style={[styles.inputLabel, { color: theme.textSecondary }, rtlText]}>
                    {t("display_name")} ({t("optional")})
                  </ThemedText>
                  <TextInput
                    allowFontScaling={false}
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.backgroundRoot,
                        color: theme.text,
                        borderColor: theme.border,
                        ...typography.getVariantStyle("tableCellValue"),
                        ...typography.getTextInputStyle("regular"),
                        ...(Platform.OS === "web" ? { textAlign: isRTL ? "right" as const : "left" as const } : {}),
                      },
                    ]}
                    value={displayName}
                    onChangeText={setDisplayName}
                    placeholder="Engineer"
                    placeholderTextColor={theme.textSecondary}
                    autoCapitalize="words"
                  />
                </View>
              </>
            )}

            <Pressable
              style={[
                styles.submitButton,
                { backgroundColor: theme.primary },
                loading && { opacity: 0.7 },
              ]}
              onPress={handleUpgradeAccount}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={theme.buttonText} />
              ) : (
                <ThemedText semanticVariant="button" style={{ color: theme.buttonText }}>
                  {authMode === "signup" ? t("create_account") : t("sign_in")}
                </ThemedText>
              )}
            </Pressable>

            <Pressable
              style={styles.switchModeButton}
              onPress={() => {
                setError(null);
                setAuthMode(authMode === "signup" ? "signin" : "signup");
              }}
            >
              <ThemedText semanticVariant="helper" style={{ color: theme.primary, textAlign: "center" }}>
                {authMode === "signup" ? t("already_have_account") : t("dont_have_account")}
              </ThemedText>
            </Pressable>
          </View>
        )}
      </View>
    </Animated.View>
  );

  const renderLoggedInSection = () => (
    <Animated.View entering={FadeInDown.delay(100).duration(300)}>
      <ThemedText semanticVariant="sectionTitle" style={[styles.sectionTitle, rtlText]}>
        {t("account")}
      </ThemedText>

      <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
        <View style={[styles.groupedRow, { borderBottomColor: theme.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
          <SettingsRow
            icon="user"
            title={t("display_name")}
            value={displayValue}
            trailingAccessory={
              profile?.avatarUrl ? (
                <Image source={{ uri: profile.avatarUrl }} style={styles.accountAvatar} />
              ) : (
                <View style={[styles.accountAvatarPlaceholder, { backgroundColor: theme.backgroundSecondary }]}>
                  <Feather name="user" size={18} color={theme.textSecondary} />
                </View>
              )
            }
            isRTL={isRTL}
            theme={theme}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate("AccountSettings");
            }}
          />
        </View>

        <View style={styles.groupedRow}>
          <SettingsRow
            icon="log-out"
            title={t("sign_out")}
            isRTL={isRTL}
            theme={{ ...theme, primary: theme.error }}
            onPress={handleSignOut}
          />
        </View>
      </View>
    </Animated.View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: tabBarHeight + Spacing.xl,
          paddingHorizontal: layout.horizontalPadding,
          maxWidth: layout.isTablet ? layout.contentMaxWidth : undefined,
          alignSelf: layout.isTablet ? "center" : undefined,
          width: layout.isTablet ? "100%" : undefined,
        }}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {!user && authError ? renderSetupRequiredSection() : isGuest ? renderGuestSection() : renderLoggedInSection()}

        <Animated.View entering={FadeInDown.duration(300)}>
          <ThemedText semanticVariant="sectionTitle" style={[styles.sectionTitle, rtlText]}>
            {t("language")}
          </ThemedText>

          <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.groupedRow}>
              <SettingsRow
                icon="globe"
                title={t("language")}
                value={currentLanguageOption?.nativeName || currentLanguageOption?.name}
                isRTL={isRTL}
                theme={theme}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  navigation.navigate("LanguageSettings");
                }}
                testID="button-open-language-sheet"
              />
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(50).duration(300)}>
          <ThemedText semanticVariant="sectionTitle" style={[styles.sectionTitle, rtlText]}>
            {t("units")}
          </ThemedText>

          <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.groupedRow}>
              <SettingsRow
                icon="sliders"
                title={t("units")}
                value={unitsPresetLabel}
                isRTL={isRTL}
                theme={theme}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  navigation.navigate("UnitsSettings");
                }}
              />
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(75).duration(300)}>
          <ThemedText semanticVariant="sectionTitle" style={[styles.sectionTitle, rtlText]}>
            {t("theme")}
          </ThemedText>

          <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
            <View style={[styles.groupedRow, { borderBottomColor: theme.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
              <SettingsRow
                icon="moon"
                title={t("theme")}
                value={currentThemeOption ? t(currentThemeOption.titleKey) : ""}
                isRTL={isRTL}
                theme={theme}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  navigation.navigate("ThemeSettings");
                }}
                testID="button-open-theme-sheet"
              />
            </View>

            <View style={styles.groupedRow}>
              <SettingsRow
                icon="droplet"
                title={t("color_theme")}
                value={currentColorThemeOption ? t(currentColorThemeOption.titleKey) : ""}
                isRTL={isRTL}
                theme={theme}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  navigation.navigate("ColorThemeSettings");
                }}
                testID="button-open-color-theme-sheet"
              />
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(300)}>
          <ThemedText semanticVariant="sectionTitle" style={[styles.sectionTitle, rtlText]}>
            {t("about")}
          </ThemedText>

          <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
            <View style={[styles.groupedRow, { borderBottomColor: theme.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
              <SettingsRow
                icon="zap"
                title={t("app_name")}
                isRTL={isRTL}
                theme={theme}
              />
            </View>

            <View style={[styles.groupedRow, { borderBottomColor: theme.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
              <SettingsRow
                icon="hash"
                title={t("version_label")}
                value={appVersion}
                isRTL={isRTL}
                theme={theme}
                valueWritingDirection="ltr"
              />
            </View>

            <View style={styles.groupedRow}>
              <SettingsRow
                icon="user"
                title={t("developer")}
                value={t("developer_name")}
                isRTL={isRTL}
                theme={theme}
              />
            </View>
          </View>
        </Animated.View>

        <SelectionSheet
          visible={activeSelectionSheet === "language"}
          title={t("language")}
          isRTL={isRTL}
          theme={theme}
          onClose={closeSelectionSheet}
          options={LANGUAGES.map((lang) => ({
            key: lang.code,
            title: lang.nativeName,
            subtitle: lang.name,
            selected: language === lang.code,
            onPress: () => {
              handleSelectLanguage(lang.code);
              closeSelectionSheet();
            },
            testID: `button-language-${lang.code}`,
          }))}
        />

        <SelectionSheet
          visible={activeSelectionSheet === "theme"}
          title={t("theme")}
          isRTL={isRTL}
          theme={theme}
          onClose={closeSelectionSheet}
          options={THEME_OPTIONS.map((option) => ({
            key: option.mode,
            title: t(option.titleKey),
            subtitle: t(option.descKey),
            icon: option.icon,
            selected: mode === option.mode,
            onPress: () => {
              handleSelectTheme(option.mode);
              closeSelectionSheet();
            },
            testID: `button-theme-${option.mode}`,
          }))}
        />

        <SelectionSheet
          visible={activeSelectionSheet === "colorTheme"}
          title={t("color_theme")}
          isRTL={isRTL}
          theme={theme}
          onClose={closeSelectionSheet}
          options={COLOR_THEME_OPTIONS.map((option) => ({
            key: option.name,
            title: t(option.titleKey),
            subtitle: t(option.descKey),
            icon: option.icon,
            selected: colorTheme === option.name,
            onPress: () => {
              handleSelectColorTheme(option.name);
              closeSelectionSheet();
            },
            testID: `button-color-theme-${option.name}`,
          }))}
        />

        <View style={styles.footer}>
          <ThemedText
            semanticVariant="helper"
            style={{
              color: theme.textSecondary,
              textAlign: "center",
              writingDirection: isRTL ? "rtl" : "ltr",
            }}
          >
            {isRTL
              ? "يساعد E-nergy Flow المشغلين على تسجيل و مراجعة قراءات الطاقة حسب الوجبات."
              : "E-nergy Flow helps operators log and review plant energy readings across shifts."}
          </ThemedText>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  sectionTitle: {
    marginBottom: Spacing.sm,
  },
  card: {
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    overflow: "hidden",
  },
  groupedRow: {
    paddingHorizontal: Spacing.lg,
  },
  settingsRow: {
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
    width: "100%",
    minHeight: 56,
  },
  settingsRowStart: {
    alignItems: "center",
    gap: Spacing.sm,
    flexShrink: 1,
  },
  settingsRowEnd: {
    alignItems: "center",
    gap: Spacing.xs,
    flexShrink: 1,
    maxWidth: "62%",
  },
  accountAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  accountAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
    borderBottomWidth: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  languageOptions: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  languageOption: {
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.28)",
  },
  sheetContainer: {
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    borderWidth: 1,
    borderBottomWidth: 0,
    overflow: "hidden",
    maxHeight: "70%",
  },
  sheetHeader: {
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  sheetCloseButton: {
    alignItems: "center",
    justifyContent: "center",
  },
  sheetOptions: {
    paddingVertical: Spacing.xs,
  },
  sheetOptionRow: {
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  sheetOptionStart: {
    alignItems: "center",
    gap: Spacing.md,
    flex: 1,
  },
  sheetOptionEnd: {
    minWidth: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  aboutRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  footer: {
    marginTop: Spacing.lg,
    alignItems: "center",
    paddingBottom: Spacing.xl,
  },
  formContainer: {
    padding: Spacing.lg,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  inputLabel: {
    marginBottom: Spacing.xs,
  },
  input: {
    height: 48,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    includeFontPadding: false,
  },
  errorBox: {
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
  },
  submitButton: {
    height: 48,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.md,
  },
  switchModeButton: {
    marginTop: Spacing.lg,
    padding: Spacing.sm,
  },
});

