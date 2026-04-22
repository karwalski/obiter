#!/bin/bash
# Quick sideload script for Obiter on Mac
# Run: bash scripts/sideload.sh

pkill -9 -f "Microsoft Word" 2>/dev/null
sleep 3
rm -rf ~/Library/Containers/com.microsoft.Word/Data/Documents/wef/ 2>/dev/null
sleep 1
cp manifest.prod.xml /tmp/manifest.xml
npx office-addin-dev-settings sideload /tmp/manifest.xml
