import React, { createContext, useContext, useCallback, useRef, useState } from "react";
import {
  Animated,
  StyleSheet,
  View,
  Platform,
} from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";

type ToastType = "success" | "error" | "info";

interface ToastContextValue {
  show: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ show: () => {} });

let globalShow: ((message: string, type?: ToastType) => void) | null = null;

export function getGlobalToast() {
  return globalShow;
}

export function useToast() {
  return useContext(ToastContext);
}

const TOAST_TOP = Platform.OS === "web" ? 24 : 56;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();

  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [type, setType] = useState<ToastType>("success");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(
    (msg: string, t: ToastType = "success") => {
      if (timerRef.current) clearTimeout(timerRef.current);

      setMessage(msg);
      setType(t);
      setVisible(true);

      opacity.setValue(0);
      translateY.setValue(-20);

      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      timerRef.current = setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0,
            duration: 250,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: -20,
            duration: 250,
            useNativeDriver: true,
          }),
        ]).start(() => setVisible(false));
      }, 1300);
    },
    [opacity, translateY],
  );

  globalShow = show;

  const bgColor =
    type === "success"
      ? theme.success
      : type === "error"
        ? theme.error
        : theme.primary;

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {visible && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.container,
            {
              top: TOAST_TOP,
              opacity,
              transform: [{ translateY }],
            },
          ]}
        >
          <View style={[styles.toast, { backgroundColor: bgColor }]}>
            <ThemedText semanticVariant="buttonText" style={styles.text}>
              {message}
            </ThemedText>
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 9999,
  },
  toast: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    maxWidth: 320,
    minWidth: 140,
    alignItems: "center",
    ...Platform.select({
      web: { boxShadow: "0 4px 12px rgba(0,0,0,0.25)" },
      default: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 8,
      },
    }),
  },
  text: {
    color: "#FFFFFF",
    textAlign: "center",
  },
});
