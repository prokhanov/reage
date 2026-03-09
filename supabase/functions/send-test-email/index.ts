import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.79.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify caller identity
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = claimsData.claims.sub;
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Check superadmin
    const { data: roles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'superadmin');

    if (!roles || roles.length === 0) {
      return new Response(JSON.stringify({ error: 'Forbidden: superadmin only' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { email, template_type } = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const type = template_type || 'recovery';
    const redirectUrl = 'https://reage.lovable.app/auth';
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    let actualType = type;
    let warning = '';

    // Use actual email-sending Auth API endpoints (not generateLink which doesn't send)
    switch (type) {
      case 'signup': {
        // Try to sign up — this sends confirmation email for new users
        const res = await fetch(`${supabaseUrl}/auth/v1/signup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': serviceRoleKey,
            'Authorization': `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({ email, password: crypto.randomUUID() }),
        });
        const data = await res.json();
        
        if (!res.ok || data.code === 'user_already_exists' || data.code === 'email_exists') {
          // User exists — fall back to recovery
          const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, { redirectTo: redirectUrl });
          if (error) throw error;
          actualType = 'recovery';
          warning = 'Пользователь уже существует — отправлен шаблон «Восстановление пароля». Для теста регистрации используйте незарегистрированный email.';
        }
        break;
      }

      case 'recovery': {
        const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, { redirectTo: redirectUrl });
        if (error) throw error;
        break;
      }

      case 'magiclink': {
        const { error } = await supabaseAdmin.auth.signInWithOtp({ email });
        if (error) throw error;
        break;
      }

      case 'invite': {
        const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, { redirectTo: redirectUrl });
        if (error) {
          // User exists — fall back to recovery
          const { error: fallbackError } = await supabaseAdmin.auth.resetPasswordForEmail(email, { redirectTo: redirectUrl });
          if (fallbackError) throw fallbackError;
          actualType = 'recovery';
          warning = 'Пользователь уже существует — отправлен шаблон «Восстановление пароля». Для теста приглашения используйте незарегистрированный email.';
        }
        break;
      }

      case 'email_change':
      case 'reauthentication':
      default: {
        // These can't be triggered externally, use recovery
        const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, { redirectTo: redirectUrl });
        if (error) throw error;
        actualType = 'recovery';
        if (type !== 'recovery') {
          warning = `Тип «${type}» нельзя отправить тестово — отправлен шаблон «Восстановление пароля».`;
        }
      }
    }

    console.log(`Test email (${type}) sent to: ${email}${actualType !== type ? ` (actual: ${actualType})` : ''}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: warning || `Тестовое письмо «${type}» отправлено на ${email}`,
        actual_type: actualType,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-test-email:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
