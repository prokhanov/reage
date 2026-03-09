

## Plan: Email Template Editor in Admin Settings

### Approach
Store editable template fields (subject, heading, body text, button label, footer) in a database table. The EmailSettings page gets a tabbed UI for editing each template. The `auth-email-hook` edge function reads from the DB at send time, falling back to defaults if no custom content exists.

### Step 1 — Create `email_templates` database table

```sql
CREATE TABLE public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_type TEXT NOT NULL UNIQUE, -- signup, recovery, magiclink, invite, email_change, reauthentication
  subject TEXT NOT NULL,
  heading TEXT NOT NULL,
  body_text TEXT NOT NULL,
  button_label TEXT,
  footer_text TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Only superadmins can read/write
CREATE POLICY "Superadmins manage email templates"
  ON public.email_templates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

-- Edge function reads via service role, no RLS needed for that
```

Seed with default values matching current template content (all 6 types).

### Step 2 — Build template editor UI

Refactor `EmailSettings.tsx`:
- Add **Tabs** component with 6 tabs: Регистрация, Восстановление пароля, Magic Link, Приглашение, Смена email, Повторная авторизация
- Each tab shows a form with editable fields: Тема письма, Заголовок, Текст, Текст кнопки, Подпись
- "Сохранить" button per template that upserts to `email_templates`
- Loading skeleton while fetching
- Keep existing Status and Test Email cards at the top

### Step 3 — Update `auth-email-hook` to use DB content

Modify the edge function to:
1. Fetch the template row from `email_templates` by `template_type` using the service role client
2. If found, pass the custom fields to a modified template component
3. If not found, use hardcoded defaults (current behavior)
4. Use `subject` from DB instead of hardcoded `EMAIL_SUBJECTS`

### Step 4 — Redeploy edge function

Deploy updated `auth-email-hook`.

### File changes
- **New migration**: Create `email_templates` table + seed defaults
- **Edit** `src/pages/admin/EmailSettings.tsx`: Add tabs with template editor forms
- **Edit** `supabase/functions/auth-email-hook/index.ts`: Read from DB, use custom content
- **Edit** each template in `_shared/email-templates/*.tsx`: Accept optional content overrides as props

