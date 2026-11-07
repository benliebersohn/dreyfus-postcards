// Interface language (English / French).
// Only the site's own labels are translated here; the postcard texts, names
// and spreadsheet values stay exactly as they are in the data.

const STRINGS = {
  en: {
    title: 'Dreyfus Postcards',
    aboutTitle: 'About · Dreyfus Postcards',
    navMap: 'Map',
    navAbout: 'About',
    tagline: 'Postcards of the Dreyfus Affair, mapped by origin and destination.',
    switchTo: 'Français',
    switchLabel: 'Afficher le site en français',
    panelLabel: 'Browse the postcards',
    mapLabel: 'Map of postcards',
    searchLabel: 'Search the postcards',
    searchPlaceholder: 'Search texts, names, places…',
    facetAffiliation: 'Political affiliation',
    facetEvent: 'Political event',
    facetYear: 'Year',
    facetKeyword: 'Keywords',
    selected: (n) => `· ${n} selected`,
    clearFilters: 'Clear filters',
    showFewer: 'Show fewer',
    showAll: (n) => `Show all ${n}`,
    resultCount: (shown, total) => `${shown} of ${total} postcards`,
    noMatches: 'No postcards match. Try fewer filters or a different search.',
    from: 'From',
    to: 'To',
    affiliation: 'Affiliation',
    event: 'Event',
    medium: 'Medium',
    publisher: 'Publisher',
    collection: 'Collection',
    copyLink: 'Copy link to this card',
    linkCopied: 'Link copied',
    sentFrom: (n) => `Sent from here (${n})`,
    sentTo: (n) => `Sent to here (${n})`,
    mappedCount: (shown, total) => `${shown} of ${total} postcards mapped.`,
    loadError: (msg) => `Could not load the postcard data (${msg}). `,
    useServer: 'Open the page through a local server, not as a file. ',
    source: 'Source on GitHub'
  },
  fr: {
    title: 'Cartes postales de l’affaire Dreyfus',
    aboutTitle: 'À propos · Cartes postales de l’affaire Dreyfus',
    navMap: 'Carte',
    navAbout: 'À propos',
    tagline: 'Cartes postales de l’affaire Dreyfus, cartographiées par origine et destination.',
    switchTo: 'English',
    switchLabel: 'Show the site in English',
    panelLabel: 'Parcourir les cartes postales',
    mapLabel: 'Carte des cartes postales',
    searchLabel: 'Rechercher dans les cartes postales',
    searchPlaceholder: 'Rechercher textes, noms, lieux…',
    facetAffiliation: 'Appartenance politique',
    facetEvent: 'Événement politique',
    facetYear: 'Année',
    facetKeyword: 'Mots-clés',
    selected: (n) => `· ${n} ${n > 1 ? 'sélectionnés' : 'sélectionné'}`,
    clearFilters: 'Effacer les filtres',
    showFewer: 'Afficher moins',
    showAll: (n) => `Afficher les ${n}`,
    resultCount: (shown, total) => `${shown} sur ${total} cartes postales`,
    noMatches: 'Aucune carte postale ne correspond. Essayez moins de filtres ou une autre recherche.',
    from: 'Expéditeur',
    to: 'Destinataire',
    affiliation: 'Appartenance',
    event: 'Événement',
    medium: 'Technique',
    publisher: 'Éditeur',
    collection: 'Collection',
    copyLink: 'Copier le lien vers cette carte',
    linkCopied: 'Lien copié',
    sentFrom: (n) => `Envoyées d’ici (${n})`,
    sentTo: (n) => `Envoyées ici (${n})`,
    mappedCount: (shown, total) => `${shown} sur ${total} cartes postales cartographiées.`,
    loadError: (msg) => `Impossible de charger les données (${msg}). `,
    useServer: 'Ouvrez la page via un serveur local, pas comme fichier. ',
    source: 'Code source sur GitHub'
  }
};

const LOCALES = { en: 'en-GB', fr: 'fr-FR' };
const STORAGE_KEY = 'dreyfus-lang';

let lang = readSaved() || 'en';

export function getLang() {
  return lang;
}

export function setLang(next) {
  lang = next;
  try { localStorage.setItem(STORAGE_KEY, next); } catch { /* private window etc. */ }
}

// t('clearFilters') or t('resultCount', 3, 10) for the ones that take numbers.
export function t(key, ...args) {
  const value = STRINGS[lang][key];
  return typeof value === 'function' ? value(...args) : value;
}

// Fill in every element marked with data-i18n (text), data-i18n-placeholder
// or data-i18n-label (aria-label) inside `root`.
export function translatePage(root = document) {
  document.documentElement.lang = lang;
  root.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  root.querySelectorAll('[data-i18n-placeholder]').forEach((el) => { el.placeholder = t(el.dataset.i18nPlaceholder); });
  root.querySelectorAll('[data-i18n-label]').forEach((el) => { el.setAttribute('aria-label', t(el.dataset.i18nLabel)); });
}

// Wire up the header's English/French button: label it with the other
// language, translate the page, and call onChange(lang) after each switch.
export function setupLanguageSwitch(button, onChange = () => {}) {
  function apply() {
    translatePage();
    button.textContent = t('switchTo');
    button.setAttribute('aria-label', t('switchLabel'));
    button.lang = lang === 'en' ? 'fr' : 'en'; // the button names the *other* language
  }
  button.addEventListener('click', () => {
    setLang(lang === 'en' ? 'fr' : 'en');
    apply();
    onChange(lang);
  });
  apply();
}

// A card's date in the current language: "22 Sept 1899" / "22 sept. 1899".
export function formatDate({ year, month, day }) {
  if (!year) return lang === 'fr' ? 'Non daté' : 'Undated';
  if (!month) return String(year);
  const options = { month: 'short', year: 'numeric', timeZone: 'UTC' };
  if (day) options.day = 'numeric';
  return new Date(Date.UTC(year, month - 1, day || 1)).toLocaleDateString(LOCALES[lang], options);
}

function readSaved() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved in STRINGS ? saved : null;
  } catch {
    return null;
  }
}
