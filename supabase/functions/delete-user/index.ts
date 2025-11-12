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
    // Verify JWT token and check if user is superadmin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create admin client for permission check
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

    // Check if user is superadmin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'superadmin')
      .single();

    if (roleError || !roleData) {
      console.error('Not a superadmin:', user.id);
      return new Response(
        JSON.stringify({ error: 'Forbidden: Only superadmins can delete users' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { userId, email } = await req.json();

    if (!userId && !email) {
      console.error('Missing userId or email parameter');
      return new Response(
        JSON.stringify({ error: 'userId or email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Deleting user by:', userId ? `userId: ${userId}` : `email: ${email}`);

    let userIdToDelete = userId;
    let emailToClean = email;

    // If email provided, find the user ID
    if (!userIdToDelete && email) {
      console.log('Looking up user by email:', email);
      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      
      if (listError) {
        console.error('Failed to list users:', listError);
        return new Response(
          JSON.stringify({ error: 'Failed to lookup user by email' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const user = users.find(u => u.email === email);
      if (!user) {
        console.log('User not found by email:', email);
        return new Response(
          JSON.stringify({ error: 'User not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      userIdToDelete = user.id;
      emailToClean = user.email;
      console.log('Found user:', userIdToDelete);
    }

    // Step 1: Delete invite tokens associated with this user (by used_by and invited_email)
    console.log('Cleaning invite tokens...');
    
    const deletePromises = [];
    
    if (userIdToDelete) {
      deletePromises.push(
        supabaseAdmin.from('invite_tokens').delete().eq('used_by', userIdToDelete)
      );
    }
    
    if (emailToClean) {
      deletePromises.push(
        supabaseAdmin.from('invite_tokens').delete().eq('invited_email', emailToClean)
      );
    }

    const results = await Promise.allSettled(deletePromises);
    results.forEach((result, idx) => {
      if (result.status === 'rejected' || (result.status === 'fulfilled' && result.value.error)) {
        console.warn(`Failed to delete invite tokens (${idx}):`, result.status === 'fulfilled' ? result.value.error : result.reason);
      } else {
        console.log(`Successfully deleted invite tokens (${idx})`);
      }
    });

    // Step 2: Delete the user from auth.users using Admin API
    console.log('Deleting user from auth.users:', userIdToDelete);
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userIdToDelete);

    if (authError) {
      console.error('Failed to delete auth user:', authError);
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Successfully deleted user from auth.users');

    // Note: profiles and related data will be deleted automatically via CASCADE
    // if foreign keys are set up correctly, or via RLS triggers

    return new Response(
      JSON.stringify({ success: true, message: 'User deleted successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in delete-user function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
