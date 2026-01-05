#!/bin/bash

echo "========================================="
echo "  Starting Second Brain App"
echo "========================================="
echo ""

cd /Users/mahmoudabouzeid/Desktop/SecondBrain/app

echo "Clearing cache..."
rm -rf .expo node_modules/.cache 2>/dev/null

echo "Starting Expo dev server..."
echo ""
echo "IGNORE THE WEB ERROR - WE'RE ONLY USING iOS"
echo ""
echo "When QR code appears:"
echo "1. Open Camera app on your iPhone"
echo "2. Scan the QR code"
echo "3. Opens in Expo Go automatically"
echo ""
echo "========================================="
echo ""

# Start with tunnel mode for better connectivity
npx expo start --tunnel --clear

# THIS IS IT: cd ~/Desktop/SecondBrain/app && npx expo start --tunnel --clear
