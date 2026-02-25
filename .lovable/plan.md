

## Problem

During registration, weight and height are saved to the `profiles` table (lines 132-133 of Register.tsx). However, the dashboard's `WeightTracker` component reads the current weight exclusively from the `weight_history` table. Since no record is inserted into `weight_history` during registration, the "Текущий вес" card shows "—".

Additionally, `WeightTracker` reads height from `profiles.height` (which works), but weight from `weight_history` (which is empty).

## Solution

Two changes to `src/pages/Register.tsx` in `handleFinalSubmit`:

1. **Insert initial weight into `weight_history`** after creating the profile (around line 136), so the dashboard picks it up immediately:

```typescript
// After profile creation, insert weight into weight_history
if (formData.weight) {
  await supabase
    .from('weight_history')
    .insert({
      user_id: authData.user.id,
      weight: parseFloat(formData.weight)
    });
}
```

2. Also make `WeightTracker` **fall back to `profiles.weight`** when `weight_history` is empty, so it shows the weight even if the history insert somehow fails:

In `WeightTracker.tsx`, after fetching weight history, if no records exist, fetch and display `profiles.weight` as the current weight.

## Files to Change

- `src/pages/Register.tsx` -- add `weight_history` insert after profile creation
- `src/components/WeightTracker.tsx` -- add fallback to `profiles.weight` when history is empty

