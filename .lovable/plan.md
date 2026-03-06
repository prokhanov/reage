

## Problem

The prompt tab shows hardcoded `DEMO_SYSTEM_PROMPT` / `DEMO_USER_PROMPT` constants. The recent DB updates to `category_energy_system` / `category_energy_user` are not reflected because prompts are never fetched from the database. There is also no way to save edits.

## Plan

### Changes in `src/pages/admin/ReportVisualsTest.tsx`

1. **Load prompts from DB on mount**: In `loadData()`, fetch `category_energy_system` and `category_energy_user` from `ai_prompt_settings`. Use them to initialize `systemPrompt` and `userPrompt` state (fall back to hardcoded constants if not found).

2. **Add "Save" button to `PromptDemoTab`**: Add a Save button (with `Save` icon) next to each prompt card header (or one shared button at the top). On click, update the corresponding rows in `ai_prompt_settings` via `supabase.from('ai_prompt_settings').update({ prompt_text }).eq('key', ...)`. Show toast on success/error. Track saving state with a `saving` boolean.

3. **Remove or keep hardcoded constants as fallback only** -- the constants stay as defaults if DB fetch fails, but prompts are always loaded from DB first.

