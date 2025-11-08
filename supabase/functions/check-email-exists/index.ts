import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.79.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    if (!email) {
      console.error('Missing email parameter');
      return new Response(
        JSON.stringify({ error: 'email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Checking email:', email);

    // Create admin client with service_role_key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Check 1: Search in auth.users (active users)
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();

    if (authError) {
      console.error('Failed to list auth users:', authError);
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const existingAuthUser = authUsers.users.find(
      user => user.email?.toLowerCase() === email.toLowerCase()
    );

    if (existingAuthUser) {
      console.log('Email found in auth.users:', existingAuthUser.id);
      return new Response(
        JSON.stringify({ 
          exists: true, 
          type: 'active',
          message: 'Этот email уже используется активным пользователем'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check 2: Search in invite_tokens (pending invitations)
    const { data: invites, error: inviteError } = await supabaseAdmin
      .from('invite_tokens')
      .select('id, invited_email, used_by')
      .ilike('invited_email', email)
      .is('used_by', null);

    if (inviteError) {
      console.error('Failed to check invite tokens:', inviteError);
      return new Response(
        JSON.stringify({ error: inviteError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (invites && invites.length > 0) {
      console.log('Email found in pending invites:', invites[0].id);
      return new Response(
        JSON.stringify({ 
          exists: true, 
          type: 'pending',
          message: 'На этот email уже отправлено приглашение'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Email is available
    console.log('Email is available');
    return new Response(
      JSON.stringify({ exists: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in check-email-exists function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
