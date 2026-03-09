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

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = user.id;
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

    // Step 1: Write desired template type to override table
    // This tells auth-email-hook to render THIS template regardless of actual auth event type
    await supabaseAdmin
      .from('test_email_overrides')
      .upsert({ email, template_type: type }, { onConflict: 'email' });

    // Step 2: Always trigger recovery — it works for any existing user
    // The auth-email-hook will check test_email_overrides and render the correct template
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, { redirectTo: redirectUrl });
    if (error) {
      // Clean up override on failure
      await supabaseAdmin.from('test_email_overrides').delete().eq('email', email);
      throw error;
    }

    const tabLabels: Record<string, string> = {
      signup: 'Регистрация',
      recovery: 'Восстановление',
      magiclink: 'Magic Link',
      invite: 'Приглашение',
      email_change: 'Смена email',
      reauthentication: 'Код подтверждения',
    };

    console.log(`Test email (${type}) sent to: ${email}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Тестовое письмо «${tabLabels[type] || type}» отправлено на ${email}`,
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
