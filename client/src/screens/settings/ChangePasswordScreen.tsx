import React, { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  I18nManager,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { Ionicons } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { BorderRadius, Spacing } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/Toast";
import SettingsSubpageLayout from "@/components/settings/SettingsSubpageLayout";
import { SETTINGS_SUBPAGE_SIZES } from "@/components/settings/settingsSubpageStyles";

const MIN_PASSWORD_LENGTH = 8;

export default function ChangePasswordScreen() {
  const { theme, typography } = useTheme();
  const { isRTL } = useLanguage();
  const { show } = useToast();
  const { user, isConfigured } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const isMountedRef = useRef(true);

  const canEditPassword = Boolean(isConfigured && user && !user.is_anonymous);
  const hasEmailProvider = Boolean(
    user &&
      (user.app_metadata?.provider === "email" ||
        user.identities?.some((identity) => identity.provider === "email")),
  );
  const requiresCurrentPassword = canEditPassword && hasEmailProvider;
  const newIsLongEnough = newPassword.length >= MIN_PASSWORD_LENGTH;
  const confirmMatches = confirmPassword.length > 0 && confirmPassword === newPassword;
  const hasCurrentPassword = currentPassword.trim().length > 0;
  const inputDirection = I18nManager.isRTL ? "row-reverse" : "row";
  const isValid =
    canEditPassword &&
    newIsLongEnough &&
    confirmMatches &&
    (!requiresCurrentPassword || hasCurrentPassword);

  const strings = useMemo(
    () => ({
      title: isRTL ? "كلمة المرور" : "Password",
      subtitle: isRTL ? "تغيير كلمة المرور" : "Change password",
      currentPassword: isRTL ? "كلمة المرور الحالية" : "Current Password",
      newPassword: isRTL ? "كلمة المرور الجديدة" : "New Password",
      confirmPassword: isRTL ? "تأكيد كلمة المرور الجديدة" : "Confirm New Password",
      save: isRTL ? "حفظ" : "Save",
      currentPasswordHint: isRTL
        ? "أدخل كلمة المرور الحالية للتحقق قبل الحفظ."
        : "Enter your current password to verify before saving.",
      disabledHint: isRTL
        ? "لا يمكن تغيير كلمة المرور في وضع الضيف."
        : "Password change is unavailable for guest/local mode.",
      currentRequiredHint: isRTL
        ? "أدخل كلمة المرور الحالية للتأكيد."
        : "Enter your current password to confirm.",
      oauthReauthHint: isRTL
        ? "للأمان، قد يُطلب منك إعادة تسجيل الدخول."
        : "For security, you may be asked to re-authenticate.",
      tooShort: isRTL ? "يجب أن تكون كلمة المرور 8 أحرف على الأقل" : "Password must be at least 8 characters",
      mismatch: isRTL ? "كلمتا المرور غير متطابقتين" : "Passwords do not match",
      reauthFailed: isRTL ? "كلمة المرور الحالية غير صحيحة" : "Current password is incorrect",
      saveSuccess: isRTL ? "تم تحديث كلمة المرور" : "Password updated",
      saveError: isRTL ? "تعذر تحديث كلمة المرور" : "Could not update password",
    }),
    [isRTL],
  );

  React.useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleSavePassword = async () => {
    if (!canEditPassword || saving) return;

    if (!newIsLongEnough) {
      show(strings.tooShort, "error");
      return;
    }
    if (!confirmMatches) {
      show(strings.mismatch, "error");
      return;
    }

    if (isMountedRef.current) setSaving(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) {
        throw userError;
      }
      const sessionEmail = userData.user?.email?.trim() || "";

      if (requiresCurrentPassword && !hasCurrentPassword) {
        show(strings.currentRequiredHint, "error");
        return;
      }

      if (requiresCurrentPassword && sessionEmail) {
        const { error: verifyError } = await supabase.auth.signInWithPassword({
          email: sessionEmail,
          password: currentPassword,
        });
        if (verifyError) {
          show(strings.reauthFailed, "error");
          return;
        }
      }

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      show(strings.saveSuccess, "success");
    } catch (error) {
      console.warn("[ChangePassword] Update failed", error);
      show(strings.saveError, "error");
    } finally {
      if (isMountedRef.current) setSaving(false);
    }
  };

  return (
    <SettingsSubpageLayout keyboardShouldPersistTaps="handled">
        <ThemedText
          semanticVariant="helper"
          style={[styles.helperTextTop, { color: theme.textSecondary, textAlign: isRTL ? "right" : "left" }]}
        >
          {!canEditPassword
            ? strings.disabledHint
            : requiresCurrentPassword
              ? strings.currentPasswordHint
              : strings.oauthReauthHint}
        </ThemedText>

        <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
          <View style={[styles.cardHeader, { flexDirection: isRTL ? "row-reverse" : "row", borderBottomColor: theme.border }]}>
            <View style={[styles.headerLeading, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <View style={[styles.iconCircle, { backgroundColor: theme.backgroundSecondary }]}>
                <Feather name="lock" size={18} color={theme.textSecondary} />
              </View>
              <View style={styles.headerTextBlock}>
                <ThemedText semanticVariant="labelPrimary" style={[styles.rowTitle, { textAlign: isRTL ? "right" : "left" }]}>
                  {strings.title}
                </ThemedText>
                <ThemedText
                  semanticVariant="labelSecondary"
                  style={[styles.rowSubtitle, { color: theme.textSecondary, textAlign: isRTL ? "right" : "left" }]}
                >
                  {strings.subtitle}
                </ThemedText>
              </View>
            </View>

            <Pressable
              onPress={handleSavePassword}
              disabled={!isValid || saving}
              style={[
                styles.saveButton,
                { backgroundColor: isValid ? theme.primary : theme.border },
                (!isValid || saving) && { opacity: 0.7 },
              ]}
            >
              {saving ? (
                <ActivityIndicator size="small" color={theme.buttonText} />
              ) : (
                <ThemedText semanticVariant="button" style={{ color: theme.buttonText }}>
                  {strings.save}
                </ThemedText>
              )}
            </Pressable>
          </View>

          <View style={[styles.inputRow, { borderBottomColor: theme.border }]}>
            <ThemedText semanticVariant="labelSecondary" style={[styles.inputLabel, { color: theme.textSecondary, textAlign: isRTL ? "right" : "left" }]}>
              {strings.currentPassword}
            </ThemedText>
            <View
              style={[
                styles.inputShell,
                {
                  backgroundColor: theme.backgroundRoot,
                  borderColor: theme.border,
                  flexDirection: inputDirection,
                },
              ]}
            >
              <TextInput
                allowFontScaling={false}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry={!showCurrentPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={canEditPassword && !saving}
                style={[
                  styles.inputInner,
                  {
                    color: theme.text,
                    fontSize: SETTINGS_SUBPAGE_SIZES.inputFontSize,
                    lineHeight: 22,
                    textAlign: isRTL ? "right" : "left",
                    ...(isRTL ? { writingDirection: "rtl" as const } : { writingDirection: "ltr" as const }),
                    ...typography.getVariantStyle("tableCellValue"),
                    ...typography.getTextInputStyle("regular"),
                  },
                ]}
              />
              <Pressable
                onPress={() => setShowCurrentPassword((prev) => !prev)}
                style={({ pressed }) => [styles.eyeButton, pressed && styles.eyeButtonPressed]}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={showCurrentPassword ? "Hide current password" : "Show current password"}
              >
                <Ionicons name={showCurrentPassword ? "eye-off" : "eye"} size={20} color={theme.textSecondary} />
              </Pressable>
            </View>
            {requiresCurrentPassword && !hasCurrentPassword ? (
              <ThemedText
                semanticVariant="helper"
                style={[styles.inlineHint, { color: theme.textSecondary, textAlign: isRTL ? "right" : "left" }]}
              >
                {strings.currentRequiredHint}
              </ThemedText>
            ) : null}
          </View>

          <View style={[styles.inputRow, { borderBottomColor: theme.border }]}>
            <ThemedText semanticVariant="labelSecondary" style={[styles.inputLabel, { color: theme.textSecondary, textAlign: isRTL ? "right" : "left" }]}>
              {strings.newPassword}
            </ThemedText>
            <View
              style={[
                styles.inputShell,
                {
                  backgroundColor: theme.backgroundRoot,
                  borderColor: theme.border,
                  flexDirection: inputDirection,
                },
              ]}
            >
              <TextInput
                allowFontScaling={false}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showNewPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={canEditPassword && !saving}
                style={[
                  styles.inputInner,
                  {
                    color: theme.text,
                    fontSize: SETTINGS_SUBPAGE_SIZES.inputFontSize,
                    lineHeight: 22,
                    textAlign: isRTL ? "right" : "left",
                    ...(isRTL ? { writingDirection: "rtl" as const } : { writingDirection: "ltr" as const }),
                    ...typography.getVariantStyle("tableCellValue"),
                    ...typography.getTextInputStyle("regular"),
                  },
                ]}
              />
              <Pressable
                onPress={() => setShowNewPassword((prev) => !prev)}
                style={({ pressed }) => [styles.eyeButton, pressed && styles.eyeButtonPressed]}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={showNewPassword ? "Hide new password" : "Show new password"}
              >
                <Ionicons name={showNewPassword ? "eye-off" : "eye"} size={20} color={theme.textSecondary} />
              </Pressable>
            </View>
          </View>

          <View style={styles.inputRow}>
            <ThemedText semanticVariant="labelSecondary" style={[styles.inputLabel, { color: theme.textSecondary, textAlign: isRTL ? "right" : "left" }]}>
              {strings.confirmPassword}
            </ThemedText>
            <View
              style={[
                styles.inputShell,
                {
                  backgroundColor: theme.backgroundRoot,
                  borderColor: theme.border,
                  flexDirection: inputDirection,
                },
              ]}
            >
              <TextInput
                allowFontScaling={false}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={canEditPassword && !saving}
                style={[
                  styles.inputInner,
                  {
                    color: theme.text,
                    fontSize: SETTINGS_SUBPAGE_SIZES.inputFontSize,
                    lineHeight: 22,
                    textAlign: isRTL ? "right" : "left",
                    ...(isRTL ? { writingDirection: "rtl" as const } : { writingDirection: "ltr" as const }),
                    ...typography.getVariantStyle("tableCellValue"),
                    ...typography.getTextInputStyle("regular"),
                  },
                ]}
              />
              <Pressable
                onPress={() => setShowConfirmPassword((prev) => !prev)}
                style={({ pressed }) => [styles.eyeButton, pressed && styles.eyeButtonPressed]}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
              >
                <Ionicons name={showConfirmPassword ? "eye-off" : "eye"} size={20} color={theme.textSecondary} />
              </Pressable>
            </View>
          </View>
        </View>

    </SettingsSubpageLayout>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: SETTINGS_SUBPAGE_SIZES.cardRadius,
    overflow: "hidden",
  },
  cardHeader: {
    minHeight: SETTINGS_SUBPAGE_SIZES.rowMinHeight,
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: SETTINGS_SUBPAGE_SIZES.rowVerticalPadding,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.md,
  },
  headerLeading: {
    flex: 1,
    alignItems: "center",
    gap: Spacing.md,
  },
  headerTextBlock: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: SETTINGS_SUBPAGE_SIZES.rowTitleSize,
    lineHeight: 22,
  },
  rowSubtitle: {
    fontSize: SETTINGS_SUBPAGE_SIZES.rowSubtitleSize,
    lineHeight: 18,
  },
  iconCircle: {
    width: SETTINGS_SUBPAGE_SIZES.iconContainerSize,
    height: SETTINGS_SUBPAGE_SIZES.iconContainerSize,
    borderRadius: SETTINGS_SUBPAGE_SIZES.iconContainerSize / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButton: {
    minHeight: SETTINGS_SUBPAGE_SIZES.saveButtonMinHeight,
    minWidth: 64,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: SETTINGS_SUBPAGE_SIZES.saveButtonHorizontalPadding,
    alignItems: "center",
    justifyContent: "center",
  },
  inputRow: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: SETTINGS_SUBPAGE_SIZES.rowVerticalPadding,
    gap: Spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  inputLabel: {
    marginBottom: Spacing.xs,
    fontSize: SETTINGS_SUBPAGE_SIZES.rowSubtitleSize,
    lineHeight: 18,
  },
  inputShell: {
    minHeight: SETTINGS_SUBPAGE_SIZES.inputHeight,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
  },
  inputInner: {
    flex: 1,
    minHeight: SETTINGS_SUBPAGE_SIZES.inputHeight,
    paddingHorizontal: Spacing.md,
    includeFontPadding: false,
  },
  eyeButton: {
    width: SETTINGS_SUBPAGE_SIZES.inputHeight,
    height: SETTINGS_SUBPAGE_SIZES.inputHeight,
    alignItems: "center",
    justifyContent: "center",
  },
  eyeButtonPressed: {
    opacity: 0.6,
  },
  helperTextTop: {
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  inlineHint: {
    marginTop: Spacing.xs,
  },
});
