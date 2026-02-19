# Supabase OAuth Configuration Guide

Enabling OAuth (Social Login) requires configuring both the **External Provider** (Google, Apple, Facebook) and the **Supabase Dashboard**.

> **Note**: These steps cannot be performed via SQL because they require sensitive API Secrets that must be securely stored in Supabase's Auth service.

---

## 1. Google OAuth Setup

### Step A: Google Cloud Console
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Select your project (or create a new one).
3. Navigate to **APIs & Services > OAuth consent screen**.
   - select **External**.
   - Fill in the **App Information** (Name, email).
   - In **Authorized domains**, add `supabase.co` (if using hosted) or your own domain.
   - Save and Continue.
4. Navigate to **APIs & Services > Credentials**.
5. Click **+ CREATE CREDENTIALS** -> **OAuth client ID**.
   - Application type: **Web application**.
   - Name: `Supabase Auth`.
   - **Authorized redirect URIs**:
     - Go to your Supabase Dashboard > Authentication > URL Configuration.
     - Copy the **Site URL** (e.g., `https://<project-id>.supabase.co`).
     - Paste it into Google, appending `/auth/v1/callback` (e.g., `https://<your-ref>.supabase.co/auth/v1/callback`).
6. Click **Create**.
7. Copy the **Client ID** and **Client Secret**.

### Step B: Supabase Dashboard
1. Go to **Authentication > Providers**.
2. Select **Google**.
3. Toggle "Enable Sign in with Google".
4. Paste the **Client ID** and **Client Secret**.
5. Click **Save**.

---

## 2. Facebook Login Setup

### Step A: Meta for Developers
1. Go to [Meta for Developers](https://developers.facebook.com/).
2. Click **My Apps** > **Create App**.
   - Select **Authenticate and request data from users with Facebook Login**.
   - Fill in app details.
3. In the App Dashboard, under "Add products to your app", find **Facebook Login** and click **Set up**.
4. Select **Web**.
5. Go to **Facebook Login > Settings** (sidebar).
6. Under **Valid OAuth Redirect URIs**, paste your Supabase Callback URL:
   - `https://<your-ref>.supabase.co/auth/v1/callback`
7. Save Changes.
8. Go to **App settings > Basic**.
9. Copy **App ID** and **App Secret**.

### Step B: Supabase Dashboard
1. Go to **Authentication > Providers**.
2. Select **Facebook**.
3. Toggle "Enable Sign in with Facebook".
4. Paste the **Client ID** (App ID) and **Client Secret** (App Secret).
5. Click **Save**.

---

## 3. Apple Sign In Setup (Requires Apple Developer Account)

### Step A: Apple Developer Portal
1. Go to [Apple Developer Account](https://developer.apple.com/account/).
2. **Identifiers**: Create an App ID (enable "Sign In with Apple").
3. **Services IDs**: Create a Service ID.
   - Configure "Sign In with Apple".
   - **Domains and Subdomains**: Enter `supabase.co` (or your custom domain).
   - **Return URLs**: Enter your Supabase Callback URL (`https://<your-ref>.supabase.co/auth/v1/callback`).
4. **Keys**: Create a new Key.
   - Enable "Sign In with Apple".
   - Download the `.p8` Key file (Store this safely! You cannot download it again).
   - Note the **Key ID**.
5. Note your **Team ID** (top right of portal).

### Step B: Secret Generation (The Tricky Part)
Supabase needs a `Client Secret`, but Apple gives you a `.p8` file. You must generate a JWT from this file.
*Fortunately, Supabase handles this if you provide the raw key details, OR you can generate the secret yourself.*

**Supabase Dashboard Method:**
1. Go to **Authentication > Providers**.
2. Select **Apple**.
3. Toggle "Enable Sign in with Apple".
4. Enter:
   - **Client ID**: The Service ID you created (e.g., `com.example.app.service`).
   - **Team ID**.
   - **Key ID**.
   - **Private Key**: Paste the contents of the `.p8` file.
5. Click **Save**.

---

## 4. Redirect Allow List (Critical)

Changes to `LevelCompleteScreen.tsx` set the redirect to `${window.location.origin}/auth/callback`.

1. Go to Supabase Dashboard > **Authentication > URL Configuration**.
2. Ensure your **Site URL** is set correctly (e.g., `http://localhost:3000` for dev, or your production URL).
3. Under **Redirect URLs**, add:
   - `http://localhost:3000/**`
   - `https://<your-production-domain>.com/**`
4. Click **Save**.

Without this, Supabase will block the redirect after login!
