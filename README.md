# Rolls_App

Rolls — The Disposable Camera App

A social photo app inspired by the experience of disposable cameras. Users create collaborative photo rolls, invite friends to contribute, and experience photos in a more intentional way than traditional social media.

## Setup

1. **Node** 20+ (`node -v`).
2. **Environment** — Copy `.env.example` to `.env` and set `SUPABASE_URL` and `SUPABASE_ANON_KEY` from the Supabase dashboard (Project Settings → API). `.env` is gitignored.
3. **Install** — `npm install`
4. **Run** — `npm start` and `npm run ios` / `npm run android`

### Android emulator (Pixel 8)

- Start the **Pixel_8** AVD: `npm run android:emulator` (uses software GPU flags that are stable on many Macs).
- Install on **that** emulator when several are running: `npm run android:pixel8`
- Other AVD: `npm run android:emulator -- Medium_Phone_API_36.1`
