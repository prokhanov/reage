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

    switch (type) {
      case 'signup': {
        // Signup = send OTP signup email
        const { error } = await supabaseAdmin.auth.admin.generateLink({
          type: 'signup',
          email,
          options: { redirectTo: redirectUrl },
        });
        sendError = error;
        break;
      }
      case 'recovery': {
        const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
          redirectTo: redirectUrl,
        });
        sendError = error;
        break;
      }
      case 'magiclink': {
        const { error } = await supabaseAdmin.auth.signInWithOtp({
          email,
          options: { shouldCreateUser: false },
        });
        sendError = error;
        break;
      }
      case 'invite': {
        const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
          redirectTo: redirectUrl,
        });
        sendError = error;
        break;
      }
      case 'email_change':
      case 'reauthentication': {
        // These can't be triggered externally easily, fall back to recovery
        const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
          redirectTo: redirectUrl,
        });
        sendError = error;
        break;
      }
      default: {
        const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
          redirectTo: redirectUrl,
        });
        sendError = error;
      }
    }

    if (sendError) {
      console.error('Error sending test email:', sendError);
      return new Response(JSON.stringify({ error: sendError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Test email (${type}) sent to: ${email}`);

    return new Response(
      JSON.stringify({ success: true, message: `Test email (${type}) sent to ${email}` }),
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
