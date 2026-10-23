// Loading and preparing the postcard data.
// Reads the postcard spreadsheet and the place coordinates, and turns each
// spreadsheet row into a "card" object the map and panel can use.

const POSTCARDS_CSV = 'data/Dreyfus_OD_table.csv';
const PLACES_CSV = 'data/places.csv';
const KEYWORDS_COLUMN = 'Keywords description image ENG/FR';
const BOM = new RegExp('^' + String.fromCharCode(0xFEFF)); // invisible character Excel puts at the start

export async function loadData() {
  const [rows, placeRows] = await Promise.all([loadCsv(POSTCARDS_CSV), loadCsv(PLACES_CSV)]);
  const places = placeLookup(placeRows);
  const cards = [];

  rows.forEach((row) => {
    const from = places.get(placeKey(row.Origin));
    const to = places.get(placeKey(row.Destination));

    // Skip cards whose places aren't in places.csv, but say so in the browser console.
    if (!from || !to) {
      console.warn('Skipping postcard: add its place(s) to data/places.csv:',
        row['Name/ID'], { Origin: row.Origin, Destination: row.Destination });
      return;
    }
    cards.push(prepareCard(row, from, to));
  });

  cards.sort((a, b) => a.sortDate.localeCompare(b.sortDate));
  return { cards, total: rows.length, keywordLabels: keywordLabels(cards) };
}

function loadCsv(url) {
  return new Promise((resolve, reject) => {
    Papa.parse(url, {
      download: true,
      header: true,          // first row = column names
      skipEmptyLines: true,
      transformHeader: (h) => h.replace(BOM, '').trim(),
      complete: (results) => resolve(results.data),
      error: reject
    });
  });
}

// Place names are matched ignoring case and extra spaces ("Paris " = "paris").
export function placeKey(name = '') {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

function placeLookup(rows) {
  const lookup = new Map();
  rows.forEach((row) => {
    const lat = parseFloat(row.lat);
    const lon = parseFloat(row.lon);
    if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
      lookup.set(placeKey(row.place), { key: placeKey(row.place), name: row.place.trim(), latlng: [lat, lon] });
    }
  });
  return lookup;
}

// One spreadsheet row -> one card. Field names here are what the rest of the code uses.
function prepareCard(row, from, to) {
  const keywordList = clean(row[KEYWORDS_COLUMN]).split(',').map((k) => k.trim()).filter(Boolean);
  const card = {
    id: clean(row['Name/ID']),
    caption: clean(row.Caption) || 'Untitled',
    origin: clean(row.Origin),
    postageAddress: clean(row['Postage address']),
    destination: clean(row.Destination),
    address: clean(row.Address),
    sender: clean(row.Sender) || 'Unknown',
    recipient: clean(row.Recipient) || 'Unknown',
    text: clean(row.Text),
    affiliation: clean(row['Political affiliation']) || 'Unknown',
    event: clean(row['Political event']) || 'Unknown',
    year: clean(row.Year) || 'Undated',
    medium: clean(row['Artistic medium (Photograph, watercolor, linework)']),
    publisher: clean(row.Publisher) === 'Unknown' ? ''
      : [clean(row.Publisher), clean(row['Publisher country'])].filter(Boolean).join(', '),
    institution: clean(row['Institution (current location)']),
    // Keywords are grouped ignoring accents and case, so "Guerin" and "Guérin" count as one.
    keywords: [...new Set(keywordList.map(fold))],
    keywordForms: keywordList,
    from,
    to,
    routeKey: `${from.key}|${to.key}`,
    ...cardDate(row)
  };
  card.searchText = fold([
    card.id, card.caption, card.origin, card.destination, card.address, card.sender,
    card.recipient, card.text, card.event, card.affiliation, keywordList.join(' ')
  ].join(' '));
  return card;
}

// Year/Month/Day columns -> a sortable "1899-09-22" and a readable "22 Sept 1899".
function cardDate(row) {
  const year = parseInt(row.Year, 10);
  const month = parseInt(row.Month, 10);
  const day = parseInt(row.Day, 10);
  if (!year) return { sortDate: '9999', displayDate: 'Undated' };

  const pad = (n) => String(n).padStart(2, '0');
  const sortDate = [year, month && pad(month), month && day && pad(day)].filter(Boolean).join('-');
  if (!month) return { sortDate, displayDate: String(year) };

  const options = { month: 'short', year: 'numeric', timeZone: 'UTC' };
  if (day) options.day = 'numeric';
  return { sortDate, displayDate: new Date(Date.UTC(year, month - 1, day || 1)).toLocaleDateString('en-GB', options) };
}

// For each grouped keyword, show the spelling used most often, capitalised.
function keywordLabels(cards) {
  const forms = new Map(); // key -> { spelling: count }
  cards.forEach((card) => card.keywordForms.forEach((form) => {
    const counts = forms.get(fold(form)) || {};
    counts[form] = (counts[form] || 0) + 1;
    forms.set(fold(form), counts);
  }));

  const labels = new Map();
  forms.forEach((counts, key) => {
    const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
    labels.set(key, best.charAt(0).toUpperCase() + best.slice(1));
  });
  return labels;
}

function clean(value) {
  const text = (value || '').trim();
  return text === 'N/A' ? '' : text;
}

// Lowercase and strip accents, so "epouvantable" matches "épouvantable".
export function fold(text = '') {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

// Prevent text in the spreadsheet from being treated as HTML.
export function escapeHtml(text = '') {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
