// Dreyfus Postcards: wires the data, the map and the side panel together.
// Keeps track of the search text, the chosen filters and the selected card,
// and redraws the map and panel whenever one of them changes.

import { loadData, fold } from './data.js';
import { createMap } from './map.js';
import { createPanel } from './panel.js';

// The filters shown in the panel. `values` says which filter values a card has.
const FACETS = [
  { key: 'affiliation', label: 'Political affiliation', open: true, values: (c) => [c.affiliation] },
  { key: 'event', label: 'Political event', open: true, values: (c) => [c.event] },
  { key: 'year', label: 'Year', open: true, values: (c) => [c.year] },
  { key: 'keyword', label: 'Keywords', open: false, values: (c) => c.keywords }
];

const state = {
  query: '',
  selection: Object.fromEntries(FACETS.map((f) => [f.key, new Set()])), // facet key -> chosen values
  selectedId: null,
  hoveredIds: []
};

let cards = [];
let total = 0;
let keywordLabels = new Map();
let visibleIds = new Set();

const mapView = createMap('map', { onHover: setHovered });
const panel = createPanel(document.getElementById('panel'), {
  facets: FACETS,
  onQuery: (text) => { state.query = text; update({ fit: true }); },
  onToggleFacet: (key, value) => {
    const chosen = state.selection[key];
    chosen.has(value) ? chosen.delete(value) : chosen.add(value);
    update({ fit: true });
  },
  onClear: clearFilters,
  onSelect: (id) => select(id === state.selectedId ? null : id),
  onHover: setHovered
});

loadData()
  .then((data) => {
    ({ cards, total, keywordLabels } = data);
    document.getElementById('count').textContent = `${cards.length} of ${total} postcards mapped.`;
    update({ fit: true });
    // A link like index.html#KM-008 opens that card; popup links work the same way.
    selectFromHash();
    window.addEventListener('hashchange', selectFromHash);
  })
  .catch((err) => {
    // Show the problem on the page, not just in the console.
    console.error(err);
    document.getElementById('count').textContent =
      `Could not load the postcard data (${err.message || err}). ` +
      (location.protocol === 'file:' ? 'Open the page through a local server, not as a file. ' : '');
  });

// Does this card pass the search and every filter (optionally ignoring one filter)?
function matches(card, ignoreFacet) {
  const terms = fold(state.query).split(/\s+/).filter(Boolean);
  if (!terms.every((term) => card.searchText.includes(term))) return false;

  return FACETS.every((facet) => {
    const chosen = state.selection[facet.key];
    return facet.key === ignoreFacet || chosen.size === 0 || facet.values(card).some((v) => chosen.has(v));
  });
}

// For each facet, how many cards would match if you picked each value,
// given the search and the *other* facets.
function facetCounts() {
  return Object.fromEntries(FACETS.map((facet) => {
    const counts = new Map();
    cards.filter((card) => matches(card, facet.key)).forEach((card) => {
      facet.values(card).forEach((v) => counts.set(v, (counts.get(v) || 0) + 1));
    });
    return [facet.key, counts];
  }));
}

function update({ fit = false } = {}) {
  const visible = cards.filter((card) => matches(card));
  visibleIds = new Set(visible.map((c) => c.id));
  if (!visibleIds.has(state.selectedId)) state.selectedId = null;

  mapView.show(visible, { fit });
  panel.render({
    cards: visible,
    total: cards.length,
    counts: facetCounts(),
    selection: state.selection,
    query: state.query,
    selectedId: state.selectedId,
    labelFor: (key, value) => (key === 'keyword' ? keywordLabels.get(value) || value : value)
  });
  refreshHighlight();
}

// Open (or close, with null) one card: expand it in the list and fly the map to it.
function select(id) {
  const card = cards.find((c) => c.id === id);
  if (card && !visibleIds.has(card.id)) clearFilters(); // a shared link to a card hidden by filters

  state.selectedId = card ? card.id : null;
  history.replaceState(null, '', card ? `#${encodeURIComponent(card.id)}` : location.pathname + location.search);
  update();
  if (card) {
    mapView.focus(card);
    panel.scrollTo(card.id);
  }
}

function selectFromHash() {
  const id = decodeURIComponent(location.hash.slice(1));
  if (id && id !== state.selectedId) select(id);
}

function clearFilters() {
  state.query = '';
  Object.values(state.selection).forEach((chosen) => chosen.clear());
  update({ fit: true });
}

// Hovering shows its cards; otherwise the selected card stays lit.
function setHovered(ids) {
  state.hoveredIds = ids;
  refreshHighlight();
}

function refreshHighlight() {
  const ids = state.hoveredIds.length ? state.hoveredIds : [state.selectedId].filter(Boolean);
  mapView.highlight(ids);
  panel.highlight(ids);
}
