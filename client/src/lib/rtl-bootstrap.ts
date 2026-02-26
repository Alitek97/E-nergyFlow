import AsyncStorage from "@react-native-async-storage/async-storage";
import { I18nManager, Platform } from "react-native";

const LANGUAGE_KEY = "pp-app:language";
const DIRECTION_KEY = "pp-app:dir";

export type Language = "en" | "ar";
export type Direction = "ltr" | "rtl";

export interface RTLBootstrapResult {
  language: Language;
  direction: Direction;
  isRTL: boolean;
  needsManualRestart: boolean;
}

function isRTLLanguage(lang: Language): boolean {
  return lang === "ar";
}

function getTargetDirection(lang: Language): Direction {
  return isRTLLanguage(lang) ? "rtl" : "ltr";
}

async function getStorageItem(key: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(key);
  } catch (e) {
    console.error(`Storage read failed for ${key}:`, e);
    return null;
  }
}

async function setStorageItem(key: string, value: string): Promise<boolean> {
  try {
    await AsyncStorage.setItem(key, value);
    return true;
  } catch (e) {
    console.error(`Storage write failed for ${key}:`, e);
    return false;
  }
}

async function removeStorageItem(key: string): Promise<boolean> {
  try {
    await AsyncStorage.removeItem(key);
    return true;
  } catch (e) {
    console.error(`Storage remove failed for ${key}:`, e);
    return false;
  }
}

async function persistLanguageAndDirection(lang: Language, dir: Direction): Promise<boolean> {
  const langSaved = await setStorageItem(LANGUAGE_KEY, lang);
  const dirSaved = await setStorageItem(DIRECTION_KEY, dir);
  return langSaved && dirSaved;
}

export async function initializeRTL(): Promise<RTLBootstrapResult> {
  try {
    if (Platform.OS !== "web") {
      I18nManager.allowRTL(false);
      I18nManager.forceRTL(false);
    }

    const savedLang = await getStorageItem(LANGUAGE_KEY);

    const language: Language = savedLang === "ar" ? "ar" : "en";
    const shouldBeRTL = isRTLLanguage(language);
    const targetDir = getTargetDirection(language);

    if (Platform.OS === "web") {
      applyWebDirection(language);
    }

    await persistLanguageAndDirection(language, targetDir);

    await removeStorageItem("pp-app:reload-attempt");
    await removeStorageItem("pp-app:user-changed-lang");

    return {
      language,
      direction: targetDir,
      isRTL: shouldBeRTL,
      needsManualRestart: false,
    };
  } catch (error) {
    console.error("Error initializing RTL:", error);
    return { language: "en", direction: "ltr", isRTL: false, needsManualRestart: false };
  }
}

export function applyWebDirection(lang: Language): void {
  if (Platform.OS === "web" && typeof document !== "undefined") {
    const dir = isRTLLanguage(lang) ? "rtl" : "ltr";
    document.documentElement.setAttribute("dir", dir);
    document.documentElement.setAttribute("lang", lang);
  }
}

export async function switchLanguage(newLang: Language): Promise<boolean> {
  try {
    if (Platform.OS === "web") {
      applyWebDirection(newLang);
    }

    await persistLanguageAndDirection(newLang, getTargetDirection(newLang));
    return false;
  } catch (error) {
    console.error("Error switching language:", error);
    return false;
  }
}

export async function saveLanguageOnly(lang: Language): Promise<boolean> {
  return await setStorageItem(LANGUAGE_KEY, lang);
}

export function getCurrentDirection(): Direction {
  if (Platform.OS === "web" && typeof document !== "undefined") {
    return document.documentElement.getAttribute("dir") === "rtl" ? "rtl" : "ltr";
  }
  return "ltr";
}

export function isCurrentlyRTL(): boolean {
  return getCurrentDirection() === "rtl";
}
