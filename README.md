# Dreyfus Postcards

A web map of postcards from the Dreyfus Affair (1894â€“1906), built with [Leaflet](https://leafletjs.com/) and hosted on GitHub Pages.

## How it works

There is no build step. The site is plain HTML, CSS, and JavaScript:

| File | What it does |
|---|---|
| `index.html` | The page itself; loads Leaflet, Papa Parse, and our code |
| `css/style.css` | Layout and look |
| `js/map.js` | Creates the map, reads the CSV, adds a marker per postcard |
| `data/postcards.csv` | **The data.** One row per postcard |
| `images/` | Postcard scans (optional) |

## Data columns

| Column | Required | Notes |
|---|---|---|
| `id` | yes | Short unique ID, e.g. `dc-001` |
| `title` | yes | |
| `date` | | Ideally `YYYY` or `YYYY-MM-DD` |
| `place` | | Human-readable place name |
| `lat`, `lon` | yes (to be mapped) | Decimal degrees, e.g. `48.8566`, `2.3522` |
| `image` | | Path like `images/dc-001.jpg` or a full URL |
| `description` | | |
| `source` | | Archive / collection / rights info |

Rows without `lat`/`lon` are skipped (a warning appears in the browser console).

To update the data: edit the spreadsheet, export as **CSV (UTF-8)**, and replace `data/postcards.csv`.

## Run locally

The browser won't load the CSV from a `file://` page, so use a tiny local server from this folder:

```
python -m http.server 8000
```

Then open <http://localhost:8000>. (Or use the VS Code "Live Server" extension.)

## Publish

GitHub repo â†’ **Settings â†’ Pages** â†’ Source: *Deploy from a branch*, Branch: `main`, folder `/ (root)`.
The site appears at <https://benliebersohn.github.io/dreyfus-postcards/>.
