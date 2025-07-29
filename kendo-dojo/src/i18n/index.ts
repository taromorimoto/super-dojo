import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';

// Import translation files
import en from './locales/en.json';
import fi from './locales/fi.json';

const resources = {
  en: {
    translation: en,
  },
  fi: {
    translation: fi,
  },
};

// Get device language
const deviceLanguage = getLocales()[0]?.languageCode || 'en';

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: deviceLanguage === 'fi' ? 'fi' : 'en', // Default to English if not Finnish
    fallbackLng: 'en',
    compatibilityJSON: 'v4',
    
    interpolation: {
      escapeValue: false, // React already escapes by default
    },
    
    react: {
      useSuspense: false,
    },
  });

export default i18n;