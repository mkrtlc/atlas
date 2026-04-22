import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Only English is bundled upfront so initial render has strings
// immediately. The other 4 locales load on demand when the user
// switches languages — saves ~3.2 MB of upfront bundle on English-
// default loads (the common case).
import en from './locales/en.json';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' },
  { code: 'fr', label: 'Français' },
  { code: 'it', label: 'Italiano' },
  { code: 'tr', label: 'Türkçe' },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code'];

const LOCALE_LOADERS: Record<Exclude<LanguageCode, 'en'>, () => Promise<{ default: Record<string, unknown> }>> = {
  de: () => import('./locales/de.json'),
  fr: () => import('./locales/fr.json'),
  it: () => import('./locales/it.json'),
  tr: () => import('./locales/tr.json'),
};

async function loadLanguage(code: string) {
  if (code === 'en' || i18n.hasResourceBundle(code, 'translation')) return;
  const loader = LOCALE_LOADERS[code as Exclude<LanguageCode, 'en'>];
  if (!loader) return;
  try {
    const mod = await loader();
    i18n.addResourceBundle(code, 'translation', mod.default);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`Failed to load locale ${code}`, err);
  }
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      // de, fr, it, tr added on demand via loadLanguage()
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'de', 'fr', 'it', 'tr'],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'atlasmail-language',
      caches: ['localStorage'],
    },
  });

// When i18next switches languages (either from the detector on init or
// from a user change), lazy-load the bundle if it's not already present.
i18n.on('languageChanged', (lng) => {
  void loadLanguage(lng);
});

// Kick off the initial load for whatever language the detector picked.
void loadLanguage(i18n.language || 'en');

export default i18n;
