#!/bin/bash
set -e

[ ! -f "package.json" ] && echo "Run from app directory" && exit 1
command -v xcodebuild &> /dev/null || { echo "Install Xcode first"; exit 1; }

[ ! -d "node_modules" ] && npm install

echo "Generating iOS project..."
npx expo prebuild --platform ios --clean

echo "Opening Xcode..."
open ios/secondbrain.xcworkspace

echo "Next: Enable signing, connect iPhone, click Play"

