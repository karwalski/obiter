#!/bin/bash
set -e
echo "Building Obiter for production..."
npm run build
echo "Copying production manifest..."
cp manifest.prod.xml dist/manifest.xml
echo "Production build complete in dist/"
