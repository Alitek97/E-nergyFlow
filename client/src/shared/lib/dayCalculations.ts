import {
  DayData,
  TURBINES,
  feederExport,
  turbineProductionMwh,
  turbineRowComputed,
  gasForTurbine,
} from "@/lib/storage";

export interface DayStats {
  production: number;
  exportVal: number;
  consumption: number;
  isExport: boolean;
  gasConsumed: number;
}

export interface TurbineGasRow {
  t: string;
  prev: number | null;
  pres: number | null;
  hours: number;
  diff: number | null;
  mwPerHr: number | null;
  isStopped: boolean;
  hasError: boolean;
  gasM3: number | null;
}

export interface CalculationsSummary {
  production: number;
  exportVal: number;
  consumption: number;
  turbineData: TurbineGasRow[];
  totalGasM3: number;
}

export function computeDayStats(day: DayData): DayStats {
  const production = turbineProductionMwh(day);
  const exportVal = feederExport(day);
  const consumption = production - exportVal;
  const isExport = exportVal >= 0;

  const gasConsumed = TURBINES.reduce((acc, t) => {
    const row = turbineRowComputed(day, t);
    if (row.diff === null || row.mwPerHr === null) return acc;
    return acc + gasForTurbine(row.diff, row.mwPerHr);
  }, 0);

  return {
    production,
    exportVal,
    consumption,
    isExport,
    gasConsumed,
  };
}

export function computeCalculationsSummary(day: DayData): CalculationsSummary {
  const production = turbineProductionMwh(day);
  const exportVal = feederExport(day);
  const consumption = production - exportVal;

  const turbineData = TURBINES.map((t) => {
    const computed = turbineRowComputed(day, t);
    const gasM3 =
      computed.diff === null || computed.mwPerHr === null
        ? null
        : gasForTurbine(computed.diff, computed.mwPerHr);
    return {
      t,
      ...computed,
      gasM3,
    };
  });

  const totalGasM3 = turbineData.reduce(
    (a, r) => (r.gasM3 === null ? a : a + r.gasM3),
    0,
  );

  return {
    production,
    exportVal,
    consumption,
    turbineData,
    totalGasM3,
  };
}
