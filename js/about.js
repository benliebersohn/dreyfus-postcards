// The About page: the shared header and language switch, plus showing the
// article written in the current language.

import { getLang, setupLanguageSwitch } from './i18n.js';

function showArticle(lang) {
  document.querySelectorAll('main.about article').forEach((article) => {
    article.hidden = article.lang !== lang;
  });
}

setupLanguageSwitch(document.getElementById('lang-switch'), showArticle);
showArticle(getLang());
