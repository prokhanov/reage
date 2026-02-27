

## Problem

The dashboard doesn't show biological age data for regular patients because `fetchAnalysesStats` (line 89) checks `if (!viewAsUserId) return;` — but `viewAsUserId` is `null` for regular patients (it's only set in admin "View As Patient" mode). The function exits early without fetching any analysis data.

Other functions like `fetchProfile` and `fetchBodyHeatmapData` work correctly because they use `getUserId()` which falls back to `auth.uid()`.

## Fix

In `src/pages/Dashboard.tsx`, change `fetchAnalysesStats` to use `getUserId()` instead of `viewAsUserId` directly:

1. Replace `if (!viewAsUserId) return;` with:
   ```typescript
   const userId = await getUserId();
   if (!userId) return;
   ```

2. Replace all `viewAsUserId` references inside `fetchAnalysesStats` with `userId` (lines 96, 104, 113).

3. Update the `useEffect` dependency — currently `fetchAnalysesStats` is called when `profile` changes (line 70), which is correct. No dependency change needed.

This is a one-file, ~5-line fix that aligns `fetchAnalysesStats` with the pattern used by every other fetch function in this component.

