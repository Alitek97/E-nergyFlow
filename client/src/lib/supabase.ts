import { createClient, SupabaseClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

const hasValidUrl = supabaseUrl.startsWith("https://");
const hasReasonableAnonKey = supabaseAnonKey.length >= 20;

export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabaseAnonKey && hasValidUrl && hasReasonableAnonKey
);

if (__DEV__) {
  console.log("[Supabase] Configuration status:", {
    configured: isSupabaseConfigured,
    hasUrl: Boolean(supabaseUrl),
    hasKey: Boolean(supabaseAnonKey),
    urlValid: hasValidUrl,
    keyLength: supabaseAnonKey.length,
  });
}

const fallbackUrl = "https://placeholder.supabase.co";
const fallbackAnonKey = "placeholder-anon-key-not-real-value";

export const supabase: SupabaseClient = createClient(
  isSupabaseConfigured ? supabaseUrl : fallbackUrl,
  isSupabaseConfigured ? supabaseAnonKey : fallbackAnonKey,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: Platform.OS === "web",
    },
  }
);
