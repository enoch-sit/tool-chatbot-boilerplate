// src/i18n.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import translationEN from './locales/en/translation.json';
import translationZHHANS from './locales/zh-Hans/translation.json';
import translationZHHANT from './locales/zh-Hant/translation.json';

const resources = {
  en: {
    translation: translationEN,
  },
  'zh-Hans': {
    translation: translationZHHANS,
  },
  'zh-Hant': {
    translation: translationZHHANT,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    supportedLngs: ['en', 'zh-Hant', 'zh-Hans'],
    fallbackLng: 'en',
    detection: {
      order: ['cookie', 'localStorage', 'htmlTag', 'path', 'subdomain'],
      caches: ['cookie', 'localStorage'],
    },
    react: {
      useSuspense: false,
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;