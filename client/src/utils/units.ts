const LRM = "\u200E";

export type UnitsPreset = "metric" | "english" | "custom";
export type EnergyUnit = "kWh" | "MWh" | "GWh";
export type GasUnit = "m³" | "ft³" | "MMscf";
export type PowerUnit = "kW" | "MW";

export interface UnitsConfig {
  preset: UnitsPreset;
  energyUnit: EnergyUnit;
  gasUnit: GasUnit;
  powerUnit: PowerUnit;
  decimals: 0 | 1 | 2 | 3;
  useThousands: boolean;
}

export const METRIC_DEFAULTS: UnitsConfig = {
  preset: "metric",
  energyUnit: "MWh",
  gasUnit: "m³",
  powerUnit: "MW",
  decimals: 2,
  useThousands: true,
};

export const ENGLISH_DEFAULTS: UnitsConfig = {
  preset: "english",
  energyUnit: "MWh",
  gasUnit: "MMscf",
  powerUnit: "MW",
  decimals: 3,
  useThousands: true,
};

export const CUSTOM_DEFAULTS: UnitsConfig = {
  preset: "custom",
  energyUnit: "MWh",
  gasUnit: "m³",
  powerUnit: "MW",
  decimals: 2,
  useThousands: true,
};

export function sanitizeUnitsConfig(input: unknown): UnitsConfig {
  const base = METRIC_DEFAULTS;
  if (!input || typeof input !== "object") {
    return base;
  }

  const raw = input as Partial<UnitsConfig>;
  const preset: UnitsPreset =
    raw.preset === "metric" || raw.preset === "english" || raw.preset === "custom"
      ? raw.preset
      : base.preset;
  const energyUnit: EnergyUnit =
    raw.energyUnit === "kWh" || raw.energyUnit === "MWh" || raw.energyUnit === "GWh"
      ? raw.energyUnit
      : base.energyUnit;
  const gasUnit: GasUnit =
    raw.gasUnit === "m³" || raw.gasUnit === "ft³" || raw.gasUnit === "MMscf" ? raw.gasUnit : base.gasUnit;
  const powerUnit: PowerUnit = raw.powerUnit === "kW" || raw.powerUnit === "MW" ? raw.powerUnit : base.powerUnit;
  const decimals: 0 | 1 | 2 | 3 =
    raw.decimals === 0 || raw.decimals === 1 || raw.decimals === 2 || raw.decimals === 3
      ? raw.decimals
      : base.decimals;
  const useThousands = typeof raw.useThousands === "boolean" ? raw.useThousands : base.useThousands;

  return {
    preset,
    energyUnit,
    gasUnit,
    powerUnit,
    decimals,
    useThousands,
  };
}

export function convertEnergyFromMWh(valueMWh: number, targetUnit: EnergyUnit): number {
  if (!Number.isFinite(valueMWh)) return 0;
  if (targetUnit === "kWh") return valueMWh * 1000;
  if (targetUnit === "GWh") return valueMWh / 1000;
  return valueMWh;
}

export function convertGasFromM3(valueM3: number, targetUnit: GasUnit): number {
  if (!Number.isFinite(valueM3)) return 0;
  if (targetUnit === "MMscf") return (valueM3 * 35.3146667) / 1_000_000;
  if (targetUnit === "ft³") return valueM3 * 35.3146667;
  return valueM3;
}

export function convertPowerFromMW(valueMW: number, targetUnit: PowerUnit): number {
  if (!Number.isFinite(valueMW)) return 0;
  if (targetUnit === "kW") return valueMW * 1000;
  return valueMW;
}

export function formatNumber(value: number, cfg: Pick<UnitsConfig, "decimals" | "useThousands">): string {
  const safeValue = Number.isFinite(value) ? value : 0;
  const absValue = Math.abs(safeValue);
  const sign = safeValue < 0 ? `${LRM}-` : "";

  try {
    const formatter = new Intl.NumberFormat("en-US", {
      useGrouping: cfg.useThousands,
      minimumFractionDigits: cfg.decimals,
      maximumFractionDigits: cfg.decimals,
    });
    return `${sign}${formatter.format(absValue)}`;
  } catch {
    const rounded = absValue.toFixed(cfg.decimals);
    const [whole, fraction] = rounded.split(".");
    const groupedWhole = cfg.useThousands ? whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : whole;
    const grouped = fraction !== undefined ? `${groupedWhole}.${fraction}` : groupedWhole;
    return `${sign}${grouped}`;
  }
}

function resolveAutoEnergyUnit(valueMWh: number, preset: UnitsPreset): EnergyUnit {
  if (preset === "custom") return "MWh";
  const abs = Math.abs(valueMWh);
  if (abs >= 1000) return "GWh";
  if (abs < 1) return "kWh";
  return "MWh";
}

export function formatEnergy(
  valueMWh: number,
  cfg: UnitsConfig,
  options: { prefer: "auto" | "fixed" }
): { valueText: string; unitText: EnergyUnit } {
  const targetUnit =
    options.prefer === "fixed"
      ? cfg.energyUnit
      : cfg.preset === "custom"
        ? cfg.energyUnit
        : resolveAutoEnergyUnit(valueMWh, cfg.preset);
  const converted = convertEnergyFromMWh(valueMWh, targetUnit);
  return {
    valueText: formatNumber(converted, cfg),
    unitText: targetUnit,
  };
}

export function formatGas(valueM3: number, cfg: UnitsConfig): { valueText: string; unitText: GasUnit } {
  const converted = convertGasFromM3(valueM3, cfg.gasUnit);
  return {
    valueText: formatNumber(converted, cfg),
    unitText: cfg.gasUnit,
  };
}

export function formatPower(valueMW: number, cfg: UnitsConfig): { valueText: string; unitText: PowerUnit } {
  const converted = convertPowerFromMW(valueMW, cfg.powerUnit);
  return {
    valueText: formatNumber(converted, cfg),
    unitText: cfg.powerUnit,
  };
}
