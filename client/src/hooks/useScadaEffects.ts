import { useScadaEffectsContext } from "@/contexts/ScadaEffectsContext";

export function useScadaEffects() {
  const { scadaEnabled, setScadaEnabled, isLoaded } = useScadaEffectsContext();

  return {
    scadaEffectsEnabled: scadaEnabled,
    setScadaEffectsEnabled: setScadaEnabled,
    isScadaEffectsLoaded: isLoaded,
  };
}
