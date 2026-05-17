import NetInfo from "@react-native-community/netinfo";
import type { NetInfoState } from "@react-native-community/netinfo";

export interface ConnectivityState {
  isOnline: boolean;
  isConnected: boolean;
  isInternetReachable: boolean | null;
}

const EXPECTED_OFFLINE_ERROR_PATTERNS = [
  /network request failed/i,
  /failed to fetch/i,
  /fetch failed/i,
  /networkerror/i,
  /internet connection appears to be offline/i,
  /the network connection was lost/i,
  /load failed/i,
];

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === "string") return maybeMessage;

    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }

  return String(error);
}

export function isExpectedOfflineError(error: unknown): boolean {
  const message = getErrorMessage(error);
  return EXPECTED_OFFLINE_ERROR_PATTERNS.some((pattern) =>
    pattern.test(message),
  );
}

export function mapConnectivityState(state: NetInfoState): ConnectivityState {
  const isConnected = state.isConnected === true;
  const isInternetReachable = state.isInternetReachable;

  return {
    isConnected,
    isInternetReachable,
    isOnline: isConnected && isInternetReachable !== false,
  };
}

export async function getCurrentConnectivity(): Promise<ConnectivityState> {
  const state = await NetInfo.fetch();
  return mapConnectivityState(state);
}

export async function canUseRemoteNetwork(): Promise<boolean> {
  try {
    const connectivity = await getCurrentConnectivity();
    return connectivity.isOnline;
  } catch {
    return false;
  }
}

export async function shouldSilenceExpectedOfflineError(
  error: unknown,
): Promise<boolean> {
  if (!isExpectedOfflineError(error)) return false;
  return !(await canUseRemoteNetwork());
}

export function subscribeConnectivity(
  listener: (state: ConnectivityState) => void,
): () => void {
  return NetInfo.addEventListener((state) => {
    listener(mapConnectivityState(state));
  });
}
