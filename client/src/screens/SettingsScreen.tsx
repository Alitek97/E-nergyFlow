import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
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

interface LanguageOption {
  code: Language;
  name: string;
  nativeName: string;
}

const LANGUAGES: LanguageOption[] = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "ar", name: "Arabic", nativeName: "العربية" },
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

export default function SettingsScreen() {
  const { theme, mode, setMode, colorTheme, setColorTheme, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const layout = useResponsiveLayout();
  const { t, language, setLanguage, isRTL } = useLanguage();
  const { user, signOut, signIn, isGuest, upgradeGuestAccount, authError } = useAuth();
  const { rtlRow, rtlText } = useRTL();

  const [authMode, setAuthMode] = useState<AuthMode>("none");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignOut = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    signOut();
  };

  const appVersion = Constants.expoConfig?.version || "1.0.0";

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
        <View style={[styles.aboutRow, { borderBottomColor: theme.border, borderBottomWidth: 1 }]}>
          <IconLabelRow
            icon="user"
            iconColor={theme.primary}
            title={t("email")}
            subtitle={user?.email || ""}
          />
        </View>

        <Pressable
          style={styles.aboutRow}
          onPress={handleSignOut}
        >
          <IconLabelRow
            icon="log-out"
            iconColor={theme.error}
            title={t("sign_out")}
            titleStyle={{ color: theme.error }}
          />
        </Pressable>
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
        <Animated.View entering={FadeInDown.duration(300)}>
          <ThemedText semanticVariant="sectionTitle" style={[styles.sectionTitle, rtlText]}>
            {t("language")}
          </ThemedText>

          <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
            <View style={[styles.cardHeader, rtlRow, { borderBottomColor: theme.border }]}>
              <IconLabelRow
                icon="globe"
                iconColor={theme.primary}
                title={t("language")}
                subtitle={t("select_language")}
              />
            </View>

            <View style={styles.languageOptions}>
              {LANGUAGES.map((lang) => (
                <Pressable
                  key={lang.code}
                  style={[
                    styles.languageOption,
                    { borderColor: language === lang.code ? theme.primary : theme.border },
                    language === lang.code && { backgroundColor: theme.primary + "15" },
                  ]}
                  onPress={() => handleSelectLanguage(lang.code)}
                  testID={`button-language-${lang.code}`}
                >
                  <View style={[rtlRow, { alignItems: "center", justifyContent: "space-between" }]}>
                    <View>
                      <ThemedText semanticVariant="labelPrimary" style={rtlText}>
                        {lang.nativeName}
                      </ThemedText>
                      <ThemedText semanticVariant="labelSecondary" style={[{ color: theme.textSecondary }, rtlText]}>
                        {lang.name}
                      </ThemedText>
                    </View>
                    {language === lang.code ? (
                      <View style={[styles.checkCircle, { backgroundColor: theme.primary }]}>
                        <Feather name="check" size={16} color={theme.buttonText} />
                      </View>
                    ) : null}
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(50).duration(300)}>
          <ThemedText semanticVariant="sectionTitle" style={[styles.sectionTitle, rtlText]}>
            {t("theme")}
          </ThemedText>

          <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
            <View style={[styles.cardHeader, rtlRow, { borderBottomColor: theme.border }]}>
              <IconLabelRow
                icon="moon"
                iconColor={theme.primary}
                title={t("theme")}
                subtitle={t("select_theme")}
              />
            </View>

            <View style={styles.languageOptions}>
              {THEME_OPTIONS.map((option) => (
                <Pressable
                  key={option.mode}
                  style={[
                    styles.languageOption,
                    { borderColor: mode === option.mode ? theme.primary : theme.border },
                    mode === option.mode && { backgroundColor: theme.primary + "15" },
                  ]}
                  onPress={() => handleSelectTheme(option.mode)}
                  testID={`button-theme-${option.mode}`}
                >
                  <View style={[rtlRow, { alignItems: "center", justifyContent: "space-between" }]}>
                    <View style={[rtlRow, { alignItems: "center", flex: 1, gap: Spacing.md }]}>
                      <Feather 
                        name={option.icon} 
                        size={20} 
                        color={mode === option.mode ? theme.primary : theme.textSecondary} 
                      />
                      <View>
                        <ThemedText semanticVariant="labelPrimary" style={rtlText}>
                          {t(option.titleKey)}
                        </ThemedText>
                        <ThemedText semanticVariant="labelSecondary" style={[{ color: theme.textSecondary }, rtlText]}>
                          {t(option.descKey)}
                        </ThemedText>
                      </View>
                    </View>
                    {mode === option.mode ? (
                      <View style={[styles.checkCircle, { backgroundColor: theme.primary }]}>
                        <Feather name="check" size={16} color={theme.buttonText} />
                      </View>
                    ) : null}
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100).duration(300)}>
          <ThemedText semanticVariant="sectionTitle" style={[styles.sectionTitle, rtlText]}>
            {t("color_theme")}
          </ThemedText>

          <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
            <View style={[styles.cardHeader, rtlRow, { borderBottomColor: theme.border }]}>
              <IconLabelRow
                icon="droplet"
                iconColor={theme.primary}
                title={t("color_theme")}
                subtitle={t("select_color_theme")}
              />
            </View>

            <View style={styles.languageOptions}>
              {COLOR_THEME_OPTIONS.map((option) => (
                <Pressable
                  key={option.name}
                  style={[
                    styles.languageOption,
                    { borderColor: colorTheme === option.name ? theme.primary : theme.border },
                    colorTheme === option.name && { backgroundColor: theme.primary + "15" },
                  ]}
                  onPress={() => handleSelectColorTheme(option.name)}
                  testID={`button-color-theme-${option.name}`}
                >
                  <View style={[rtlRow, { alignItems: "center", justifyContent: "space-between" }]}>
                    <View style={[rtlRow, { alignItems: "center", flex: 1, gap: Spacing.md }]}>
                      <Feather
                        name={option.icon}
                        size={20}
                        color={colorTheme === option.name ? theme.primary : theme.textSecondary}
                      />
                      <View>
                        <ThemedText semanticVariant="labelPrimary" style={rtlText}>
                          {t(option.titleKey)}
                        </ThemedText>
                        <ThemedText semanticVariant="labelSecondary" style={[{ color: theme.textSecondary }, rtlText]}>
                          {t(option.descKey)}
                        </ThemedText>
                      </View>
                    </View>
                    {colorTheme === option.name ? (
                      <View style={[styles.checkCircle, { backgroundColor: theme.primary }]}>
                        <Feather name="check" size={16} color={theme.buttonText} />
                      </View>
                    ) : null}
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        </Animated.View>

        {!user && authError ? renderSetupRequiredSection() : isGuest ? renderGuestSection() : renderLoggedInSection()}

        <Animated.View entering={FadeInDown.delay(200).duration(300)}>
          <ThemedText semanticVariant="sectionTitle" style={[styles.sectionTitle, rtlText]}>
            {t("about")}
          </ThemedText>

          <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
            <View style={[styles.aboutRow, { borderBottomColor: theme.border, borderBottomWidth: 1 }]}>
              <IconLabelRow
                icon="zap"
                iconColor={theme.primary}
                title={t("app_name")}
                subtitle={`${t("version_label")} ${appVersion}`}
                subtitleStyle={{ writingDirection: "ltr" }}
              />
            </View>

            <View style={[styles.aboutRow, { borderBottomColor: theme.border, borderBottomWidth: 1 }]}>
              <IconLabelRow
                icon="user"
                iconColor={theme.success}
                title={t("developer")}
                subtitle={t("developer_name")}
              />
            </View>

            <View style={styles.aboutRow}>
              <IconLabelRow
                icon="shield"
                iconColor={theme.warning}
                title={t("copyright")}
                subtitle={t("copyright_text")}
              />
            </View>
          </View>
        </Animated.View>

        <View style={styles.footer}>
          <ThemedText semanticVariant="helper" style={{ color: theme.textSecondary, textAlign: "center", writingDirection: "ltr" }}>
            {t("version")}
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
    marginBottom: Spacing.md,
  },
  card: {
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    overflow: "hidden",
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
  aboutRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
  },
  footer: {
    marginTop: Spacing.xl,
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
