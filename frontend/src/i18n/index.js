import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import trCommon from './locales/tr/common.json';
import trAuth from './locales/tr/auth.json';
import trCards from './locales/tr/cards.json';
import trDashboard from './locales/tr/dashboard.json';
import trFilters from './locales/tr/filters.json';
import trSettings from './locales/tr/settings.json';
import trUsers from './locales/tr/users.json';
import trHelp from './locales/tr/help.json';
import trAbout from './locales/tr/about.json';
import trPages from './locales/tr/pages.json';

import enCommon from './locales/en/common.json';
import enAuth from './locales/en/auth.json';
import enCards from './locales/en/cards.json';
import enDashboard from './locales/en/dashboard.json';
import enFilters from './locales/en/filters.json';
import enSettings from './locales/en/settings.json';
import enUsers from './locales/en/users.json';
import enHelp from './locales/en/help.json';
import enAbout from './locales/en/about.json';
import enPages from './locales/en/pages.json';

i18n.use(initReactI18next).init({
  resources: {
    tr: {
      common: trCommon,
      auth: trAuth,
      cards: trCards,
      dashboard: trDashboard,
      filters: trFilters,
      settings: trSettings,
      users: trUsers,
      help: trHelp,
      about: trAbout,
      pages: trPages
    },
    en: {
      common: enCommon,
      auth: enAuth,
      cards: enCards,
      dashboard: enDashboard,
      filters: enFilters,
      settings: enSettings,
      users: enUsers,
      help: enHelp,
      about: enAbout,
      pages: enPages
    }
  },
  lng: localStorage.getItem('language') || 'tr',
  fallbackLng: 'tr',
  defaultNS: 'common',
  interpolation: {
    escapeValue: false
  }
});

// Persist language changes to localStorage
i18n.on('languageChanged', (lng) => {
  localStorage.setItem('language', lng);
  document.documentElement.setAttribute('lang', lng);
});

// Set initial lang attribute
document.documentElement.setAttribute('lang', i18n.language);

export default i18n;
