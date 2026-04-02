# Alma - TestFlight Deployment Guide

Everything you need to do to get Alma on TestFlight. Code changes have already been made — this guide covers the manual steps only.

---

## Prerequisites

- [x] An **Apple Developer account** ($99/year) — [developer.apple.com](https://developer.apple.com)
- [x] **EAS CLI** installed: `npm install -g eas-cli`
- [x] Logged into EAS: `eas login`
- [x] Logged into your Apple account in EAS: `eas credentials` (it will prompt you)

---

## Step 1: Create the App in App Store Connect

1. Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
2. Click **My Apps** → **+** → **New App**
3. Fill in:
   - **Platform:** iOS
   - **Name:** Alma
   - **Primary Language:** English
   - **Bundle ID:** Select `com.alma.app` (or register it first — see step 1b)
   - **SKU:** `alma-app` (any unique string)
4. Click **Create**
5. Note down the **Apple ID** shown on the app page (it's a number like `1234567890`)

### Step 1b: Register the Bundle ID (if not already done)

1. Go to [developer.apple.com/account/resources/identifiers](https://developer.apple.com/account/resources/identifiers/list)
2. Click **+** → **App IDs** → **App**
3. Enter:
   - **Description:** Alma
   - **Bundle ID:** Explicit → `com.alma.app`
4. Click **Continue** → **Register**

---

## Step 2: Find Your Apple Credentials

You need three things:

| Credential | Where to find it |
|-----------|-----------------|
| **Apple ID (email)** | The email you use to sign into App Store Connect |
| **ASC App ID** | From Step 1 — the numeric ID on your app page in App Store Connect |
| **Apple Team ID** | [developer.apple.com/account](https://developer.apple.com/account) → scroll down to **Membership Details** → **Team ID** |

---

## Step 3: Fill in EAS Submit Config

Open `app/eas.json` and fill in the submit section:

```json
"submit": {
  "production": {
    "ios": {
      "appleId": "your@email.com",
      "ascAppId": "1234567890",
      "appleTeamId": "ABC123DEF4"
    }
  }
}
```

Replace with your actual values from Step 2.

---

## Step 4: Set Up API Keys for Production

Your local `.env` file doesn't get included in EAS builds. You need to add your API keys as EAS secrets.

Run these from the `app/` directory. Use the same values from your local `app/.env` file:

```bash
cd app

# Required — Gemini powers STT, TTS, and embeddings
eas secret:create --name EXPO_PUBLIC_GEMINI_API_KEY --value "your-gemini-key"

# Required — xAI Grok (your primary conversation model)
eas secret:create --name EXPO_PUBLIC_XAI_API_KEY --value "your-xai-key"

# Optional — OpenAI
eas secret:create --name EXPO_PUBLIC_OPENAI_API_KEY --value "your-openai-key"

# Model configuration (match your .env)
eas secret:create --name EXPO_PUBLIC_PRIMARY_MODEL_PROVIDER --value "xai"
eas secret:create --name EXPO_PUBLIC_PRIMARY_MODEL --value "grok-4-1-fast-non-reasoning"
eas secret:create --name EXPO_PUBLIC_MEMORY_MODEL_PROVIDER --value "xai"
eas secret:create --name EXPO_PUBLIC_MEMORY_MODEL --value "grok-4-1-fast-non-reasoning"
eas secret:create --name EXPO_PUBLIC_KNOWLEDGE_MODEL_PROVIDER --value "xai"
eas secret:create --name EXPO_PUBLIC_KNOWLEDGE_MODEL --value "grok-4-1-fast-non-reasoning"
eas secret:create --name EXPO_PUBLIC_EMBEDDING_MODEL_PROVIDER --value "gemini"
eas secret:create --name EXPO_PUBLIC_EMBEDDING_MODEL --value "text-embedding-004"
eas secret:create --name EXPO_PUBLIC_INSIGHTS_MODEL_PROVIDER --value "xai"
eas secret:create --name EXPO_PUBLIC_INSIGHTS_MODEL --value "grok-4-1-fast-non-reasoning"
eas secret:create --name EXPO_PUBLIC_PROMPT_MODEL_PROVIDER --value "xai"
eas secret:create --name EXPO_PUBLIC_PROMPT_MODEL --value "grok-4-1-fast-non-reasoning"
```

To verify your secrets are saved:

```bash
eas secret:list
```

---

## Step 5: Host the Privacy Policy

A privacy policy has already been created at `docs/privacy-policy.html`. You just need to host it somewhere public and paste the URL into App Store Connect.

**Quickest option — GitHub Pages (free):**

1. Push this repo to GitHub (if not already)
2. Go to your repo → **Settings** → **Pages**
3. Under **Source**, select **Deploy from a branch**
4. Select your branch (e.g., `main`) and folder `/docs`
5. Click **Save**
6. Your privacy policy will be live at: `https://yourusername.github.io/Alma/privacy-policy.html`

**Then add it to App Store Connect:**

1. Go to your app in [App Store Connect](https://appstoreconnect.apple.com)
2. Click **App Information** (left sidebar)
3. Paste your privacy policy URL in **Privacy Policy URL**
4. Click **Save**

---

## Step 6: Build the App

From the `app/` directory:

```bash
cd app

# Build for iOS (production profile)
eas build --platform ios --profile production
```

This will:
- Ask you to log in to your Apple account (if not already)
- Auto-generate provisioning profiles and certificates
- Build the app in the cloud
- Give you a build URL when done

**This takes 10-20 minutes.** You'll get a notification when it's done.

---

## Step 7: Submit to TestFlight

After the build completes:

```bash
eas submit --platform ios --profile production
```

This uploads the build to App Store Connect. It will:
- Ask you to confirm the build to submit
- Upload it to TestFlight

---

## Step 8: Set Up TestFlight

1. Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com) → your app → **TestFlight** tab
2. Wait for Apple to process the build (usually 5-30 minutes)
3. You may need to answer the **Export Compliance** question:
   - "Does your app use encryption?" → **No** (unless you added custom encryption)
4. Under **Internal Testing**, click **+** to create a group
5. Add yourself (and anyone else) as testers
6. Testers will get an email invite to install via the TestFlight app

---

## Troubleshooting

### Build fails with signing errors
Run `eas credentials` and let EAS manage your certificates automatically. If you have existing certs that conflict, you can clear them with `eas credentials --platform ios` and select "Remove" options.

### Build fails with dependency errors
```bash
cd app
rm -rf node_modules
npm install --legacy-peer-deps
eas build --platform ios --profile production --clear-cache
```

### "Missing compliance" warning in TestFlight
Go to the build in App Store Connect → TestFlight → click the yellow warning → answer "No" to the encryption question.

### API key not working in production build
Verify your secrets: `eas secret:list`. The secret names must match exactly (e.g., `EXPO_PUBLIC_GEMINI_API_KEY`).

---

## Quick Reference

```bash
# Full deploy flow (run from app/ directory)
cd app
eas build --platform ios --profile production
eas submit --platform ios --profile production
```

That's it. Once submitted, open TestFlight on your phone and install the build.
