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

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
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

    let sendError: any = null;
    let actualType = type;

    // Each type triggers the matching auth action so auth-email-hook 
    // receives the correct event type and renders the right template
    switch (type) {
      case 'signup': {
        const { error } = await supabaseAdmin.auth.admin.generateLink({
          type: 'signup',
          email,
          options: { redirectTo: redirectUrl },
        });
        if (error) {
          // For existing users, signup link can't be generated.
          // Use magiclink as closest alternative (also a "login" flow)
          const { error: mlError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'magiclink',
            email,
          });
          sendError = mlError;
          actualType = 'magiclink';
        }
        break;
      }

      case 'recovery': {
        const { error } = await supabaseAdmin.auth.admin.generateLink({
          type: 'recovery',
          email,
          options: { redirectTo: redirectUrl },
        });
        sendError = error;
        break;
      }

      case 'magiclink': {
        const { error } = await supabaseAdmin.auth.admin.generateLink({
          type: 'magiclink',
          email,
        });
        sendError = error;
        break;
      }

      case 'invite': {
        const { error } = await supabaseAdmin.auth.admin.generateLink({
          type: 'invite',
          email,
          options: { redirectTo: redirectUrl },
        });
        if (error) {
          // Existing user can't be re-invited, use magiclink
          const { error: mlError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'magiclink',
            email,
          });
          sendError = mlError;
          actualType = 'magiclink';
        }
        break;
      }

      case 'email_change': {
        // email_change can't be triggered externally, closest is recovery
        const { error } = await supabaseAdmin.auth.admin.generateLink({
          type: 'recovery',
          email,
          options: { redirectTo: redirectUrl },
        });
        sendError = error;
        actualType = 'recovery';
        break;
      }

      case 'reauthentication': {
        // reauthentication can't be triggered externally, closest is recovery
        const { error } = await supabaseAdmin.auth.admin.generateLink({
          type: 'recovery',
          email,
          options: { redirectTo: redirectUrl },
        });
        sendError = error;
        actualType = 'recovery';
        break;
      }

      default: {
        const { error } = await supabaseAdmin.auth.admin.generateLink({
          type: 'recovery',
          email,
          options: { redirectTo: redirectUrl },
        });
        sendError = error;
        actualType = 'recovery';
      }
    }

    if (sendError) {
      console.error('Error sending test email:', sendError);
      return new Response(JSON.stringify({ error: sendError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Test email (${type}) sent to: ${email}${actualType !== type ? ` (actual: ${actualType})` : ''}`);

    const warning = actualType !== type
      ? ` (отправлен как «${actualType}», т.к. «${type}» нельзя вызвать для этого пользователя)`
      : '';

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Тестовое письмо отправлено на ${email}${warning}`,
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
