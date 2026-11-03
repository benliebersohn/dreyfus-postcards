// The map: one line per origin -> destination route, one dot per place.
// It redraws whenever the filtered set of cards changes, and can highlight
// the routes and dots that belong to particular cards.

import { escapeHtml } from './data.js';
import { t, formatDate } from './i18n.js';

const OSM_CREDIT = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

// Background map tiles for each interface language.
const BASEMAPS = {
  en: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: OSM_CREDIT
  },  
  fr: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: OSM_CREDIT
  }
};

const ROUTE_STYLE = { color: '#8b2e1f', opacity: 0.45 };
const ROUTE_HOT = { color: '#5a140a', opacity: 1 };
const DOT_STYLE = { color: '#3b2f1e', fillColor: '#d9a441' };
const DOT_HOT = { color: '#5a140a', fillColor: '#8b2e1f' };

export function createMap(elementId, { lang, onHover }) {
  // Create the map, centered on France.
  const map = L.map(elementId).setView([46.6, 2.5], 6);

  // Base layer (the background map tiles), swapped by setLanguage.
  let basemap = null;
  function setLanguage(next) {
    if (basemap) basemap.remove();             ////// This turns on the map being able to change languages
    const { url, attribution } = BASEMAPS[next];
    basemap = L.tileLayer(url, { maxZoom: 18, attribution }).addTo(map);
  }
  setLanguage(lang);

  const layers = L.layerGroup().addTo(map);
  let routes = [];  // { line, hitLine, ids, count }
  let dots = [];    // { dot, ids }

  // Draw the given cards, replacing whatever was drawn before.
  function show(cards, { fit = false } = {}) {
    layers.clearLayers();
    routes = [];
    dots = [];

    const routeGroups = groupBy(cards, (c) => c.routeKey);
    const placeGroups = new Map(); // place key -> { place, sent, received }
    cards.forEach((card) => {
      entryFor(placeGroups, card.from).sent.push(card);
      entryFor(placeGroups, card.to).received.push(card);
    });

    // Lines: thicker when more cards took that route. Same-town cards get no line.
    routeGroups.forEach((routeCards) => {
      const { from, to } = routeCards[0];
      if (from.key === to.key) return;

      const latlngs = [from.latlng, to.latlng];
      const weight = 1.5 + routeCards.length;
      const line = L.polyline(latlngs, { ...ROUTE_STYLE, weight, interactive: false });
      // A wider invisible line on top makes thin routes easy to hover and click.
      const hitLine = L.polyline(latlngs, { opacity: 0, weight: 14 })
        .bindPopup(previewHtml(`${from.name} → ${to.name}`, routeCards));
      const ids = routeCards.map((c) => c.id);
      hitLine.on('mouseover', () => onHover(ids));
      hitLine.on('mouseout', () => onHover([]));
      layers.addLayer(line).addLayer(hitLine);
      routes.push({ line, hitLine, ids, weight });
    });

    // Dots: bigger when more cards were sent or received there.
    placeGroups.forEach(({ place, sent, received }) => {
      const ids = [...new Set([...sent, ...received].map((c) => c.id))];
      const dot = L.circleMarker(place.latlng, {
        ...DOT_STYLE,
        radius: 4 + Math.sqrt(sent.length + received.length) * 2,
        weight: 1,
        fillOpacity: 0.9
      }).bindPopup(
        `<h2 class="place-name">${escapeHtml(place.name)}</h2>` +
        (sent.length ? previewHtml(t('sentFrom', sent.length), sent) : '') +
        (received.length ? previewHtml(t('sentTo', received.length), received) : '')
      );
      dot.on('mouseover', () => onHover(ids));
      dot.on('mouseout', () => onHover([]));
      layers.addLayer(dot);
      dots.push({ dot, ids });
    });

    if (fit && dots.length) {
      map.fitBounds(L.featureGroup(dots.map((d) => d.dot)).getBounds(), { padding: [40, 40], maxZoom: 8 });
    }
  }

  // Emphasise the routes and dots that include any of these card ids.
  function highlight(ids) {
    const hot = new Set(ids);
    routes.forEach(({ line, ids: routeIds, weight }) => {
      const isHot = routeIds.some((id) => hot.has(id));
      line.setStyle(isHot ? { ...ROUTE_HOT, weight: weight + 2 } : { ...ROUTE_STYLE, weight });
      if (isHot) line.bringToFront();
    });
    dots.forEach(({ dot, ids: dotIds }) => {
      const isHot = dotIds.some((id) => hot.has(id));
      dot.setStyle(isHot ? DOT_HOT : DOT_STYLE);
      if (isHot) dot.bringToFront();
    });
  }

  // Move the map to show one card's route.
  function focus(card) {
    map.closePopup();
    if (card.from.key === card.to.key) {
      map.flyTo(card.from.latlng, Math.max(map.getZoom(), 10));
    } else {
      map.flyToBounds([card.from.latlng, card.to.latlng], { padding: [60, 60], maxZoom: 9 });
    }
  }

  return { show, highlight, focus, setLanguage };
}

// Short popup list; each card links to its full record in the side panel.
function previewHtml(heading, cards) {
  const items = cards.map((card) => `
    <li>
      <a href="#${encodeURIComponent(card.id)}">${escapeHtml(card.caption)}</a>
      <span class="meta">${escapeHtml(formatDate(card.dateParts))} · ${escapeHtml(card.sender)} → ${escapeHtml(card.recipient)}</span>
    </li>`).join('');
  return `<div class="card-list"><h3>${escapeHtml(heading)}</h3><ul>${items}</ul></div>`;
}

function groupBy(items, keyFn) {
  const groups = new Map();
  items.forEach((item) => {
    const key = keyFn(item);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  });
  return groups;
}

function entryFor(placeGroups, place) {
  if (!placeGroups.has(place.key)) placeGroups.set(place.key, { place, sent: [], received: [] });
  return placeGroups.get(place.key);
}
