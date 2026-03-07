

## Problem

The new category "Почки и водно-солевой баланс" (Kidneys & Water-Salt Balance) was added to the database but is **not integrated** into the codebase. There are two critical places with hardcoded `CATEGORY_KEY_MAP` that only know 5 categories:

1. **`src/lib/categoryKeyMap.ts`** (line 1-7) — used by AI Settings page to find prompt keys
2. **`supabase/functions/analyze-biomarkers/index.ts`** (lines 66-72) — used during report generation to look up prompts

When `getCategoryKey("Почки и водно-солевой баланс")` is called, it falls back to `почки_и_водно-солевой_баланс` (via `.toLowerCase().replace(/\s+/g, '_')`). But the hyphen makes an ugly key, and the edge function uses a **direct map lookup** (line 542) that returns `undefined`, causing prompt keys `category_undefined_user` / `category_undefined_system`.

### Impact
- **AI Settings page**: Can't find/edit prompts for this category (keys mismatch)
- **Report generation**: Category biomarkers are silently skipped ("No specialization" warning) or use fallback prompts with wrong keys
- **Everything else** (dashboard, analysis detail, biomarker selector, risk zones) loads categories dynamically from DB — those are fine

## Plan

### 1. Add "Почки и водно-солевой баланс" to both `CATEGORY_KEY_MAP` instances

**`src/lib/categoryKeyMap.ts`** — Add entry:
```ts
"Почки и водно-солевой баланс": "kidneys"
```

**`supabase/functions/analyze-biomarkers/index.ts`** (line 66-72) — Add same entry to the hardcoded map, plus add a **fallback** so unknown future categories don't silently break:
```ts
"Почки и водно-солевой баланс": "kidneys"
```

Also fix line 542 to use a fallback like the frontend does:
```ts
const categoryKey = CATEGORY_KEY_MAP[category] || category.toLowerCase().replace(/\s+/g, '_');
```

### 2. Create AI prompt templates for the new category

**Database migration**: Insert `category_kidneys_system` and `category_kidneys_user` prompts into `ai_prompt_settings`, matching the pattern of existing categories.

### 3. Update `validate_recommendation_type` trigger

The DB function `validate_recommendation_type` dynamically reads from `biomarker_categories`, so it already handles the new category — no change needed.

### Summary of files changed
- `src/lib/categoryKeyMap.ts` — add 1 line
- `supabase/functions/analyze-biomarkers/index.ts` — add 1 line to map + add fallback on line 542
- New migration — insert 2 prompt rows for `category_kidneys_system` and `category_kidneys_user`

