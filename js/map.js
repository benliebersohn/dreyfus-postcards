// Dreyfus Postcards map
// Loads data/postcards.csv and puts one marker on the map per postcard.

// 1. Create the map, centered on France.
const map = L.map('map').setView([46.6, 2.5], 6);

// 2. Add a base layer (the background map tiles).
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
  maxZoom: 18,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
}).addTo(map);

// 3. Load the spreadsheet (exported as CSV) and add markers.
Papa.parse('data/postcards.csv', {
  download: true,
  header: true,          // first row = column names
  skipEmptyLines: true,
  complete: (results) => addPostcards(results.data)
});

function addPostcards(rows) {
  const markers = [];

  rows.forEach((row) => {
    const lat = parseFloat(row.lat);
    const lon = parseFloat(row.lon);

    // Skip rows without usable coordinates, but say so in the browser console.
    if (Number.isNaN(lat) || Number.isNaN(lon)) {
      console.warn('Skipping postcard with no coordinates:', row.id, row.title);
      return;
    }

    const marker = L.marker([lat, lon]).bindPopup(popupHtml(row));
    markers.push(marker);
  });

  const group = L.featureGroup(markers).addTo(map);
  if (markers.length) map.fitBounds(group.getBounds(), { padding: [40, 40], maxZoom: 8 });

  document.getElementById('count').textContent =
    `${markers.length} postcard${markers.length === 1 ? '' : 's'} mapped.`;
}

// Build the popup shown when a marker is clicked.
function popupHtml(row) {
  const image = row.image
    ? `<img src="${escapeHtml(row.image)}" alt="${escapeHtml(row.title)}">`
    : '';
  const source = row.source ? `<p class="meta">Source: ${escapeHtml(row.source)}</p>` : '';

  return `
    <div class="card-popup">
      <h2>${escapeHtml(row.title)}</h2>
      <p class="meta">${escapeHtml(row.date)} · ${escapeHtml(row.place)}</p>
      ${image}
      <p>${escapeHtml(row.description)}</p>
      ${source}
    </div>`;
}

// Prevent text in the spreadsheet from being treated as HTML.
function escapeHtml(text = '') {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
