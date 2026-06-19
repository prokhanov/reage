import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.79.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Только супер-админ может удалять пользователей
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
      return new Response(
        JSON.stringify({ error: 'userId or email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let userIdToDelete: string | undefined = userId;

    // Поиск по email (включая «осиротевших» — без profile)
    if (!userIdToDelete && email) {
      console.log('Looking up user by email:', email);
      let page = 1;
      let found: { id: string; email?: string } | undefined;
      // Просматриваем все страницы пользователей
      while (!found) {
        const { data, error: listError } = await supabaseAdmin.auth.admin.listUsers({
          page,
          perPage: 1000,
        });
        if (listError) {
          console.error('Failed to list users:', listError);
          return new Response(
            JSON.stringify({ error: 'Failed to lookup user by email' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        found = data.users.find((u) => (u.email ?? '').toLowerCase() === email.toLowerCase());
        if (found || data.users.length < 1000) break;
        page += 1;
      }
      if (!found) {
        return new Response(
          JSON.stringify({ error: 'User not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      userIdToDelete = found.id;
    }

    // invite_tokens привязан к email (а не только к used_by) — чистим вручную,
    // чтобы освободить приглашения для повторной регистрации.
    if (email) {
      const { error: inviteError } = await supabaseAdmin
        .from('invite_tokens')
        .delete()
        .eq('invited_email', email);
      if (inviteError) {
        console.warn('Failed to clean invite_tokens by email:', inviteError);
      }
    }

    // Удаляем пользователя из auth.users.
    // Все связанные данные (profiles, analyses, prescriptions, recommendations,
    // chat_conversations, risk_zone_analyses, prescription_adherence,
    // medical_history, complaints, user_symptoms, subscriptions,
    // subscription_history, analysis_bookings, task_completions, weight_history,
    // user_roles, health_strategy_snapshots, patient_interactions, report_jobs,
    // email_drip_schedule, email_unsubscribes, payment_orders,
    // promo_code_redemptions, admin_permissions, confirmation_reminder_log,
    // reminder_stop_list) удалятся каскадом через FK ON DELETE CASCADE.
    console.log('Deleting user from auth.users:', userIdToDelete);
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userIdToDelete!);

    if (authError) {
      console.error('Failed to delete auth user:', authError);
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
