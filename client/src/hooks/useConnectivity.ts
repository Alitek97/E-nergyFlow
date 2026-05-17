import { useEffect, useState } from "react";
import {
  ConnectivityState,
  getCurrentConnectivity,
  subscribeConnectivity,
} from "@/lib/connectivity";

const INITIAL_STATE: ConnectivityState = {
  isConnected: true,
  isInternetReachable: null,
  isOnline: true,
};

export function useConnectivity(): ConnectivityState {
  const [state, setState] = useState<ConnectivityState>(INITIAL_STATE);

  useEffect(() => {
    let mounted = true;

    getCurrentConnectivity()
      .then((current) => {
        if (mounted) setState(current);
      })
      .catch(() => {
        if (mounted) {
          setState({
            isConnected: false,
            isInternetReachable: false,
            isOnline: false,
          });
        }
      });

    const unsubscribe = subscribeConnectivity((nextState) => {
      setState(nextState);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  return state;
}
