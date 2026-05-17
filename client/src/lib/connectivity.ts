import NetInfo from "@react-native-community/netinfo";
import type { NetInfoState } from "@react-native-community/netinfo";

export interface ConnectivityState {
  isOnline: boolean;
  isConnected: boolean;
  isInternetReachable: boolean | null;
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

export function subscribeConnectivity(
  listener: (state: ConnectivityState) => void,
): () => void {
  return NetInfo.addEventListener((state) => {
    listener(mapConnectivityState(state));
  });
}
