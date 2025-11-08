import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { inviteToken, email, password, firstName, lastName } = await req.json();

    console.log('Starting staff registration for:', email);

    // Create Supabase Admin client with service role
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

    // 1. Validate invite token
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('invite_tokens')
      .select('*')
      .eq('token', inviteToken)
      .single();

    if (tokenError || !tokenData) {
      console.error('Invalid invite token:', tokenError);
      return new Response(
        JSON.stringify({ error: 'Недействительный токен приглашения' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (tokenData.used_by) {
      console.error('Token already used');
      return new Response(
        JSON.stringify({ error: 'Токен уже использован' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
      console.error('Token expired');
      return new Response(
        JSON.stringify({ error: 'Срок действия токена истек' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Check if email already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const emailExists = existingUsers?.users.some(u => u.email === email);
    
    if (emailExists) {
      console.error('Email already exists:', email);
      return new Response(
        JSON.stringify({ error: 'Пользователь с таким email уже существует' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Create user via Admin API
    const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
      }
    });

    if (createUserError || !newUser.user) {
      console.error('Error creating user:', createUserError);
      return new Response(
        JSON.stringify({ error: 'Ошибка создания пользователя: ' + createUserError?.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = newUser.user.id;
    console.log('User created:', userId);

    // 4. Insert profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: userId,
        name: `${firstName} ${lastName}`,
        birth_date: '1990-01-01', // Default value
        gender: 'не указан', // Default value
      });

    if (profileError) {
      console.error('Error creating profile:', profileError);
      // Rollback: delete user
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return new Response(
        JSON.stringify({ error: 'Ошибка создания профиля: ' + profileError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Profile created');

    // 5. Get custom role IDs from metadata
    const roles = tokenData.metadata?.roles || [tokenData.role];
    console.log('Roles to assign:', roles);

    // 6. Insert custom roles into user_roles
    for (const roleName of roles) {
      // First get the custom role ID
      const { data: customRole, error: roleError } = await supabaseAdmin
        .from('custom_roles')
        .select('id')
        .eq('name', roleName)
        .single();

      if (roleError || !customRole) {
        console.error(`Role ${roleName} not found:`, roleError);
        continue;
      }

      // Insert into user_roles with both role enum and role_id
      const { error: userRoleError } = await supabaseAdmin
        .from('user_roles')
        .insert({
          user_id: userId,
          role: roleName,
          role_id: customRole.id,
        });

      if (userRoleError) {
        console.error(`Error assigning role ${roleName}:`, userRoleError);
      } else {
        console.log(`Role ${roleName} assigned`);
      }
    }

    // 7. Update invite token as used
    const { error: updateTokenError } = await supabaseAdmin
      .from('invite_tokens')
      .update({
        used_by: userId,
        used_at: new Date().toISOString(),
      })
      .eq('id', tokenData.id);

    if (updateTokenError) {
      console.error('Error updating invite token:', updateTokenError);
    }

    console.log('Staff registration completed successfully');

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Регистрация прошла успешно'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    return new Response(
      JSON.stringify({ error: 'Внутренняя ошибка сервера: ' + errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
