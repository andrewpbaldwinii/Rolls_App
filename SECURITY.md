# Security checklist (Rolls)

## Already in the app

- **Supabase client keys** live in `.env` (gitignored), not in source. Rebuild after changing `.env`.
- **Release builds** strip `console.log` / `console.info` / `console.debug` via Babel; `console.error` and `console.warn` remain for diagnostics.
- **npm** `overrides` pin a patched `fast-xml-parser` for the React Native CLI dependency chain.

## Do before production

1. **Row Level Security** — Every Supabase table exposed to the client must have RLS enabled and policies that match what users are allowed to read/write. Never ship with open tables.
2. **Never use the service role key** in the mobile app; only anon / publishable keys belong in the client.
3. **Rotate keys** if `.env` or old commits ever leaked (GitHub public, shared zip, etc.). Update `.env` and rebuild.
4. **App Store privacy** — Accuracy of data collection / camera / photo disclosures in App Store Connect and `PrivacyInfo.xcprivacy`.
5. **Dependencies** — Periodically `npm audit` and upgrade React Native / CLI when stable releases include transitive fixes.

## CI / teammates

- Store secrets as **CI variables** or **EAS / Xcode Cloud secrets**, and generate `.env` (or inject env at build time) in the pipeline—do not commit `.env`.
