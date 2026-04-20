import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
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

import { IconLabelRow } from "@/components/IconLabelRow";
import { ThemedText } from "@/components/ThemedText";
import { DashboardBackdrop } from "@/components/visual/DashboardBackdrop";
import { BorderRadius, Spacing } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUnits } from "@/contexts/UnitsContext";
import {
  getResponsiveScrollContentStyle,
  useResponsiveLayout,
} from "@/hooks/useResponsiveLayout";
import { useRTL } from "@/hooks/useRTL";
import { useScadaEffects } from "@/hooks/useScadaEffects";
import { useTheme } from "@/hooks/useTheme";
import type { SettingsStackParamList } from "@/navigation/SettingsStackNavigator";

type AuthMode = "none" | "signup" | "signin";

type SettingsRowProps = {
  icon: React.ComponentProps<typeof Feather>["name"];
  title: string;
  subtitle?: string;
  value?: string;
  isRTL: boolean;
  theme: ReturnType<typeof useTheme>["theme"];
  onPress?: () => void;
  testID?: string;
  valueWritingDirection?: "auto" | "ltr" | "rtl";
  trailingAccessory?: React.ReactNode;
};

function SettingsRow({
  icon,
  title,
  subtitle,
  value,
  isRTL,
  theme,
  onPress,
  testID,
  valueWritingDirection,
  trailingAccessory,
}: SettingsRowProps) {
  const layout = useResponsiveLayout();
  const content = (
    <View
      style={[
        styles.settingsRow,
        layout.isCompactPhone && styles.settingsRowCompact,
        { flexDirection: isRTL ? "row-reverse" : "row" },
      ]}
    >
      <View
        style={[
          styles.settingsRowStart,
          layout.isCompactPhone && styles.settingsRowStartCompact,
          { flexDirection: isRTL ? "row-reverse" : "row" },
        ]}
      >
        <View
          style={[
            styles.settingsRowIconWrap,
            { backgroundColor: theme.primary + "14" },
          ]}
        >
          <Feather name={icon} size={18} color={theme.primary} />
        </View>
        <View style={styles.settingsTextBlock}>
          <ThemedText
            semanticVariant="labelPrimary"
            style={{ textAlign: isRTL ? "right" : "left" }}
          >
            {title}
          </ThemedText>
          {subtitle ? (
            <ThemedText
              semanticVariant="helper"
              style={{
                color: theme.textSecondary,
                textAlign: isRTL ? "right" : "left",
              }}
            >
              {subtitle}
            </ThemedText>
          ) : null}
        </View>
      </View>

      <View
        style={[
          styles.settingsRowEnd,
          layout.isCompactPhone && styles.settingsRowEndCompact,
          layout.isWideLayout && styles.settingsRowEndWide,
          { flexDirection: isRTL ? "row-reverse" : "row" },
        ]}
      >
        {trailingAccessory ? (
          <View style={styles.trailingAccessoryWrap}>{trailingAccessory}</View>
        ) : null}
        {value ? (
          <ThemedText
            semanticVariant="labelSecondary"
            style={{
              color: theme.textSecondary,
              textAlign: isRTL ? "left" : "right",
              ...(valueWritingDirection
                ? { writingDirection: valueWritingDirection }
                : {}),
            }}
            numberOfLines={1}
          >
            {value}
          </ThemedText>
        ) : null}
        {onPress ? (
          <View
            style={[
              styles.chevronWrap,
              { backgroundColor: theme.backgroundSecondary },
            ]}
          >
            <Feather
              name={isRTL ? "chevron-left" : "chevron-right"}
              size={18}
              color={theme.textSecondary}
            />
          </View>
        ) : null}
      </View>
    </View>
  );

  if (!onPress) {
    return content;
  }

  return (
    <Pressable
      style={({ pressed }) => [
        styles.rowPressable,
        pressed && { opacity: 0.82 },
      ]}
      onPress={onPress}
      accessibilityRole="button"
      testID={testID}
    >
      {content}
    </Pressable>
  );
}

function SettingsSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const { theme } = useTheme();
  const { rtlText } = useRTL();

  return (
    <View style={styles.sectionBlock}>
      <View style={styles.sectionHeaderBlock}>
        <ThemedText semanticVariant="sectionTitle" style={rtlText}>
          {title}
        </ThemedText>
        {subtitle ? (
          <ThemedText
            semanticVariant="helper"
            style={[
              styles.sectionHelper,
              { color: theme.textSecondary },
              rtlText,
            ]}
          >
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
      {children}
    </View>
  );
}

export default function SettingsScreen() {
  const { theme, mode, colorTheme, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const layout = useResponsiveLayout();
  const showWideLayout = layout.isWideLayout;
  const { t, language, isRTL } = useLanguage();
  const { unitsConfig } = useUnits();
  const { scadaEffectsEnabled, setScadaEffectsEnabled } = useScadaEffects();
  const { user, profile, signIn, isGuest, upgradeGuestAccount, authError } =
    useAuth();
  const { rtlRow, rtlText } = useRTL();
  const navigation =
    useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();

  const [authMode, setAuthMode] = useState<AuthMode>("none");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const appVersion = Constants.expoConfig?.version || "1.0.0";
  const scrollContentStyle = useMemo(
    () =>
      getResponsiveScrollContentStyle(layout, {
        headerHeight,
        tabBarHeight,
        topSpacing: Spacing.lg,
        bottomSpacing: Spacing.xl,
      }),
    [headerHeight, layout, tabBarHeight],
  );
  const displayValue = profile?.displayName?.trim()
    ? profile.displayName
    : (user?.email ?? "");
  const currentLanguageLabel = language === "ar" ? t("arabic") : t("english");
  const currentThemeLabel =
    mode === "system"
      ? t("system_theme")
      : mode === "light"
        ? t("light_mode")
        : t("dark_mode");
  const currentColorThemeLabel =
    colorTheme === "midnight"
      ? t("color_theme_midnight")
      : colorTheme === "light"
        ? t("color_theme_light")
        : colorTheme === "emerald"
          ? t("color_theme_emerald")
          : colorTheme === "amber"
            ? t("color_theme_amber")
            : t("color_theme_purple");
  const unitsPresetLabel =
    unitsConfig.preset === "metric"
      ? t("units_metric")
      : unitsConfig.preset === "english"
        ? t("units_english")
        : t("units_custom");

  const handleToggleScadaEffects = (enabled: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setScadaEffectsEnabled(enabled);
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
        const result = await upgradeGuestAccount(
          email,
          password,
          displayName || undefined,
        );
        if (result.error) {
          setError(result.error);
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert(t("account_upgraded"), "", [{ text: "OK" }]);
          resetForm();
        }
      } else {
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

  const renderGuestSection = () => (
    <Animated.View entering={FadeInDown.delay(100).duration(300)}>
      <SettingsSection title={t("account")} subtitle={t("guest_mode_desc")}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.backgroundDefault,
              borderColor: theme.border,
            },
          ]}
        >
          {authMode === "none" ? (
            <>
              <View
                style={[
                  styles.aboutRow,
                  { borderBottomColor: theme.border, borderBottomWidth: 1 },
                ]}
              >
                <IconLabelRow
                  icon="user"
                  iconColor={theme.warning}
                  title={t("guest_mode")}
                  subtitle={t("guest_mode_desc")}
                />
              </View>
              <Pressable
                style={[
                  styles.aboutRow,
                  { borderBottomColor: theme.border, borderBottomWidth: 1 },
                ]}
                onPress={() => setAuthMode("signup")}
              >
                <IconLabelRow
                  icon="user-plus"
                  iconColor={theme.success}
                  title={t("create_account")}
                  titleStyle={{ color: theme.success }}
                  subtitle={t("settings_create_account_hint")}
                  rightAccessory={
                    <Feather
                      name={isRTL ? "chevron-left" : "chevron-right"}
                      size={20}
                      color={theme.textSecondary}
                    />
                  }
                />
              </Pressable>
              <Pressable
                style={styles.aboutRow}
                onPress={() => setAuthMode("signin")}
              >
                <IconLabelRow
                  icon="log-in"
                  iconColor={theme.primary}
                  title={t("sign_in")}
                  titleStyle={{ color: theme.primary }}
                  subtitle={t("settings_sign_in_hint")}
                  rightAccessory={
                    <Feather
                      name={isRTL ? "chevron-left" : "chevron-right"}
                      size={20}
                      color={theme.textSecondary}
                    />
                  }
                />
              </Pressable>
            </>
          ) : (
            <View style={styles.formContainer}>
              <View
                style={[
                  rtlRow,
                  { alignItems: "center", marginBottom: Spacing.lg },
                ]}
              >
                <Pressable onPress={resetForm} style={{ padding: Spacing.sm }}>
                  <Feather
                    name={isRTL ? "arrow-right" : "arrow-left"}
                    size={24}
                    color={theme.text}
                  />
                </Pressable>
                <ThemedText
                  semanticVariant="sectionTitle"
                  style={[{ flex: 1, textAlign: "center" }, rtlText]}
                >
                  {authMode === "signup" ? t("create_account") : t("sign_in")}
                </ThemedText>
                <View style={{ width: 40 }} />
              </View>

              {error ? (
                <View
                  style={[
                    styles.errorBox,
                    { backgroundColor: theme.error + "18" },
                  ]}
                >
                  <ThemedText
                    semanticVariant="helper"
                    style={{ color: theme.error, textAlign: "center" }}
                  >
                    {error}
                  </ThemedText>
                </View>
              ) : null}

              <View style={styles.inputGroup}>
                <ThemedText
                  semanticVariant="labelSecondary"
                  style={[
                    styles.inputLabel,
                    { color: theme.textSecondary },
                    rtlText,
                  ]}
                >
                  {t("email")}
                </ThemedText>
                <TextInput
                  allowFontScaling={false}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="email@example.com"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.backgroundRoot,
                      color: theme.text,
                      borderColor: theme.border,
                      ...typography.getVariantStyle("tableCellValue"),
                      ...typography.getTextInputStyle("regular"),
                      ...(Platform.OS === "web"
                        ? {
                            textAlign: isRTL
                              ? ("right" as const)
                              : ("left" as const),
                          }
                        : {}),
                    },
                  ]}
                />
              </View>

              <View style={styles.inputGroup}>
                <ThemedText
                  semanticVariant="labelSecondary"
                  style={[
                    styles.inputLabel,
                    { color: theme.textSecondary },
                    rtlText,
                  ]}
                >
                  {t("password")}
                </ThemedText>
                <TextInput
                  allowFontScaling={false}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor={theme.textSecondary}
                  secureTextEntry
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.backgroundRoot,
                      color: theme.text,
                      borderColor: theme.border,
                      ...typography.getVariantStyle("tableCellValue"),
                      ...typography.getTextInputStyle("regular"),
                      ...(Platform.OS === "web"
                        ? {
                            textAlign: isRTL
                              ? ("right" as const)
                              : ("left" as const),
                          }
                        : {}),
                    },
                  ]}
                />
              </View>

              {authMode === "signup" ? (
                <>
                  <View style={styles.inputGroup}>
                    <ThemedText
                      semanticVariant="labelSecondary"
                      style={[
                        styles.inputLabel,
                        { color: theme.textSecondary },
                        rtlText,
                      ]}
                    >
                      {t("confirm_password")}
                    </ThemedText>
                    <TextInput
                      allowFontScaling={false}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder="••••••••"
                      placeholderTextColor={theme.textSecondary}
                      secureTextEntry
                      style={[
                        styles.input,
                        {
                          backgroundColor: theme.backgroundRoot,
                          color: theme.text,
                          borderColor: theme.border,
                          ...typography.getVariantStyle("tableCellValue"),
                          ...typography.getTextInputStyle("regular"),
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <ThemedText
                      semanticVariant="labelSecondary"
                      style={[
                        styles.inputLabel,
                        { color: theme.textSecondary },
                        rtlText,
                      ]}
                    >
                      {t("display_name")} ({t("optional")})
                    </ThemedText>
                    <TextInput
                      allowFontScaling={false}
                      value={displayName}
                      onChangeText={setDisplayName}
                      placeholder="Engineer"
                      placeholderTextColor={theme.textSecondary}
                      autoCapitalize="words"
                      style={[
                        styles.input,
                        {
                          backgroundColor: theme.backgroundRoot,
                          color: theme.text,
                          borderColor: theme.border,
                          ...typography.getVariantStyle("tableCellValue"),
                          ...typography.getTextInputStyle("regular"),
                        },
                      ]}
                    />
                  </View>
                </>
              ) : null}

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
                  <ThemedText
                    semanticVariant="button"
                    style={{ color: theme.buttonText }}
                  >
                    {authMode === "signup" ? t("create_account") : t("sign_in")}
                  </ThemedText>
                )}
              </Pressable>

              <Pressable
                style={styles.switchModeButton}
                onPress={() =>
                  setAuthMode(authMode === "signup" ? "signin" : "signup")
                }
              >
                <ThemedText
                  semanticVariant="helper"
                  style={{ color: theme.primary, textAlign: "center" }}
                >
                  {authMode === "signup"
                    ? t("already_have_account")
                    : t("dont_have_account")}
                </ThemedText>
              </Pressable>
            </View>
          )}
        </View>
      </SettingsSection>
    </Animated.View>
  );

  const renderLoggedInSection = () => (
    <Animated.View entering={FadeInDown.delay(100).duration(300)}>
      <SettingsSection
        title={t("account")}
        subtitle={t("settings_account_subtitle")}
      >
        <Pressable
          style={[
            styles.heroCard,
            {
              backgroundColor: theme.backgroundDefault,
              borderColor: theme.border,
            },
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.navigate("AccountSettings");
          }}
          accessibilityRole="button"
        >
          <View style={[styles.heroRow, rtlRow]}>
            <View style={styles.heroTextBlock}>
              <ThemedText semanticVariant="sectionTitle" style={rtlText}>
                {displayValue || t("account")}
              </ThemedText>
              <ThemedText
                semanticVariant="helper"
                style={[rtlText, { color: theme.textSecondary }]}
              >
                {user?.email || t("guest_mode")}
              </ThemedText>
            </View>
            {profile?.avatarUrl ? (
              <Image
                source={{ uri: profile.avatarUrl }}
                style={styles.heroAvatar}
              />
            ) : (
              <View
                style={[
                  styles.heroAvatarFallback,
                  { backgroundColor: theme.primary + "14" },
                ]}
              >
                <Feather name="user" size={22} color={theme.primary} />
              </View>
            )}
          </View>
          <View
            style={[
              styles.accountCardFooter,
              { flexDirection: isRTL ? "row-reverse" : "row" },
            ]}
          >
            <ThemedText
              semanticVariant="helper"
              style={{ color: theme.textSecondary }}
            >
              {t("settings_account_manage_hint")}
            </ThemedText>
            <View
              style={[
                styles.chevronWrap,
                { backgroundColor: theme.backgroundSecondary },
              ]}
            >
              <Feather
                name={isRTL ? "chevron-left" : "chevron-right"}
                size={18}
                color={theme.textSecondary}
              />
            </View>
          </View>
        </Pressable>
      </SettingsSection>
    </Animated.View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <DashboardBackdrop intensity="subtle" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={scrollContentStyle}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View entering={FadeInDown.duration(280)}>
          <View
            style={[
              styles.dashboardCard,
              {
                backgroundColor: theme.backgroundDefault,
                borderColor: theme.border,
              },
            ]}
          >
            <View style={[styles.heroTopRow, rtlRow]}>
              <View
                style={[
                  styles.heroBadge,
                  { backgroundColor: theme.primary + "14" },
                ]}
              >
                <Feather name="settings" size={18} color={theme.primary} />
              </View>
              <View style={styles.heroStatusRow}>
                <View
                  style={[
                    styles.statusPill,
                    { backgroundColor: theme.backgroundSecondary },
                  ]}
                >
                  <ThemedText
                    semanticVariant="helper"
                    style={{ color: theme.textSecondary }}
                  >
                    {currentThemeLabel}
                  </ThemedText>
                </View>
                <View
                  style={[
                    styles.statusPill,
                    { backgroundColor: theme.backgroundSecondary },
                  ]}
                >
                  <ThemedText
                    semanticVariant="helper"
                    style={{ color: theme.textSecondary }}
                  >
                    {unitsPresetLabel}
                  </ThemedText>
                </View>
              </View>
            </View>
            <ThemedText
              semanticVariant="sectionTitle"
              style={[styles.heroTitle, rtlText]}
            >
              {t("settings_dashboard_title")}
            </ThemedText>
            <ThemedText
              semanticVariant="helper"
              style={[
                styles.heroSubtitle,
                { color: theme.textSecondary },
                rtlText,
              ]}
            >
              {t("settings_dashboard_subtitle")}
            </ThemedText>
          </View>
        </Animated.View>

        {!user && authError
          ? null
          : isGuest
            ? renderGuestSection()
            : renderLoggedInSection()}

        <View
          style={[
            styles.sectionsGrid,
            showWideLayout && styles.sectionsGridWide,
          ]}
        >
          <Animated.View
            entering={FadeInDown.duration(300)}
            style={[
              styles.sectionGridItem,
              showWideLayout && styles.sectionGridItemWide,
            ]}
          >
            <SettingsSection
              title={t("language")}
              subtitle={t("settings_language_subtitle")}
            >
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: theme.backgroundDefault,
                    borderColor: theme.border,
                  },
                ]}
              >
                <View style={styles.groupedRow}>
                  <SettingsRow
                    icon="globe"
                    title={t("language")}
                    subtitle={t("select_language")}
                    value={currentLanguageLabel}
                    isRTL={isRTL}
                    theme={theme}
                    onPress={() => navigation.navigate("LanguageSettings")}
                  />
                </View>
              </View>
            </SettingsSection>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(50).duration(300)}
            style={[
              styles.sectionGridItem,
              showWideLayout && styles.sectionGridItemWide,
            ]}
          >
            <SettingsSection
              title={t("units")}
              subtitle={t("settings_units_subtitle")}
            >
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: theme.backgroundDefault,
                    borderColor: theme.border,
                  },
                ]}
              >
                <View style={styles.groupedRow}>
                  <SettingsRow
                    icon="sliders"
                    title={t("units")}
                    subtitle={t("units_helper_top")}
                    value={unitsPresetLabel}
                    isRTL={isRTL}
                    theme={theme}
                    onPress={() => navigation.navigate("UnitsSettings")}
                  />
                </View>
              </View>
            </SettingsSection>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(75).duration(300)}
            style={[
              styles.sectionGridItem,
              showWideLayout && styles.sectionGridItemWide,
            ]}
          >
            <SettingsSection
              title={t("theme")}
              subtitle={t("settings_appearance_subtitle")}
            >
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: theme.backgroundDefault,
                    borderColor: theme.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.groupedRow,
                    {
                      borderBottomColor: theme.border,
                      borderBottomWidth: StyleSheet.hairlineWidth,
                    },
                  ]}
                >
                  <SettingsRow
                    icon="moon"
                    title={t("theme")}
                    subtitle={t("theme_helper_top")}
                    value={currentThemeLabel}
                    isRTL={isRTL}
                    theme={theme}
                    onPress={() => navigation.navigate("ThemeSettings")}
                  />
                </View>
                <View style={styles.groupedRow}>
                  <SettingsRow
                    icon="droplet"
                    title={t("color_theme")}
                    subtitle={t("color_theme_helper_top")}
                    value={currentColorThemeLabel}
                    isRTL={isRTL}
                    theme={theme}
                    onPress={() => navigation.navigate("ColorThemeSettings")}
                  />
                </View>
              </View>
            </SettingsSection>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(100).duration(300)}
            style={[
              styles.sectionGridItem,
              showWideLayout && styles.sectionGridItemWide,
            ]}
          >
            <SettingsSection
              title={t("scada_effects")}
              subtitle={t("scada_effects_hint")}
            >
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: theme.backgroundDefault,
                    borderColor: theme.border,
                  },
                ]}
              >
                <View style={styles.groupedRow}>
                  <SettingsRow
                    icon="activity"
                    title={t("scada_effects")}
                    subtitle={t("settings_scada_subtitle")}
                    value={scadaEffectsEnabled ? t("enabled") : t("disabled")}
                    isRTL={isRTL}
                    theme={theme}
                    trailingAccessory={
                      <View style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }}>
                        <Switch
                          value={scadaEffectsEnabled}
                          onValueChange={handleToggleScadaEffects}
                          trackColor={{
                            false: theme.backgroundSecondary,
                            true: theme.primary + "66",
                          }}
                          thumbColor={
                            scadaEffectsEnabled
                              ? theme.primary
                              : theme.textSecondary
                          }
                        />
                      </View>
                    }
                  />
                </View>
              </View>
            </SettingsSection>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(200).duration(300)}
            style={[
              styles.sectionGridItem,
              showWideLayout && styles.sectionGridItemWide,
            ]}
          >
            <SettingsSection
              title={t("about")}
              subtitle={t("settings_about_subtitle")}
            >
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: theme.backgroundDefault,
                    borderColor: theme.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.groupedRow,
                    {
                      borderBottomColor: theme.border,
                      borderBottomWidth: StyleSheet.hairlineWidth,
                    },
                  ]}
                >
                  <SettingsRow
                    icon="zap"
                    title={t("app_name")}
                    subtitle={t("settings_about_app_hint")}
                    isRTL={isRTL}
                    theme={theme}
                  />
                </View>
                <View
                  style={[
                    styles.groupedRow,
                    {
                      borderBottomColor: theme.border,
                      borderBottomWidth: StyleSheet.hairlineWidth,
                    },
                  ]}
                >
                  <SettingsRow
                    icon="hash"
                    title={t("version_label")}
                    subtitle={t("settings_about_version_hint")}
                    value={appVersion}
                    valueWritingDirection="ltr"
                    isRTL={isRTL}
                    theme={theme}
                  />
                </View>
                <View style={styles.groupedRow}>
                  <SettingsRow
                    icon="user"
                    title={t("developer")}
                    subtitle={t("settings_about_developer_hint")}
                    value={t("developer_name")}
                    isRTL={isRTL}
                    theme={theme}
                  />
                </View>
              </View>
            </SettingsSection>
          </Animated.View>
        </View>

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
  container: { flex: 1, overflow: "hidden" },
  scrollView: { flex: 1 },
  sectionBlock: { marginBottom: Spacing.sm },
  sectionHeaderBlock: { marginBottom: Spacing.sm, gap: 4 },
  sectionHelper: { lineHeight: 20 },
  dashboardCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 10,
  },
  card: {
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  groupedRow: { paddingHorizontal: Spacing.lg },
  settingsRow: {
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
    width: "100%",
    minHeight: 70,
    paddingVertical: Spacing.sm,
  },
  settingsRowCompact: {
    alignItems: "flex-start",
  },
  settingsRowStart: { alignItems: "flex-start", gap: Spacing.sm, flex: 1 },
  settingsRowStartCompact: {
    width: "100%",
  },
  settingsRowIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  settingsTextBlock: { flex: 1, gap: 3 },
  settingsRowEnd: {
    alignItems: "center",
    gap: Spacing.xs,
    flexShrink: 1,
    maxWidth: "62%",
  },
  settingsRowEndCompact: {
    width: "100%",
    maxWidth: "100%",
    justifyContent: "space-between",
  },
  settingsRowEndWide: {
    maxWidth: "72%",
  },
  trailingAccessoryWrap: { alignItems: "center", justifyContent: "center" },
  chevronWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  rowPressable: { width: "100%" },
  heroCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.md,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.14,
    shadowRadius: 22,
    elevation: 10,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  heroTextBlock: { flex: 1, gap: 4 },
  heroBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  heroStatusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: Spacing.xs,
    flex: 1,
  },
  heroTitle: { marginTop: 0 },
  heroSubtitle: { lineHeight: 20 },
  heroAvatar: { width: 52, height: 52, borderRadius: 26 },
  heroAvatarFallback: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  statusPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: 999,
  },
  accountCardFooter: {
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
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
    paddingHorizontal: Spacing.md,
  },
  sectionsGrid: {
    gap: Spacing.sm,
  },
  sectionsGridWide: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  sectionGridItem: {
    width: "100%",
  },
  sectionGridItemWide: {
    width: "48.5%",
  },
  formContainer: { padding: Spacing.lg },
  inputGroup: { marginBottom: Spacing.md },
  inputLabel: { marginBottom: Spacing.xs },
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
  switchModeButton: { marginTop: Spacing.lg, padding: Spacing.sm },
});
