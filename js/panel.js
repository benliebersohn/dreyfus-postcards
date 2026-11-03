// The side panel: search box, filters (facets) and the list of cards.
// It only displays things and reports what the user does; main.js decides
// what happens next.

import { escapeHtml } from './data.js';
import { t, formatDate } from './i18n.js';

const KEYWORDS_SHOWN = 10; // keyword filters shown before "Show all"

export function createPanel(el, { facets, onQuery, onToggleFacet, onClear, onSelect, onHover }) {
  // Build the parts that never change once, so typing and open/closed filter
  // sections aren't reset each time the list updates. Their text is filled in
  // (and re-filled on a language switch) by translatePage in i18n.js.
  el.innerHTML = `
    <div class="panel-search">
      <label for="search" class="visually-hidden" data-i18n="searchLabel"></label>
      <input type="search" id="search" data-i18n-placeholder="searchPlaceholder" autocomplete="off">
    </div>
    <div class="facets">
      ${facets.map((f) => `
        <details class="facet" data-facet="${f.key}" ${f.open ? 'open' : ''}>
          <summary><span data-i18n="${f.labelKey}"></span> <span class="facet-active"></span></summary>
          <div class="chips"></div>
        </details>`).join('')}
    </div>
    <div class="panel-status" aria-live="polite">
      <span class="result-count"></span>
      <button type="button" class="clear-filters" data-i18n="clearFilters" hidden></button>
    </div>
    <ul class="cards"></ul>`;

  const input = el.querySelector('#search');
  const list = el.querySelector('.cards');
  const status = el.querySelector('.result-count');
  const clearButton = el.querySelector('.clear-filters');
  const expanded = new Set(); // facets showing all their values

  input.addEventListener('input', () => onQuery(input.value));
  clearButton.addEventListener('click', onClear);

  // One click handler for the whole panel; buttons say what they do via data- attributes.
  el.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.dataset.facet) onToggleFacet(button.dataset.facet, button.dataset.value);
    if (button.dataset.more) {
      expanded.has(button.dataset.more) ? expanded.delete(button.dataset.more) : expanded.add(button.dataset.more);
      render(lastRender); // same data, longer/shorter list
    }
    if (button.dataset.select) onSelect(button.dataset.select);
    if (button.dataset.copy) copyLink(button);
  });

  // Hovering a card in the list lights up its route on the map.
  let hoveredId = null;
  list.addEventListener('mouseover', (event) => {
    const item = event.target.closest('.card-item');
    if (item && item.dataset.id !== hoveredId) {
      hoveredId = item.dataset.id;
      onHover([hoveredId]);
    }
  });
  list.addEventListener('mouseleave', () => {
    hoveredId = null;
    onHover([]);
  });

  let lastRender = null;

  function render(data) {
    lastRender = data;
    const { cards, total, counts, selection, query, selectedId, labelFor } = data;
    if (input.value !== query) input.value = query;

    facets.forEach((facet) => {
      const section = el.querySelector(`.facet[data-facet="${facet.key}"]`);
      const selected = selection[facet.key];
      section.querySelector('.facet-active').textContent = selected.size ? t('selected', selected.size) : '';
      section.querySelector('.chips').innerHTML = chipsHtml(facet, counts[facet.key], selected, expanded.has(facet.key), labelFor);
    });

    const filtering = query.trim() || Object.values(selection).some((s) => s.size);
    status.textContent = t('resultCount', cards.length, total);
    clearButton.hidden = !filtering;

    list.innerHTML = cards.length
      ? cards.map((card) => cardHtml(card, card.id === selectedId, selection, labelFor)).join('')
      : `<li class="empty">${t('noMatches')}</li>`;
  }

  function highlight(ids) {
    const hot = new Set(ids);
    list.querySelectorAll('.card-item').forEach((item) => item.classList.toggle('hot', hot.has(item.dataset.id)));
  }

  function scrollTo(id) {
    const item = list.querySelector(`.card-item[data-id="${CSS.escape(id)}"]`);
    if (item) item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  return { render, highlight, scrollTo };
}

// The filter buttons for one facet, most common first (years in order), each with a count.
function chipsHtml(facet, counts, selected, showAll, labelFor) {
  const values = [...new Set([...counts.keys(), ...selected])];
  values.sort(facet.key === 'year'
    ? (a, b) => a.localeCompare(b)
    : (a, b) => (counts.get(b) || 0) - (counts.get(a) || 0) || unknownLast(a, b));

  const limit = facet.key === 'keyword' && !showAll ? KEYWORDS_SHOWN : Infinity;
  const chips = values.slice(0, limit).map((value) => {
    const count = counts.get(value) || 0;
    const pressed = selected.has(value);
    return `<button type="button" class="chip" data-facet="${facet.key}" data-value="${escapeHtml(value)}"
      aria-pressed="${pressed}" ${count === 0 && !pressed ? 'disabled' : ''}>
      ${escapeHtml(labelFor(facet.key, value))} <span class="n">${count}</span></button>`;
  }).join('');

  const more = values.length > KEYWORDS_SHOWN && facet.key === 'keyword'
    ? `<button type="button" class="more" data-more="${facet.key}">${showAll ? t('showFewer') : t('showAll', values.length)}</button>`
    : '';
  return chips + more;
}

function unknownLast(a, b) {
  return (a === 'Unknown') - (b === 'Unknown') || a.localeCompare(b);
}

// One card in the list; the selected card also shows its full record.
function cardHtml(card, isSelected, selection, labelFor) {
  const excerpt = card.text.length > 120 ? `${card.text.slice(0, 120).trim()}…` : card.text;
  return `
    <li class="card-item${isSelected ? ' selected' : ''}" data-id="${escapeHtml(card.id)}">
      <button type="button" class="card-summary" data-select="${escapeHtml(card.id)}" aria-expanded="${isSelected}">
        <span class="card-meta">${escapeHtml(card.id)} · ${escapeHtml(formatDate(card.dateParts))}</span>
        <span class="card-title">${escapeHtml(card.caption)}</span>
        <span class="card-route">${escapeHtml(card.origin)} → ${escapeHtml(card.destination)}</span>
        ${excerpt && !isSelected ? `<span class="card-excerpt" lang="fr">“${escapeHtml(excerpt)}”</span>` : ''}
      </button>
      ${isSelected ? detailHtml(card, selection, labelFor) : ''}
    </li>`;
}

function detailHtml(card, selection, labelFor) {
  const where = (...parts) => parts.filter((p) => p && p !== 'Unknown').join(', ');
  const fields = [
    [t('from'), card.sender, where(card.postageAddress, card.origin)],
    [t('to'), card.recipient, where(card.address, card.destination)],
    [t('affiliation'), card.affiliation],
    [t('event'), card.event],
    [t('medium'), card.medium],
    [t('publisher'), card.publisher],
    [t('collection'), card.institution]
  ].filter(([, value]) => value && value !== 'Unknown');

  const keywords = card.keywords.map((key) => `
    <button type="button" class="chip small" data-facet="keyword" data-value="${escapeHtml(key)}"
      aria-pressed="${selection.keyword.has(key)}">${escapeHtml(labelFor('keyword', key))}</button>`).join('');

  return `
    <div class="card-detail">
      ${card.text ? `<blockquote lang="fr">${escapeHtml(card.text)}</blockquote>` : ''}
      <dl>
        ${fields.map(([label, value, sub]) => `
          <dt>${label}</dt>
          <dd>${escapeHtml(value)}${sub ? `<span class="sub">${escapeHtml(sub)}</span>` : ''}</dd>`).join('')}
      </dl>
      ${keywords ? `<div class="chips">${keywords}</div>` : ''}
      <button type="button" class="copy-link" data-copy="${escapeHtml(card.id)}">${t('copyLink')}</button>
    </div>`;
}

function copyLink(button) {
  navigator.clipboard.writeText(location.href).then(() => {
    button.textContent = t('linkCopied');
    setTimeout(() => { button.textContent = t('copyLink'); }, 1500);
  });
}
