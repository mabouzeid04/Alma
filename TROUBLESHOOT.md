# If App Still Won't Load

## Problem: Metro bundler stuck or won't start

**Solution:**
```bash
cd /Users/mahmoudabouzeid/Desktop/SecondBrain/app

# Kill everything
ps aux | grep -i expo | awk '{print $2}' | xargs kill -9
ps aux | grep -i metro | awk '{print $2}' | xargs kill -9

# Clear all caches
rm -rf .expo node_modules/.cache ios android

# Start fresh
npx expo start --clear
```

## Problem: "Opening project..." forever on phone

This means the JavaScript bundle isn't loading. Check terminal for errors.

**Solutions:**
1. Make sure your phone and computer are on **same WiFi**
2. If on different networks, use tunnel mode:
   ```bash
   npx expo start --tunnel
   ```
3. Check firewall isn't blocking port 8081

## Problem: App crashes immediately

**Check these in order:**
1. Look at terminal - red error messages?
2. Shake phone → open Dev Menu → check for red errors
3. Common issues:
   - API keys not set in .env
   - Gemini API model name wrong
   - Database permission issues

## Problem: Voice recording doesn't work

1. Check Expo Go has microphone permission (Settings → Expo Go → Microphone)
2. Check .env has EXPO_PUBLIC_ELEVENLABS_API_KEY
3. Look at terminal logs when you tap record

## Still broken?

1. **Delete Expo Go** from phone and reinstall
2. **Clear project completely:**
   ```bash
   cd app
   rm -rf node_modules .expo ios android
   npm install --legacy-peer-deps
   npx expo start --clear
   ```
3. **Check if API keys are valid:**
   - ElevenLabs: https://elevenlabs.io/app/settings/api-keys
   - Gemini: https://makersuite.google.com/app/apikey

4. **Last resort - Development build:**
   ```bash
   npx expo run:ios
   ```
   This builds native app instead of using Expo Go.

## Debug Mode

To see detailed errors:
```bash
npx expo start --clear --dev
```

Watch the terminal - ALL errors show there.
