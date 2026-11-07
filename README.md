# Dreyfus Postcards

A web map of postcards from the Dreyfus Affair (1894–1906), built with [Leaflet](https://leafletjs.com/) and hosted on GitHub Pages.

## How it works

There is no build step. The site is plain HTML, CSS, and JavaScript:

| File | What it does |
|---|---|
| `index.html` | The page itself; loads Leaflet, Papa Parse, and our code |
| `about.html` | About page: project statement and credits, written out in English and French |
| `css/style.css` | Layout and look |
| `js/main.js` | Starts everything; keeps the search, filters and selected card in sync |
| `js/data.js` | Reads the CSVs and prepares each card (dates, keywords, search text) |
| `js/map.js` | Draws origin → destination routes and place dots; highlighting |
| `js/panel.js` | Side panel: search box, filters, card list and full card record |
| `js/i18n.js` | English/French interface text and the language switch button |
| `js/about.js` | About page: shows the article in the current language |
| `data/Dreyfus_OD_table.csv` | **The data.** One row per postcard (spreadsheet export) |
| `data/places.csv` | Coordinates for every place name used in Origin / Destination |
| `js/viewer.js` | Full-screen view of a postcard scan |
| `images/KM_Postcards/` | Original postcard scans |
| `images/web/`, `images/thumbs/` | Web-sized copies of the scans, made by `scripts/resize_scans.py` |

## Data

`data/Dreyfus_OD_table.csv` is the postcard spreadsheet, exported as **CSV (UTF-8)**. The map uses
`Name/ID`, `Origin`, `Destination`, `Year`/`Month`/`Day`, `Caption`, `Sender`, `Recipient`, `Text`,
`Political affiliation` and `Political event`. To update: edit the spreadsheet, re-export, and replace the file.

`data/places.csv` gives coordinates for each place name, written exactly as it appears in the
Origin/Destination columns (matching ignores capitals and extra spaces):

| Column | Notes |
|---|---|
| `place` | Place name as written in the spreadsheet, e.g. `Salins (Jura)` |
| `lat`, `lon` | Decimal degrees, e.g. `46.9386`, `5.8789` |
| `note` | Modern name, or `APPROXIMATE: ...` when the location is a guess |

A card whose Origin or Destination isn't in `places.csv` is skipped, with a warning in the browser
console naming the missing place. When you add new cards with new places, add a row here.

## Scans

Each card's scan is found from its `Name/ID`, with the hyphen written as an underscore: card `KM-008`
uses `KM_008.jpg`. A scan of the back, if there is one, is named `KM_008_verso.jpg`; the card then
gets Front/Back buttons. A card with no scan simply shows none.

The originals in `images/KM_Postcards/` are too large for the web (about 2 MB each), so the site uses
smaller copies. After adding or replacing scans, make new copies with:

```
python scripts/resize_scans.py
```

## Linking to a card

Every card has its own address: add `#` and its ID to the page URL, e.g.
`https://benliebersohn.github.io/dreyfus-postcards/#KM-008`. The panel's
"Copy link to this card" button copies it.

## Run locally

The browser won't load the CSV from a `file://` page, so use a tiny local server from this folder:

```
python -m http.server 8000
```

Then open <http://localhost:8000>. (Or use the VS Code "Live Server" extension.)

## Publish

GitHub repo → **Settings → Pages** → Source: *Deploy from a branch*, Branch: `main`, folder `/ (root)`.
The site appears at <https://benliebersohn.github.io/dreyfus-postcards/>.
