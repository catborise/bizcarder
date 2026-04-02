import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpBackend from 'i18next-http-backend';

// Critical namespaces — loaded eagerly (always needed on first render)
import trCommon from './locales/tr/common.json';
import enCommon from './locales/en/common.json';
import trCards from './locales/tr/cards.json';
import enCards from './locales/en/cards.json';
import trDashboard from './locales/tr/dashboard.json';
import enDashboard from './locales/en/dashboard.json';
import trAuth from './locales/tr/auth.json';
import enAuth from './locales/en/auth.json';
import trPages from './locales/tr/pages.json';
import enPages from './locales/en/pages.json';

const eagerResources = {
  tr: { common: trCommon, cards: trCards, dashboard: trDashboard, auth: trAuth, pages: trPages },
  en: { common: enCommon, cards: enCards, dashboard: enDashboard, auth: enAuth, pages: enPages },
};

// Lazy namespaces (help, about, users, settings, filters) are fetched on demand
// from /locales/{lng}/{ns}.json — served from frontend/public/locales/.
// Source-of-truth files remain in frontend/src/i18n/locales/; public/ copies are
// generated at build time (or manually) and must be kept in sync.

i18n
  .use(HttpBackend)
  .use(initReactI18next)
  .init({
    resources: eagerResources,
    lng: localStorage.getItem('language') || 'tr',
    fallbackLng: 'tr',
    defaultNS: 'common',
    ns: ['common', 'cards', 'dashboard', 'auth', 'pages'],
    partialBundledLanguages: true, // allow mixing bundled + HTTP-backend resources
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
    interpolation: {
      escapeValue: false,
    },
    react: { useSuspense: false },
  });

// Persist language changes to localStorage
i18n.on('languageChanged', (lng) => {
  localStorage.setItem('language', lng);
  document.documentElement.setAttribute('lang', lng);
});

// Set initial lang attribute
document.documentElement.setAttribute('lang', i18n.language);

export default i18n;
