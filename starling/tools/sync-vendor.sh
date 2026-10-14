#!/bin/bash
# Populate app/vendor from npm packages. The vendor directory is generated,
# not committed: F-Droid and CI fetch dependencies from the npm registry with
# lockfile integrity pins and run this, so no prebuilt blob lives in git.
# The unminified build ships everywhere (web and Android alike): identical
# bytes on both hosts, and anyone auditing the APK reads real source.
set -euo pipefail
cd "$(dirname "$0")/.."

SRC=node_modules/leaflet/dist
DST=app/vendor/leaflet

[ -f "$SRC/leaflet-src.js" ] || { echo "leaflet is not installed. Run: npm ci"; exit 1; }

mkdir -p "$DST"
rm -rf "$DST/images"
cp "$SRC/leaflet-src.js" "$DST/leaflet.js"
# The file's sourceMappingURL trailer names leaflet-src.js.map; ship it under
# that name so devtools resolve it instead of logging 404s.
cp "$SRC/leaflet-src.js.map" "$DST/leaflet-src.js.map"
cp "$SRC/leaflet.css" "$DST/leaflet.css"
cp -r "$SRC/images" "$DST/images"

# Fonts: Figtree (body) and Bricolage Grotesque (headings), both SIL OFL 1.1.
# Only the upright variable weight axis in the latin and latin-ext subsets
# (Polish needs latin-ext). app/css/fonts.css declares them; nothing is ever
# fetched from a font service at runtime.
FONTS=app/vendor/fonts
FIG=node_modules/@fontsource-variable/figtree
BRI=node_modules/@fontsource-variable/bricolage-grotesque
[ -f "$FIG/files/figtree-latin-wght-normal.woff2" ] || { echo "fonts are not installed. Run: npm ci"; exit 1; }
[ -f "$BRI/files/bricolage-grotesque-latin-wght-normal.woff2" ] || { echo "fonts are not installed. Run: npm ci"; exit 1; }
rm -rf "$FONTS"
mkdir -p "$FONTS"
for sub in latin latin-ext; do
  cp "$FIG/files/figtree-$sub-wght-normal.woff2" "$FONTS/"
  cp "$BRI/files/bricolage-grotesque-$sub-wght-normal.woff2" "$FONTS/"
done
cp "$FIG/LICENSE" "$FONTS/LICENSE-figtree.txt"
cp "$BRI/LICENSE" "$FONTS/LICENSE-bricolage-grotesque.txt"

echo "vendor synced: leaflet $(node -p 'require("leaflet/package.json").version') (unminified)"
echo "vendor synced: figtree $(node -p 'require("@fontsource-variable/figtree/package.json").version'), bricolage grotesque $(node -p 'require("@fontsource-variable/bricolage-grotesque/package.json").version')"
