import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabase";

const GUEST_USER_ID_KEY = "pp-app:guest-user-id";

export function isGuestUser(user: { is_anonymous?: boolean } | null): boolean {
  if (!user) return false;
  return user.is_anonymous === true;
}

export async function storeGuestUserId(userId: string): Promise<void> {
  await AsyncStorage.setItem(GUEST_USER_ID_KEY, userId);
}

export async function getStoredGuestUserId(): Promise<string | null> {
  return await AsyncStorage.getItem(GUEST_USER_ID_KEY);
}

export async function signInAsGuest(): Promise<{ success: boolean; error?: string; requiresSetup?: boolean }> {
  try {
    const { data: anonData, error: anonError } = await supabase.auth.signInAnonymously();
    if (!anonError && anonData.session) {
      console.log("Signed in anonymously via Supabase");
      await storeGuestUserId(anonData.session.user.id);
      return { success: true };
    }
    
    if (anonError) {
      console.log("Anonymous sign-in not available:", anonError.message);
      return { 
        success: false, 
        error: "Anonymous sign-in not enabled. Please enable it in Supabase Dashboard > Authentication > Providers > Anonymous Sign-In",
        requiresSetup: true 
      };
    }
  } catch (e: any) {
    console.log("Anonymous sign-in failed:", e.message);
    return { 
      success: false, 
      error: "Anonymous sign-in failed. Please enable it in Supabase Dashboard.",
      requiresSetup: true 
    };
  }

  return { success: false, error: "Anonymous sign-in not available" };
}

export async function clearGuestUserId(): Promise<void> {
  await AsyncStorage.removeItem(GUEST_USER_ID_KEY);
}
