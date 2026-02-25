

## Problem Analysis

Two issues prevent the medical history list from loading on registration step 3:

**Issue 1: RLS blocking categories for unauthenticated users**
The `medical_condition_categories` API call returns `[]` (empty array) because the user is not authenticated during registration. The table likely lacks a public SELECT policy. The `medical_conditions_templates` table works fine because it has an "Anyone can view" policy with `USING (true)`.

**Issue 2: Category name mismatch**
Even if categories loaded, the names don't match between the two tables:
- `medical_condition_categories`: "🧠 Неврология", "🍽️ ЖКТ", "🦴 Опорно-двигательная"
- `medical_conditions_templates.category`: "🧠 Нервная система", "🍽 Пищеварительная система", "💪 Опорно-двигательная система"

The grouping logic (`c.category === cat.name`) fails because these names are completely different.

## Solution

Simplify `RegisterStep3.tsx` to skip the `medical_condition_categories` table entirely and derive categories directly from the `medical_conditions_templates` data, which already contains category names with emojis and is publicly readable.

### Changes to `src/components/register/RegisterStep3.tsx`

1. **Remove** the query to `medical_condition_categories`
2. **Group templates by their `category` field** to build the category list dynamically
3. Extract unique categories from the templates data, preserving order
4. The emoji is already embedded in the category name (e.g., "🫀 Сердечно-сосудистая система"), so the `getCategoryEmoji` helper becomes unnecessary for display

### Technical Detail

Instead of:
```text
1. Fetch categories table → [] (blocked by RLS)
2. Fetch templates table → [conditions...]
3. Group conditions by matching category name → nothing matches
```

The fix does:
```text
1. Fetch templates table → [conditions...]
2. Extract unique categories from conditions
3. Group conditions by their own category field → works correctly
```

No database changes needed. Single file change in `RegisterStep3.tsx`.

