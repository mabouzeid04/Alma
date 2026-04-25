# iOS Setup

Install on your iPhone without $99/year Apple Developer account. App expires every 7 days, takes 2 min to rebuild.

## Prerequisites

- Mac with Xcode installed (download from App Store)
- iPhone with USB cable
- Apple ID (your regular one for App Store)

## First Time Setup (15 minutes)

### 1. Generate iOS project

```bash
cd /path/to/SecondBrain/app
./scripts/first-time-setup.sh
```

This creates the `ios/` folder and opens Xcode.

### 2. Configure code signing in Xcode

When Xcode opens:

1. Click **secondbrain** in the left sidebar (blue icon at top)
2. Select **secondbrain** under TARGETS
3. Click **Signing & Capabilities** tab
4. Check **"Automatically manage signing"**
5. Under Team:
   - If your Apple ID isn't there: **Xcode menu → Settings → Accounts → + → Add Apple ID**
   - Select your Apple ID from the Team dropdown

Xcode will create a provisioning profile automatically.

### 3. Build to your iPhone

1. Connect iPhone via USB
2. Unlock iPhone and tap **"Trust This Computer"**
3. In Xcode toolbar at top, click the device dropdown (says "iPhone" or simulator name)
4. Select your physical iPhone from the list
5. Click the **Play button (▶️)** in Xcode toolbar
6. Build takes 2-5 minutes first time

### 4. Trust developer profile on iPhone

After build completes:

1. On iPhone: **Settings → General → VPN & Device Management**
2. Under "Developer App", tap your Apple ID email
3. Tap **"Trust [your email]"**
4. Tap **"Trust"** in popup

### 5. Done!

Open **Second Brain** on your iPhone home screen. Works without computer.

## Weekly Rebuild (2 minutes)

App expires after 7 days. To renew:

```bash
cd /path/to/SecondBrain/app
./scripts/weekly-rebuild.sh
```

1. Connect iPhone via USB
2. In Xcode, click Play (▶️)
3. Wait 30 seconds
4. Done for another 7 days

## Troubleshooting

**"Signing requires a development team"**
- Xcode → Settings → Accounts → Add your Apple ID
- Select it in Signing & Capabilities

**"Untrusted Developer" when opening app**
- Settings → General → VPN & Device Management → Trust

**Build fails with signing errors**
```bash
npm run prebuild:ios
open ios/secondbrain.xcworkspace
```
Then delete old certificates in Xcode → Settings → Accounts → Manage Certificates

**"Maximum apps on device"**
- Free Apple ID allows 3 apps. Delete an old test app from iPhone.

**App crashes on launch**
- Check `.env` file has valid API keys
- Check Xcode console (bottom panel) for error messages

