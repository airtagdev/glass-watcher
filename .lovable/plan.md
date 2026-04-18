
## Account Sync System

Add optional accounts so users can sync watchlist, pins, portfolio, alerts, and settings across devices, with a session list ("Authorized Devices") in Settings.

### Auth approach
- Email + password (via Lovable Cloud auth). Google sign-in optional.
- **Optional**: app stays fully usable in "guest mode" with local-only data. A "Sign In / Create Account" button in Settings prompts on startup the first time, but is dismissible.
- On first sign-in from a new device: ask user whether to **upload local data**, **download cloud data**, or **merge** (default: merge).

### Database schema (new tables, all RLS scoped to `auth.uid()`)

```text
profiles            id (uuid → auth.users), display_name, created_at
user_watchlist      user_id, ticker_id (PK pair), symbol, name, type, pinned (bool), sort_order
user_portfolio      id, user_id, ticker_id, symbol, name, type, trade_type, price, quantity, trade_date
user_settings       user_id (PK), settings (jsonb)
user_devices        id, user_id, device_id, device_name, user_agent, platform,
                    last_seen_at, created_at, current (computed client-side)
```
- `price_alerts`: add nullable `user_id` column; backfill via device_id on first sign-in; RLS updated to `user_id = auth.uid() OR device_id = current device`.
- Auto-create profile + register device row via DB trigger on signup, and an upsert on every app load.

### Sync hooks (rewrite of existing hooks)
- `useWatchlist`, `usePortfolio`, `useSettings`, `useAlerts`: become **dual-mode**.
  - Signed out → localStorage (current behavior).
  - Signed in → Supabase as source of truth, with localStorage as offline cache + optimistic updates.
  - Realtime subscription on each table so changes from another device reflect live.
- New `useAuth()` context provider wrapping the app (`src/contexts/AuthContext.tsx`) — exposes `user`, `session`, `signIn`, `signUp`, `signOut`.
- New `useDevices()` hook to list/revoke `user_devices` rows.

### Device tracking
- On every app load while signed in: upsert `user_devices` row keyed by `(user_id, device_id)` with `device_name` (auto-generated like "Chrome on macOS"; user can rename), `user_agent`, `last_seen_at = now()`.
- Revoking a device deletes its row and calls `supabase.auth.admin.signOut` via an edge function with service role (since client SDK can only sign out current session). Edge function `revoke-device` validates the requesting user owns the device row.

### UI changes
- **New page `/auth`**: sign in / sign up / forgot password. Linked from Settings.
- **`SettingsPage`**: new "Account" section at top → shows email + "Sign Out", or "Sign In to Sync" CTA. New "Authorized Devices" section listing all sessions with last-seen timestamp, current-device badge, and revoke button.
- **First-sign-in conflict modal**: choose Upload / Download / Merge.
- Existing export/import keeps working unchanged.

### Files to add
- `src/contexts/AuthContext.tsx`
- `src/pages/AuthPage.tsx`
- `src/pages/ResetPasswordPage.tsx`
- `src/hooks/useDevices.ts`
- `src/hooks/useCloudSync.ts` (orchestrates merge on first sign-in)
- `src/components/SyncConflictDialog.tsx`
- `supabase/functions/revoke-device/index.ts`

### Files to modify
- `src/App.tsx` — wrap in `AuthProvider`, add `/auth` + `/reset-password` routes
- `src/hooks/useWatchlist.ts`, `usePortfolio.ts`, `useSettings.ts`, `useAlerts.ts` — dual-mode + realtime
- `src/pages/SettingsPage.tsx` — Account + Authorized Devices sections
- `src/lib/dataExport.ts` — pull from cloud when signed in

### Quick clarifications
- **Stay signed in**: Supabase persists sessions via `localStorage` already (configured in `client.ts`) + auto-refresh — no extra work.
- **Email confirmation**: enabled by default; users will get a verification email before they can sign in (per security guidelines).
- **No Google sign-in** unless you want it added.
