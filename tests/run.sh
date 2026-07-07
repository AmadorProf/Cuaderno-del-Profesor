#!/bin/bash
# Ejecuta las pruebas de humo (tests/test.js) sobre una copia temporal de la
# app en Chrome/Chromium headless. Sale con 0 si todas pasan.
#
# Uso:  bash tests/run.sh
#       CHROME="/ruta/a/chrome" bash tests/run.sh
#
# Nota: bajo --virtual-time-budget los temporizadores van en tiempo virtual y
# el plazo de apertura de IndexedDB vence antes de que el open real termine,
# así que la suite ejercita la app con la reserva en localStorage (una ruta
# real del adaptador). La ruta IndexedDB se comprueba en un navegador normal.

set -u
cd "$(dirname "$0")/.."

CHROME="${CHROME:-}"
if [ -z "$CHROME" ]; then
  for c in "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
           "/Applications/Chromium.app/Contents/MacOS/Chromium" \
           google-chrome chromium chromium-browser; do
    if [ -x "$c" ] || command -v "$c" >/dev/null 2>&1; then CHROME="$c"; break; fi
  done
fi
if [ -z "$CHROME" ]; then
  echo "❌ No se encontró Chrome/Chromium. Indica la ruta con CHROME=…"
  exit 2
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

mkdir -p "$TMP/app"
cp -R styles.css js "$TMP/app/"
cp tests/test.js "$TMP/app/js/zz-test.js"
sed 's|<script src="js/main.js"></script>|<script src="js/main.js"></script>\n<script src="js/zz-test.js"></script>|' index.html > "$TMP/app/index.html"

"$CHROME" --headless --disable-gpu --no-sandbox --no-first-run --disable-extensions \
  --user-data-dir="$TMP/profile" --virtual-time-budget=8000 \
  --dump-dom "file://$TMP/app/index.html" > "$TMP/dom.html" 2>/dev/null &
PID=$!

# Chrome headless a veces no termina solo: esperar al resultado y matarlo.
for _ in $(seq 1 45); do
  grep -q 'id="test-out"' "$TMP/dom.html" 2>/dev/null && break
  kill -0 "$PID" 2>/dev/null || break
  sleep 1
done
kill -9 "$PID" 2>/dev/null
wait "$PID" 2>/dev/null

if ! grep -q 'id="test-out"' "$TMP/dom.html"; then
  echo "❌ La página no llegó a ejecutar las pruebas (¿error de carga?)."
  exit 1
fi

sed -n '/id="test-out"/,/<\/pre>/p' "$TMP/dom.html" | sed 's/<[^>]*>//g'
echo "—"
if grep -q "<title>ALL-PASS</title>" "$TMP/dom.html"; then
  echo "✅ Todas las pruebas pasan"
  exit 0
else
  echo "❌ Hay pruebas fallidas"
  exit 1
fi
