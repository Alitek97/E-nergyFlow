import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SCADA_EFFECTS_STORAGE_KEY = "pp-app:scada-effects-enabled";

type ScadaEffectsContextValue = {
  scadaEnabled: boolean;
  setScadaEnabled: (enabled: boolean) => void;
  isLoaded: boolean;
};

const ScadaEffectsContext = createContext<ScadaEffectsContextValue | undefined>(
  undefined,
);

export function ScadaEffectsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [scadaEnabled, setScadaEnabledState] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const stored = await AsyncStorage.getItem(SCADA_EFFECTS_STORAGE_KEY);
        if (!mounted) return;
        setScadaEnabledState(stored === "true");
      } catch {
        if (!mounted) return;
        setScadaEnabledState(false);
      } finally {
        if (mounted) setIsLoaded(true);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const setScadaEnabled = useCallback((enabled: boolean) => {
    setScadaEnabledState(enabled);
    void AsyncStorage.setItem(
      SCADA_EFFECTS_STORAGE_KEY,
      enabled ? "true" : "false",
    ).catch(() => {});
  }, []);

  const value = useMemo(
    () => ({
      scadaEnabled,
      setScadaEnabled,
      isLoaded,
    }),
    [isLoaded, scadaEnabled, setScadaEnabled],
  );

  return (
    <ScadaEffectsContext.Provider value={value}>
      {children}
    </ScadaEffectsContext.Provider>
  );
}

export function useScadaEffectsContext() {
  const context = useContext(ScadaEffectsContext);
  if (!context) {
    throw new Error(
      "useScadaEffectsContext must be used within ScadaEffectsProvider",
    );
  }
  return context;
}
