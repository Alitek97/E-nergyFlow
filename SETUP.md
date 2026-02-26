# Supabase Environment Setup (Expo + EAS)

## Local development (Expo Go)
1. Copy `.env.example` to `.env`.
2. Fill in:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
3. Restart Expo after any env change:
   - `npx expo start -c --go`

Notes:
- `.env` is ignored by git and must never be committed.
- If `.env` is missing, the app still opens with Supabase disabled.

## EAS builds (preview/production)
`eas.json` already references:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

Set them as EAS secrets (do not store real values in git):

```bash
eas secret:create --name EXPO_PUBLIC_SUPABASE_URL --value "https://..."
eas secret:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "..."
```

These secrets are injected during EAS builds, so builds work even when local `.env` is absent.
