// Dreyfus Postcards map
// Loads the postcard spreadsheet (data/Dreyfus_OD_table.csv) and the place
// coordinates (data/places.csv), then draws a line from each card's Origin
// to its Destination, plus a dot for every place.

const POSTCARDS_CSV = 'data/Dreyfus_OD_table.csv';
const PLACES_CSV = 'data/places.csv';

// 1. Create the map, centered on France.
const map = L.map('map').setView([46.6, 2.5], 6);

// 2. Add a base layer (the background map tiles).
L.tileLayer('https://a.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png', {
  maxZoom: 18,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap France</a>'
}).addTo(map);

// 3. Load both spreadsheets, then draw.
Promise.all([loadCsv(POSTCARDS_CSV), loadCsv(PLACES_CSV)])
  .then(([cards, places]) => drawMap(cards, placeLookup(places)));

function loadCsv(url) {
  return new Promise((resolve, reject) => {
    Papa.parse(url, {
      download: true,
      header: true,          // first row = column names
      skipEmptyLines: true,
      // Tidy column names: drop the invisible Excel "BOM" character and stray spaces.
      transformHeader: (h) => h.replace(/^﻿/, '').trim(),
      complete: (results) => resolve(results.data),
      error: reject
    });
  });
}

// Place names are matched ignoring case and extra spaces ("Paris " = "paris").
function placeKey(name = '') {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

function placeLookup(rows) {
  const lookup = new Map();
  rows.forEach((row) => {
    const lat = parseFloat(row.lat);
    const lon = parseFloat(row.lon);
    if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
      lookup.set(placeKey(row.place), { name: row.place.trim(), latlng: [lat, lon] });
    }
  });
  return lookup;
}

function drawMap(cards, places) {
  const routes = new Map();    // "origin|destination" -> list of cards
  const placeCards = new Map(); // place key -> { sent: [], received: [] }
  let mapped = 0;

  cards.forEach((card) => {
    const from = places.get(placeKey(card.Origin));
    const to = places.get(placeKey(card.Destination));

    // Skip cards whose places aren't in places.csv, but say so in the browser console.
    if (!from || !to) {
      console.warn('Skipping postcard: add its place(s) to data/places.csv:',
        card['Name/ID'], { Origin: card.Origin, Destination: card.Destination });
      return;
    }
    mapped++;

    const routeKey = `${placeKey(card.Origin)}|${placeKey(card.Destination)}`;
    if (!routes.has(routeKey)) routes.set(routeKey, { from, to, cards: [] });
    routes.get(routeKey).cards.push(card);

    entryFor(placeCards, from).sent.push(card);
    entryFor(placeCards, to).received.push(card);
  });

  // One line per origin -> destination pair; thicker when more cards took that route.
  routes.forEach(({ from, to, cards: routeCards }) => {
    if (from.latlng.join() === to.latlng.join()) return; // same town: no line, the dot covers it
    L.polyline([from.latlng, to.latlng], {
      color: '#8b2e1f',
      weight: 1.5 + routeCards.length,
      opacity: 0.6
    })
      .bindPopup(listHtml(`${from.name} → ${to.name}`, routeCards))
      .addTo(map);
  });

  // One dot per place; bigger when more cards were sent or received there.
  const dots = [];
  placeCards.forEach(({ place, sent, received }) => {
    const total = sent.length + received.length;
    const dot = L.circleMarker(place.latlng, {
      radius: 4 + Math.sqrt(total) * 2,
      color: '#3b2f1e',
      weight: 1,
      fillColor: '#d9a441',
      fillOpacity: 0.9
    }).bindPopup(
      `<h2 class="place-name">${escapeHtml(place.name)}</h2>` +
      (sent.length ? listHtml(`Sent from here (${sent.length})`, sent) : '') +
      (received.length ? listHtml(`Sent to here (${received.length})`, received) : '')
    );
    dot.addTo(map);
    dots.push(dot);
  });

  if (dots.length) map.fitBounds(L.featureGroup(dots).getBounds(), { padding: [40, 40], maxZoom: 8 });

  document.getElementById('count').textContent =
    `${mapped} of ${cards.length} postcards mapped.`;
}

function entryFor(placeCards, place) {
  const key = placeKey(place.name);
  if (!placeCards.has(key)) placeCards.set(key, { place, sent: [], received: [] });
  return placeCards.get(key);
}

// A heading followed by one block per card.
function listHtml(heading, cards) {
  return `
    <div class="card-list">
      <h3>${escapeHtml(heading)}</h3>
      ${cards.map(cardHtml).join('')}
    </div>`;
}

function cardHtml(card) {
  const people = [card.Sender, card.Recipient].map((p) => p || 'Unknown').join(' → ');
  const details = [card['Political affiliation'], card['Political event']]
    .filter((v) => v && v !== 'Unknown')
    .join(' · ');

  return `
    <div class="card-popup">
      <h4>${escapeHtml(card.Caption)} <span class="id">${escapeHtml(card['Name/ID'])}</span></h4>
      <p class="meta">${escapeHtml(cardDate(card))} · ${escapeHtml(card.Origin)} → ${escapeHtml(card.Destination)}</p>
      <p class="meta">${escapeHtml(people)}</p>
      ${details ? `<p class="meta">${escapeHtml(details)}</p>` : ''}
      ${card.Text ? `<blockquote lang="fr">${escapeHtml(card.Text)}</blockquote>` : ''}
    </div>`;
}

// Year/Month/Day columns -> "1899-09-22" (or just the year if that's all we have).
function cardDate(card) {
  const pad = (n) => String(n).trim().padStart(2, '0');
  if (!card.Year) return 'Undated';
  if (!card.Month) return card.Year;
  return [card.Year.trim(), pad(card.Month), card.Day ? pad(card.Day) : null].filter(Boolean).join('-');
}

// Prevent text in the spreadsheet from being treated as HTML.
function escapeHtml(text = '') {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
