import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  CUSTOM_DEFAULTS,
  ENGLISH_DEFAULTS,
  METRIC_DEFAULTS,
  type EnergyUnit,
  type GasUnit,
  type PowerUnit,
  type UnitsConfig,
  type UnitsPreset,
  sanitizeUnitsConfig,
} from "@/utils/units";

const UNITS_STORAGE_KEY = "pp-app:units-config";
const UNITS_CUSTOM_STORAGE_KEY = "pp-app:units-custom";

interface UnitsContextType {
  unitsConfig: UnitsConfig;
  setPreset: (preset: UnitsPreset) => void;
  setEnergyUnit: (unit: EnergyUnit) => void;
  setGasUnit: (unit: GasUnit) => void;
  setPowerUnit: (unit: PowerUnit) => void;
  setDecimals: (decimals: 0 | 1 | 2 | 3) => void;
  setUseThousands: (enabled: boolean) => void;
}

const UnitsContext = createContext<UnitsContextType | undefined>(undefined);

async function persistConfig(config: UnitsConfig) {
  await AsyncStorage.setItem(UNITS_STORAGE_KEY, JSON.stringify(config));
}

async function persistCustomConfig(config: UnitsConfig) {
  await AsyncStorage.setItem(UNITS_CUSTOM_STORAGE_KEY, JSON.stringify(config));
}

export function UnitsProvider({ children }: { children: React.ReactNode }) {
  const [unitsConfig, setUnitsConfig] = useState<UnitsConfig>(METRIC_DEFAULTS);
  const [isLoaded, setIsLoaded] = useState(false);
  const lastCustomRef = useRef<UnitsConfig>(CUSTOM_DEFAULTS);

  useEffect(() => {
    const load = async () => {
      try {
        const [savedConfigRaw, savedCustomRaw] = await Promise.all([
          AsyncStorage.getItem(UNITS_STORAGE_KEY),
          AsyncStorage.getItem(UNITS_CUSTOM_STORAGE_KEY),
        ]);

        if (savedCustomRaw) {
          const custom = sanitizeUnitsConfig(JSON.parse(savedCustomRaw));
          lastCustomRef.current = { ...custom, preset: "custom" };
        }

        if (savedConfigRaw) {
          const config = sanitizeUnitsConfig(JSON.parse(savedConfigRaw));
          setUnitsConfig(config);
          if (config.preset === "custom") {
            lastCustomRef.current = { ...config, preset: "custom" };
          }
        } else {
          setUnitsConfig(METRIC_DEFAULTS);
        }
      } catch (error) {
        console.error("Error loading units config:", error);
        setUnitsConfig(METRIC_DEFAULTS);
      } finally {
        setIsLoaded(true);
      }
    };

    load();
  }, []);

  const updateConfig = useCallback((updater: (prev: UnitsConfig) => UnitsConfig) => {
    setUnitsConfig((prev) => {
      const next = sanitizeUnitsConfig(updater(prev));
      void persistConfig(next);
      if (next.preset === "custom") {
        lastCustomRef.current = { ...next, preset: "custom" };
        void persistCustomConfig(next);
      }
      return next;
    });
  }, []);

  const setPreset = useCallback(
    (preset: UnitsPreset) => {
      updateConfig(() => {
        if (preset === "metric") return METRIC_DEFAULTS;
        if (preset === "english") return ENGLISH_DEFAULTS;
        return { ...lastCustomRef.current, preset: "custom" };
      });
    },
    [updateConfig]
  );

  const setEnergyUnit = useCallback(
    (energyUnit: EnergyUnit) => {
      updateConfig((prev) => ({ ...prev, energyUnit }));
    },
    [updateConfig]
  );

  const setGasUnit = useCallback(
    (gasUnit: GasUnit) => {
      updateConfig((prev) => ({ ...prev, gasUnit }));
    },
    [updateConfig]
  );

  const setPowerUnit = useCallback(
    (powerUnit: PowerUnit) => {
      updateConfig((prev) => ({ ...prev, powerUnit }));
    },
    [updateConfig]
  );

  const setDecimals = useCallback(
    (decimals: 0 | 1 | 2 | 3) => {
      updateConfig((prev) => ({ ...prev, decimals }));
    },
    [updateConfig]
  );

  const setUseThousands = useCallback(
    (useThousands: boolean) => {
      updateConfig((prev) => ({ ...prev, useThousands }));
    },
    [updateConfig]
  );

  const value = useMemo(
    () => ({
      unitsConfig,
      setPreset,
      setEnergyUnit,
      setGasUnit,
      setPowerUnit,
      setDecimals,
      setUseThousands,
    }),
    [unitsConfig, setPreset, setEnergyUnit, setGasUnit, setPowerUnit, setDecimals, setUseThousands]
  );

  if (!isLoaded) {
    return null;
  }

  return <UnitsContext.Provider value={value}>{children}</UnitsContext.Provider>;
}

export function useUnits() {
  const context = useContext(UnitsContext);
  if (!context) {
    throw new Error("useUnits must be used within a UnitsProvider");
  }
  return context;
}
