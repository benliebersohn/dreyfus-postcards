"""Make web-sized copies of the postcard scans.

The original scans are large (about 3000px, 2 MB each), too heavy for a web
page. This writes two smaller copies of every JPG in images/KM_Postcards/:

  images/web/KM_008.jpg     2000px on the long side, for the panel and full-screen view
  images/thumbs/KM_008.jpg   200px on the long side, for the map popups

Run it again after adding or replacing scans (needs Pillow: pip install pillow):

  python scripts/resize_scans.py
"""

from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
ORIGINALS = ROOT / "images" / "KM_Postcards"
SIZES = {"web": 2000, "thumbs": 200}  # output folder -> longest side in pixels

for folder in SIZES:
    (ROOT / "images" / folder).mkdir(exist_ok=True)

for source in sorted(ORIGINALS.glob("*.jpg")):
    with Image.open(source) as original:
        image = ImageOps.exif_transpose(original).convert("RGB")  # honour phone-camera rotation
    for folder, longest in SIZES.items():
        copy = image.copy()
        copy.thumbnail((longest, longest), Image.LANCZOS)
        copy.save(ROOT / "images" / folder / source.name, quality=82, optimize=True, progressive=True)
    print(f"{source.name}  ->  web/, thumbs/")
