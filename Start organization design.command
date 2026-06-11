#!/bin/bash
# Double-click this file in Finder to start the app.
# The Terminal window that opens must stay open — close it to stop the app.

cd "$(dirname "$0")/app"

if [ ! -d node_modules ]; then
  echo "First-time package install — takes a minute..."
  npm install || { echo "npm install failed"; read -n 1; exit 1; }
fi

echo ""
echo "Starting Organization Design at http://localhost:5173"
echo "Leave this window open while using the app."
echo ""

npm run dev -- --open
