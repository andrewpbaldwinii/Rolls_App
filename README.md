# Rolls_App

## Setup

1. **Node** 20+ (`node -v`).
2. **Environment** — Copy `.env.example` to `.env` and set `SUPABASE_URL` and `SUPABASE_ANON_KEY` from the Supabase dashboard (Project Settings → API). `.env` is gitignored.
3. **Install** — `npm install`
4. **Run** — `npm start` and `npm run ios` / `npm run android`

### Android emulator (Pixel 8)

- Start the **Pixel_8** AVD: `npm run android:emulator` (uses software GPU flags that are stable on many Macs).
- Install on **that** emulator when several are running: `npm run android:pixel8`
- Other AVD: `npm run android:emulator -- Medium_Phone_API_36.1`

See `SECURITY.md` for a short pre-production security checklist.

**Supabase:** Run `USERNAME_AVAILABILITY_RPC.sql` once so username checks use a secure RPC and a unique index (see `DATABASE_OVERVIEW.md`).

**Password reset:** Add `rollsapp://reset-password` under Auth → URL Configuration → Redirect URLs (see `PASSWORD_RESET_DEEP_LINK.md`).
