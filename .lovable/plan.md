

## Plan: Email Confirmation Status in Admin UI

### Problem
Admin pages (Patients, UserManagement) don't show whether a user's email is confirmed. Need to display confirmation status with a badge/icon, and allow resending confirmation emails.

### Key Challenge
`email_confirmed_at` lives in `auth.users` (not accessible from client SDK). Need a server-side solution to expose this data.

### Approach

**1. Create a database function (SECURITY DEFINER) to get email confirmation status**

A function `get_users_email_confirmed` that accepts an array of user IDs, queries `auth.users` for `email_confirmed_at`, and returns the results. Only accessible to staff/superadmins.

```sql
CREATE OR REPLACE FUNCTION public.get_users_email_confirmed(user_ids uuid[])
RETURNS TABLE(user_id uuid, email_confirmed_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT au.id, au.email_confirmed_at
  FROM auth.users au
  WHERE au.id = ANY(user_ids)
$$;
```

**2. Create an edge function `resend-confirmation` to resend confirmation email**

- Accepts `{ email }` in body
- Uses `supabaseAdmin.auth.resend({ type: 'signup', email })` to resend the confirmation
- Checks caller is superadmin/admin

**3. Create `EmailConfirmationBadge` component**

- If confirmed: small green checkmark icon (CheckCircle) next to email, with tooltip "Email подтвержден"
- If not confirmed: orange "Не подтверждён" badge, clickable
- On click: opens dialog with:
  - Current email display
  - Input to change email (optional)
  - "Отправить повторно" button that calls the edge function
  - Brief instructions

**4. Update Patients page (`src/pages/admin/Patients.tsx`)**

- After fetching patients, call `get_users_email_confirmed` RPC with all patient IDs
- Pass confirmation status to email column
- Show `EmailConfirmationBadge` next to email

**5. Update UserManagement page (`src/pages/admin/UserManagement.tsx`)**

- Same approach for active users (not pending)
- Add email column to the table if not present, or show badge next to user name

### Files to Create/Modify

| File | Action |
|------|--------|
| Migration SQL | Create `get_users_email_confirmed` function |
| `supabase/functions/resend-confirmation/index.ts` | New edge function |
| `src/components/admin/EmailConfirmationBadge.tsx` | New component (badge + dialog) |
| `src/pages/admin/Patients.tsx` | Fetch confirmation status, show badge in email column |
| `src/pages/admin/UserManagement.tsx` | Add email column with confirmation badge |

