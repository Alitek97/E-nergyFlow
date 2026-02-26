import React, { useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRTL } from "@/hooks/useRTL";

type AuthMode = "login" | "signup" | "forgot";

export function AuthScreen() {
  const { theme, typography } = useTheme();
  const { signIn, signUp, resetPassword } = useAuth();
  const { t, isRTL } = useLanguage();
  const { rtlText } = useRTL();

  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");
    setLoading(true);

    try {
      if (mode === "login") {
        const { error } = await signIn(email, password);
        if (error) {
          setError(error.message);
        }
      } else if (mode === "signup") {
        const { error } = await signUp(email, password, displayName);
        if (error) {
          setError(error.message);
        } else {
          Alert.alert(t("auth_check_email"), t("auth_confirmation_sent"));
          setMode("login");
        }
      } else if (mode === "forgot") {
        const { error } = await resetPassword(email);
        if (error) {
          setError(error.message);
        } else {
          Alert.alert(t("auth_check_email"), t("auth_reset_link_sent"));
          setMode("login");
        }
      }
    } catch (e) {
      setError(t("auth_unexpected_error"));
    } finally {
      setLoading(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: "center",
      padding: 24,
    },
    header: {
      alignItems: "center",
      marginBottom: 40,
    },
    title: {
      color: theme.primary,
      marginBottom: 8,
    },
    subtitle: {
      color: theme.textSecondary,
    },
    form: {
      gap: 16,
    },
    inputContainer: {
      gap: 8,
    },
    label: {
      color: theme.textSecondary,
    },
    input: {
      backgroundColor: theme.backgroundSecondary,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      ...typography.getVariantStyle("tableCellValue"),
      includeFontPadding: false,
      ...typography.getTextInputStyle("regular"),
      color: theme.text,
      ...(Platform.OS === "web" ? { textAlign: isRTL ? ("right" as const) : ("left" as const) } : {}),
    },
    button: {
      backgroundColor: theme.primary,
      borderRadius: 12,
      padding: 16,
      alignItems: "center",
      marginTop: 8,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonText: {
      color: theme.buttonText,
    },
    switchContainer: {
      flexDirection: "row",
      justifyContent: "center",
      marginTop: 24,
      gap: 8,
    },
    switchText: {
      color: theme.textSecondary,
    },
    switchLink: {
      color: theme.primary,
      fontWeight: "600",
    },
    forgotButton: {
      alignItems: "flex-end",
      marginTop: -8,
    },
    forgotText: {
      color: theme.primary,
    },
    errorText: {
      color: theme.error,
      textAlign: "center",
      marginBottom: 16,
    },
  });

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <ThemedText semanticVariant="screenTitle" style={styles.title}>{t("app_name")}</ThemedText>
            <ThemedText semanticVariant="tableCellLabel" style={styles.subtitle}>
              {mode === "login"
                ? t("auth_login_subtitle")
                : mode === "signup"
                ? t("auth_signup_subtitle")
                : t("auth_forgot_subtitle")}
            </ThemedText>
          </View>

          {error ? (
            <ThemedText semanticVariant="helper" style={styles.errorText}>{error}</ThemedText>
          ) : null}

          <View style={styles.form}>
            {mode === "signup" && (
              <View style={styles.inputContainer}>
                <ThemedText semanticVariant="tableCellLabel" style={[styles.label, rtlText]}>{t("display_name")}</ThemedText>
                <TextInput
                  style={styles.input}
                  allowFontScaling={false}
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder={t("auth_display_name_placeholder")}
                  placeholderTextColor={theme.textSecondary}
                  autoCapitalize="words"
                />
              </View>
            )}

            <View style={styles.inputContainer}>
              <ThemedText semanticVariant="tableCellLabel" style={[styles.label, rtlText]}>{t("email")}</ThemedText>
              <TextInput
                style={styles.input}
                allowFontScaling={false}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={theme.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {mode !== "forgot" && (
              <View style={styles.inputContainer}>
                <ThemedText semanticVariant="tableCellLabel" style={[styles.label, rtlText]}>{t("password")}</ThemedText>
                <TextInput
                  style={styles.input}
                  allowFontScaling={false}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor={theme.textSecondary}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>
            )}

            {mode === "login" && (
              <TouchableOpacity
                style={styles.forgotButton}
                onPress={() => setMode("forgot")}
              >
                <ThemedText semanticVariant="helper" style={[styles.forgotText, rtlText]}>
                  {t("forgot_password")}
                </ThemedText>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={theme.buttonText} />
              ) : (
                <ThemedText semanticVariant="buttonText" style={styles.buttonText}>
                  {mode === "login"
                    ? t("sign_in")
                    : mode === "signup"
                    ? t("create_account")
                    : t("auth_send_reset_link")}
                </ThemedText>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.switchContainer}>
            {mode === "login" ? (
              <>
                <ThemedText semanticVariant="helper" style={[styles.switchText, rtlText]}>{t("auth_no_account")}</ThemedText>
                <TouchableOpacity onPress={() => setMode("signup")}>
                  <ThemedText semanticVariant="buttonText" style={[styles.switchLink, rtlText]}>{t("create_account")}</ThemedText>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <ThemedText semanticVariant="helper" style={[styles.switchText, rtlText]}>{t("auth_have_account")}</ThemedText>
                <TouchableOpacity onPress={() => setMode("login")}>
                  <ThemedText semanticVariant="buttonText" style={[styles.switchLink, rtlText]}>{t("sign_in")}</ThemedText>
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}
