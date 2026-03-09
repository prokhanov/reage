import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { email, newEmail } = await req.json();
    if (!email && !newEmail) {
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if admin or acting on own email
    const { data: roles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const isAdmin = roles?.some(r => r.role === 'superadmin' || r.role === 'admin');
    const isOwnEmail = user.email === email;

    if (!isAdmin && !isOwnEmail) {
      return new Response(JSON.stringify({ error: 'Forbidden: can only resend for your own email' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If user wants to change their email before confirmation
    if (newEmail && newEmail !== email) {
      if (!isOwnEmail && !isAdmin) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (isOwnEmail) {
        // Update own email via admin API
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
          email: newEmail,
        });
        if (updateError) {
          return new Response(JSON.stringify({ error: updateError.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Also update profile email and reset verification
        await supabaseAdmin.from('profiles').update({ email: newEmail, email_verified: false }).eq('id', user.id);
      }

      // Generate signup confirmation link for the new email
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'signup',
        email: newEmail,
      });

      if (linkError) {
        // Fallback: try resend
        const { error: resendError } = await supabaseAdmin.auth.resend({
          type: 'signup',
          email: newEmail,
        });
        if (resendError) {
          return new Response(JSON.stringify({ error: resendError.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      return new Response(JSON.stringify({ success: true, emailChanged: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Simple resend - try resend first, fallback to generateLink
    const { error: resendError } = await supabaseAdmin.auth.resend({
      type: 'signup',
      email: email,
    });

    if (resendError) {
      // With auto-confirm, resend may fail. Try generating a new magic link instead
      const { error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: email,
      });
      if (linkError) {
        return new Response(JSON.stringify({ error: `Could not send confirmation: ${resendError.message}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
