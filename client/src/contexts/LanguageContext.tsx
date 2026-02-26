import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from "react";

import { translations, TranslationKey } from "@/lib/i18n";
import { 
  initializeRTL, 
  switchLanguage as rtlSwitchLanguage,
  Language,
  RTLBootstrapResult 
} from "@/lib/rtl-bootstrap";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
  isRTL: boolean;
  isHydrated: boolean;
  needsManualRestart: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");
  const [isHydrated, setIsHydrated] = useState(false);

  const isRTL = language === "ar";

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        const result: RTLBootstrapResult = await initializeRTL();
        
        if (!mounted) return;

        setLanguageState(result.language);
        setIsHydrated(true);
      } catch (error) {
        console.error("Error initializing language:", error);
        if (mounted) {
          setLanguageState("en");
          setIsHydrated(true);
        }
      }
    };

    initialize();

    return () => {
      mounted = false;
    };
  }, []);

  const setLanguage = useCallback(async (lang: Language) => {
    try {
      await rtlSwitchLanguage(lang);
      setLanguageState(lang);
    } catch (error) {
      console.error("Error saving language:", error);
    }
  }, []);

  if (!isHydrated) {
    return null;
  }

  const t = useCallback((key: TranslationKey): string => {
    return translations[language][key] || translations.en[key] || key;
  }, [language]);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
      isRTL,
      isHydrated,
      needsManualRestart: false,
    }),
    [language, setLanguage, t, isRTL, isHydrated]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

const fallbackContext: LanguageContextType = {
  language: "en",
  setLanguage: () => {},
  t: (key: TranslationKey) => translations.en[key] ?? key,
  isRTL: false,
  isHydrated: false,
  needsManualRestart: false,
};

export function useLanguage() {
  const context = useContext(LanguageContext);
  return context ?? fallbackContext;
}

export type { Language };
