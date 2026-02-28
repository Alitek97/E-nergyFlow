import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  ActionSheetIOS,
  Alert,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { BorderRadius, Spacing } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { upsertProfile } from "@/lib/profile";
import { useToast } from "@/components/ui/Toast";
import type { SettingsStackParamList } from "@/navigation/SettingsStackNavigator";
import SettingsSubpageLayout from "@/components/settings/SettingsSubpageLayout";
import { SETTINGS_SUBPAGE_SIZES } from "@/components/settings/settingsSubpageStyles";

const MAX_DISPLAY_NAME = 32;

export default function AccountSettingsScreen() {
  const { theme, typography } = useTheme();
  const { t, isRTL } = useLanguage();
  const { show } = useToast();
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();
  const { user, profile, profileLoading, refreshProfile, patchProfile, isConfigured } = useAuth();

  const [displayName, setDisplayName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [removingAvatar, setRemovingAvatar] = useState(false);
  const isMountedRef = useRef(true);

  const canEditProfile = Boolean(isConfigured && user && !user.is_anonymous);
  const email = user?.email || "";
  const currentDisplayName = profile?.displayName?.trim() || "";
  const displayFallback = useMemo(() => currentDisplayName || email || "", [currentDisplayName, email]);
  const avatarUrl = profile?.avatarUrl || null;

  useEffect(() => {
    setDisplayName(currentDisplayName);
  }, [currentDisplayName]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (canEditProfile) {
      refreshProfile();
    }
  }, []);

  const strings = {
    profilePhoto: isRTL ? "صورة الملف الشخصي" : "Profile Photo",
    changePhoto: isRTL ? "تغيير الصورة" : "Change Photo",
    displayName: t("display_name"),
    save: isRTL ? "حفظ" : "Save",
    email: t("email"),
    unavailableHint: isRTL
      ? "المزامنة السحابية غير مفعلة. إعدادات الحساب للعرض فقط في الوضع المحلي."
      : "Cloud sync is not configured. Account settings are read-only in local mode.",
    guestHint: isRTL
      ? "يمكنك تعديل الملف الشخصي بعد إنشاء حساب أو تسجيل الدخول."
      : "Create an account or sign in to edit your profile.",
    saveSuccess: isRTL ? "تم حفظ الاسم" : "Display name saved",
    saveError: isRTL ? "تعذر حفظ الاسم" : "Could not save display name",
    invalidName: isRTL ? "يرجى إدخال اسم صالح" : "Please enter a valid display name",
    avatarsuccess: isRTL ? "تم تحديث الصورة" : "Profile photo updated",
    avatarError: isRTL ? "تعذر تحديث الصورة" : "Could not update profile photo",
    removePhoto: isRTL ? "إزالة الصورة" : "Remove Photo",
    removePhotoSuccess: isRTL ? "تمت إزالة الصورة" : "Profile photo removed",
    removePhotoError: isRTL ? "تعذر إزالة الصورة" : "Could not remove profile photo",
    pickerUnavailable: isRTL ? "ميزة اختيار الصور غير متاحة" : "Image picker is unavailable",
    pickerCancelled: isRTL ? "تم إلغاء الاختيار" : "Selection cancelled",
    password: t("password"),
    changePassword: isRTL ? "تغيير كلمة المرور" : "Change password",
  };

  const extractAvatarStoragePath = (publicUrl: string): string | null => {
    try {
      const parsed = new URL(publicUrl);
      const marker = "/storage/v1/object/public/avatars/";
      const markerIndex = parsed.pathname.indexOf(marker);
      if (markerIndex === -1) return null;
      const encodedPath = parsed.pathname.slice(markerIndex + marker.length);
      return decodeURIComponent(encodedPath);
    } catch {
      return null;
    }
  };

  const handleSaveDisplayName = async () => {
    if (!user || !canEditProfile) return;

    const trimmed = displayName.trim();
    if (!trimmed) {
      show(strings.invalidName, "error");
      return;
    }

    if (isMountedRef.current) setSavingName(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const updated = await upsertProfile({ userId: user.id, displayName: trimmed });
      patchProfile({
        displayName: updated.displayName,
        updatedAt: updated.updatedAt ?? null,
      });
      show(strings.saveSuccess, "success");
    } catch (error) {
      console.warn("[AccountSettings] Save display name failed", error);
      show(strings.saveError, "error");
    } finally {
      if (isMountedRef.current) setSavingName(false);
    }
  };

  const handleChooseNewPhoto = async () => {
    if (!user || !canEditProfile) return;

    let ImagePicker: any;
    try {
      ImagePicker = require("expo-image-picker");
    } catch {
      show(strings.pickerUnavailable, "error");
      return;
    }

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        show(strings.pickerUnavailable, "error");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (result.canceled || !result.assets?.[0]?.uri) {
        return;
      }

      const asset = result.assets[0];
      if (isMountedRef.current) setUploadingAvatar(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const response = await fetch(asset.uri);
      const arrayBuffer = await response.arrayBuffer();
      const ext = (asset.mimeType?.split("/")[1] || "jpg").replace("jpeg", "jpg");
      const filePath = `${user.id}/avatar_${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, arrayBuffer, {
          upsert: true,
          contentType: asset.mimeType || `image/${ext}`,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const updated = await upsertProfile({ userId: user.id, avatarUrl: data.publicUrl });
      patchProfile({
        avatarUrl: updated.avatarUrl,
        updatedAt: updated.updatedAt ?? null,
      });
      show(strings.avatarsuccess, "success");
    } catch (error) {
      console.warn("[AccountSettings] Avatar update failed", error);
      show(strings.avatarError, "error");
    } finally {
      if (isMountedRef.current) setUploadingAvatar(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!user || !canEditProfile || removingAvatar) return;

    if (isMountedRef.current) setRemovingAvatar(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      if (avatarUrl) {
        const storagePath = extractAvatarStoragePath(avatarUrl);
        if (storagePath) {
          const { error: removeError } = await supabase.storage.from("avatars").remove([storagePath]);
          if (removeError && !/not\s*found/i.test(removeError.message || "")) {
            throw removeError;
          }
        }
      }

      const updated = await upsertProfile({ userId: user.id, avatarUrl: null });
      patchProfile({
        avatarUrl: updated.avatarUrl,
        updatedAt: updated.updatedAt ?? null,
      });
      show(strings.removePhotoSuccess, "success");
    } catch (error) {
      console.warn("[AccountSettings] Avatar remove failed", error);
      show(strings.removePhotoError, "error");
    } finally {
      if (isMountedRef.current) setRemovingAvatar(false);
    }
  };

  const openPhotoActionSheet = () => {
    if (!canEditProfile || uploadingAvatar || removingAvatar) return;

    const chooseLabel = isRTL ? "اختيار صورة جديدة" : "Choose New Photo";
    const removeLabel = strings.removePhoto;
    const cancelLabel = isRTL ? "إلغاء" : "Cancel";

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [chooseLabel, removeLabel, cancelLabel],
          cancelButtonIndex: 2,
          destructiveButtonIndex: 1,
        },
        (buttonIndex) => {
          if (buttonIndex === 0) {
            void handleChooseNewPhoto();
          } else if (buttonIndex === 1) {
            void handleRemovePhoto();
          }
        },
      );
      return;
    }

    Alert.alert(
      strings.profilePhoto,
      undefined,
      [
        { text: chooseLabel, onPress: () => void handleChooseNewPhoto() },
        { text: removeLabel, style: "destructive", onPress: () => void handleRemovePhoto() },
        { text: cancelLabel, style: "cancel" },
      ],
      { cancelable: true },
    );
  };

  const disabledHint = !isSupabaseConfigured ? strings.unavailableHint : !canEditProfile ? strings.guestHint : null;

  return (
    <SettingsSubpageLayout keyboardShouldPersistTaps="handled">
        <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
          <Pressable
            style={[
              styles.row,
              { flexDirection: isRTL ? "row-reverse" : "row", borderBottomColor: theme.border },
              styles.rowDivider,
              !canEditProfile && styles.disabledRow,
            ]}
            onPress={openPhotoActionSheet}
            disabled={!canEditProfile || uploadingAvatar || removingAvatar}
          >
            <View style={[styles.rowLeading, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: theme.backgroundSecondary }]}>
                  <Feather name="user" size={18} color={theme.textSecondary} />
                </View>
              )}
              <View style={styles.textBlock}>
                <ThemedText semanticVariant="labelPrimary" style={[styles.rowTitle, { textAlign: isRTL ? "right" : "left" }]}>
                  {strings.profilePhoto}
                </ThemedText>
                <ThemedText
                  semanticVariant="labelSecondary"
                  style={[styles.rowSubtitle, { color: theme.textSecondary, textAlign: isRTL ? "right" : "left" }]}
                >
                  {strings.changePhoto}
                </ThemedText>
              </View>
            </View>
            <View style={styles.rowTrailing}>
              {uploadingAvatar ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <Feather name={isRTL ? "chevron-left" : "chevron-right"} size={18} color={theme.textSecondary} />
              )}
            </View>
          </Pressable>

          <View
            style={[
              styles.displayNameRow,
              { borderBottomColor: theme.border },
              styles.rowDivider,
              !canEditProfile && styles.disabledRow,
            ]}
          >
            <View style={[styles.displayNameHeader, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <View style={[styles.rowLeading, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                <View style={[styles.avatarPlaceholder, { backgroundColor: theme.backgroundSecondary }]}>
                  <Feather name="type" size={18} color={theme.textSecondary} />
                </View>
                <ThemedText semanticVariant="labelPrimary" style={[styles.rowTitle, { textAlign: isRTL ? "right" : "left" }]}>
                  {strings.displayName}
                </ThemedText>
              </View>
              <Pressable
                onPress={handleSaveDisplayName}
                disabled={!canEditProfile || savingName}
                style={[
                  styles.saveButton,
                  { backgroundColor: canEditProfile ? theme.primary : theme.border },
                  (!canEditProfile || savingName) && { opacity: 0.7 },
                ]}
              >
                {savingName ? (
                  <ActivityIndicator size="small" color={theme.buttonText} />
                ) : (
                  <ThemedText semanticVariant="button" style={{ color: theme.buttonText }}>
                    {strings.save}
                  </ThemedText>
                )}
              </Pressable>
            </View>

            <TextInput
              allowFontScaling={false}
              editable={canEditProfile && !savingName}
              value={displayName}
              onChangeText={(text) => setDisplayName(text.slice(0, MAX_DISPLAY_NAME))}
              placeholder={displayFallback || strings.displayName}
              placeholderTextColor={theme.textSecondary}
              style={[
                styles.input,
                {
                  backgroundColor: theme.backgroundRoot,
                  color: theme.text,
                  borderColor: theme.border,
                  fontSize: SETTINGS_SUBPAGE_SIZES.inputFontSize,
                  lineHeight: 22,
                  textAlign: isRTL ? "right" : "left",
                  ...(isRTL ? { writingDirection: "rtl" as const } : { writingDirection: "ltr" as const }),
                  ...typography.getVariantStyle("tableCellValue"),
                  ...typography.getTextInputStyle("regular"),
                },
              ]}
              maxLength={MAX_DISPLAY_NAME}
            />
          </View>

          <View
            style={[
              styles.row,
              { flexDirection: isRTL ? "row-reverse" : "row", borderBottomColor: theme.border },
              styles.rowDivider,
            ]}
          >
            <View style={[styles.rowLeading, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <View style={[styles.avatarPlaceholder, { backgroundColor: theme.backgroundSecondary }]}>
                <Feather name="mail" size={16} color={theme.textSecondary} />
              </View>
              <View style={styles.textBlock}>
                <ThemedText semanticVariant="labelPrimary" style={[styles.rowTitle, { textAlign: isRTL ? "right" : "left" }]}>
                  {strings.email}
                </ThemedText>
              </View>
            </View>
            <View style={styles.rowTrailingWide}>
              {profileLoading ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <ThemedText
                  semanticVariant="labelSecondary"
                  numberOfLines={1}
                  style={{
                    color: theme.textSecondary,
                    textAlign: isRTL ? "left" : "right",
                    writingDirection: "ltr",
                  }}
                >
                  {email || "-"}
                </ThemedText>
              )}
            </View>
          </View>

          <Pressable
            style={[
              styles.row,
              { flexDirection: isRTL ? "row-reverse" : "row" },
              !canEditProfile && styles.disabledRow,
            ]}
            onPress={() => navigation.navigate("ChangePassword")}
            disabled={!canEditProfile}
          >
            <View style={[styles.rowLeading, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <View style={[styles.avatarPlaceholder, { backgroundColor: theme.backgroundSecondary }]}>
                <Feather name="lock" size={16} color={theme.textSecondary} />
              </View>
              <View style={styles.textBlock}>
                <ThemedText semanticVariant="labelPrimary" style={[styles.rowTitle, { textAlign: isRTL ? "right" : "left" }]}>
                  {strings.password}
                </ThemedText>
                <ThemedText
                  semanticVariant="labelSecondary"
                  style={[styles.rowSubtitle, { color: theme.textSecondary, textAlign: isRTL ? "right" : "left" }]}
                >
                  {strings.changePassword}
                </ThemedText>
              </View>
            </View>
            <View style={styles.rowTrailing}>
              <Feather name={isRTL ? "chevron-left" : "chevron-right"} size={18} color={theme.textSecondary} />
            </View>
          </Pressable>
        </View>

        {disabledHint ? (
          <ThemedText
            semanticVariant="helper"
            style={[styles.helperText, { color: theme.textSecondary, textAlign: isRTL ? "right" : "left" }]}
          >
            {disabledHint}
          </ThemedText>
        ) : null}
    </SettingsSubpageLayout>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: SETTINGS_SUBPAGE_SIZES.cardRadius,
    overflow: "hidden",
  },
  row: {
    minHeight: SETTINGS_SUBPAGE_SIZES.rowMinHeight,
    paddingHorizontal: Spacing.lg,
    paddingVertical: SETTINGS_SUBPAGE_SIZES.rowVerticalPadding,
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLeading: {
    flex: 1,
    alignItems: "center",
    gap: Spacing.md,
  },
  rowTrailing: {
    width: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTrailingWide: {
    flexShrink: 1,
    maxWidth: "55%",
    alignItems: "flex-end",
    justifyContent: "center",
  },
  textBlock: {
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
  avatar: {
    width: SETTINGS_SUBPAGE_SIZES.avatarSize,
    height: SETTINGS_SUBPAGE_SIZES.avatarSize,
    borderRadius: SETTINGS_SUBPAGE_SIZES.avatarSize / 2,
  },
  avatarPlaceholder: {
    width: SETTINGS_SUBPAGE_SIZES.iconContainerSize,
    height: SETTINGS_SUBPAGE_SIZES.iconContainerSize,
    borderRadius: SETTINGS_SUBPAGE_SIZES.iconContainerSize / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  displayNameRow: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: SETTINGS_SUBPAGE_SIZES.rowVerticalPadding,
    gap: Spacing.sm,
  },
  displayNameHeader: {
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  input: {
    minHeight: SETTINGS_SUBPAGE_SIZES.inputHeight,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    fontSize: SETTINGS_SUBPAGE_SIZES.inputFontSize,
    includeFontPadding: false,
  },
  saveButton: {
    minHeight: SETTINGS_SUBPAGE_SIZES.saveButtonMinHeight,
    minWidth: 64,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: SETTINGS_SUBPAGE_SIZES.saveButtonHorizontalPadding,
    alignItems: "center",
    justifyContent: "center",
  },
  helperText: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  disabledRow: {
    opacity: 0.8,
  },
});
