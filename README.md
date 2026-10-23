# Dreyfus Postcards

A web map of postcards from the Dreyfus Affair (1894–1906), built with [Leaflet](https://leafletjs.com/) and hosted on GitHub Pages.

## How it works

There is no build step. The site is plain HTML, CSS, and JavaScript:

| File | What it does |
|---|---|
| `index.html` | The page itself; loads Leaflet, Papa Parse, and our code |
| `css/style.css` | Layout and look |
| `js/map.js` | Creates the map, reads the CSVs, draws origin → destination routes |
| `data/Dreyfus_OD_table.csv` | **The data.** One row per postcard (spreadsheet export) |
| `data/places.csv` | Coordinates for every place name used in Origin / Destination |
| `images/` | Postcard scans (optional) |

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

## Run locally

The browser won't load the CSV from a `file://` page, so use a tiny local server from this folder:

```
python -m http.server 8000
```

Then open <http://localhost:8000>. (Or use the VS Code "Live Server" extension.)

## Publish

GitHub repo → **Settings → Pages** → Source: *Deploy from a branch*, Branch: `main`, folder `/ (root)`.
The site appears at <https://benliebersohn.github.io/dreyfus-postcards/>.
