

## Fix: Cyrillic Encoding in Email Button Text

### Problem
The `Button` component from `@react-email/components@0.0.22` generates VML markup for Outlook compatibility. The VML `<a>` tag inside the button doesn't handle multi-byte (Cyrillic) characters correctly, resulting in broken characters like "Подтвердит�� email".

The `<Head />` component renders empty without a `<meta charset>` tag, so email clients may misinterpret the encoding.

### Fix

**All 6 email templates** need two changes:

1. **Add explicit `<meta charSet="utf-8" />` inside `<Head>`** to ensure email clients interpret the HTML as UTF-8:
   ```tsx
   <Head>
     <meta charSet="utf-8" />
   </Head>
   ```

2. After applying, **redeploy** the `auth-email-hook` edge function.

### Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/_shared/email-templates/signup.tsx` | `<Head />` → `<Head><meta charSet="utf-8" /></Head>` |
| `supabase/functions/_shared/email-templates/recovery.tsx` | Same |
| `supabase/functions/_shared/email-templates/invite.tsx` | Same |
| `supabase/functions/_shared/email-templates/magic-link.tsx` | Same |
| `supabase/functions/_shared/email-templates/email-change.tsx` | Same |
| `supabase/functions/_shared/email-templates/reauthentication.tsx` | Same |

Then redeploy `auth-email-hook`.

