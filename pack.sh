#!/bin/bash
set -e

EXCLUDE='*.git* *node_modules* *.DS_Store *.md *.tgz pack.sh'

# Firefox — use manifest.json as-is
zip -r ravendark-sheets-firefox.zip . \
  -x $EXCLUDE \
  -x 'manifest.chrome.json'

# Chrome — swap in manifest.chrome.json as manifest.json
cp manifest.json manifest.firefox.json.bak
cp manifest.chrome.json manifest.json
zip -r ravendark-sheets-chrome.zip . \
  -x $EXCLUDE \
  -x 'manifest.chrome.json' \
  -x 'manifest.firefox.json.bak'
mv manifest.firefox.json.bak manifest.json

echo "Done:"
echo "  ravendark-sheets-firefox.zip"
echo "  ravendark-sheets-chrome.zip"
