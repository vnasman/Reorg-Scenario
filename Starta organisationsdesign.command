#!/bin/bash
# Dubbelklicka denna fil i Finder för att starta appen.
# Terminalfönstret som öppnas måste vara igång — stäng det för att stoppa appen.

cd "$(dirname "$0")/app"

if [ ! -d node_modules ]; then
  echo "Förstagångsinstallation av paket — tar någon minut..."
  npm install || { echo "npm install misslyckades"; read -n 1; exit 1; }
fi

echo ""
echo "Startar Organisationsdesign på http://localhost:5173"
echo "Lämna detta fönster öppet medan du använder appen."
echo ""

npm run dev -- --open
