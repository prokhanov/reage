import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const enumRoles = new Set(["superadmin", "admin", "doctor", "patient", "user"]);
const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const inviteToken = asString(body.inviteToken);
    const email = asString(body.email).toLowerCase();
    const password = asString(body.password);
    const firstName = asString(body.firstName);
    const lastName = asString(body.lastName);

    if (!uuidRe.test(inviteToken)) return json({ error: 'Некорректный токен приглашения' }, 400);
    if (!emailRe.test(email)) return json({ error: 'Некорректный email' }, 400);
    if (password.length < 6) return json({ error: 'Пароль должен содержать минимум 6 символов' }, 400);
    if (!firstName) return json({ error: 'Укажите имя' }, 400);
    if (firstName.length > 100) return json({ error: 'Имя слишком длинное' }, 400);
    if (!lastName) return json({ error: 'Укажите фамилию' }, 400);
    if (lastName.length > 100) return json({ error: 'Фамилия слишком длинная' }, 400);

    console.log('Starting staff registration for:', email);

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

    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('invite_tokens')
      .select('*')
      .eq('token', inviteToken)
      .maybeSingle();

    if (tokenError || !tokenData) {
      console.error('Invalid invite token:', tokenError);
      return json({ error: 'Недействительный токен приглашения' }, 400);
    }

    if (tokenData.used_by) {
      console.error('Token already used');
      return json({ error: 'Приглашение уже использовано' }, 400);
    }

    if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
      console.error('Token expired');
      return json({ error: 'Срок действия приглашения истёк' }, 400);
    }

    if (tokenData.invited_email && tokenData.invited_email.toLowerCase() !== email) {
      console.error('Email mismatch:', email, 'vs', tokenData.invited_email);
      return json({ error: 'Email не совпадает с приглашением' }, 400);
    }

    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const emailExists = existingUsers?.users.some(u => (u.email ?? '').toLowerCase() === email);
    
    if (emailExists) {
      console.error('Email already exists:', email);
      return json({ error: 'Пользователь с таким email уже существует' }, 400);
    }

    const metadata = tokenData.metadata && typeof tokenData.metadata === 'object' ? tokenData.metadata : {};
    const gender = ['male', 'female', 'other'].includes(metadata.gender) ? metadata.gender : 'other';
    const birthDate = typeof metadata.birth_date === 'string' ? metadata.birth_date : null;

    console.log('Using metadata:', { gender, birthDate });

    const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      // НЕ ставим email_confirm=true — верификация должна проходить через нашу ссылку
      // (send-verification-email). Логин при этом не блокируется.
      email_confirm: false,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        birth_date: birthDate,
        gender,
        staff_invite: true,
        is_staff: true,
      }
    });

    if (createUserError || !newUser.user) {
      console.error('Error creating user:', createUserError);
      return json({ error: createUserError?.message || 'Не удалось создать пользователя' }, 500);
    }

    const userId = newUser.user.id;
    console.log('User created:', userId);

    const profilePayload = {
      name: `${firstName} ${lastName}`.trim(),
      first_name: firstName,
      last_name: lastName,
      email,
      birth_date: birthDate,
      gender,
      email_verified: true,
    };

    // auth.users trigger may have already created profiles row synchronously.
    // Updating first avoids profiles_pkey duplicate errors even if DB migration
    // with staff guard has not been applied yet on the target infrastructure.
    const { data: updatedProfile, error: profileUpdateError } = await supabaseAdmin
      .from('profiles')
      .update(profilePayload)
      .eq('id', userId)
      .select('id')
      .maybeSingle();

    let profileError = profileUpdateError;

    if (!profileUpdateError && !updatedProfile) {
      const { error: profileInsertError } = await supabaseAdmin
        .from('profiles')
        .insert({ id: userId, ...profilePayload });

      if (profileInsertError?.code === '23505') {
        const { error: retryUpdateError } = await supabaseAdmin
          .from('profiles')
          .update(profilePayload)
          .eq('id', userId);
        profileError = retryUpdateError;
      } else {
        profileError = profileInsertError;
      }
    }

    if (profileError) {
      console.error('Error upserting profile:', profileError);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return json({ error: 'Ошибка создания профиля: ' + profileError.message }, 500);
    }

    console.log('Profile upserted');

    const { error: cleanupSubscriptionError } = await supabaseAdmin
      .from('subscriptions')
      .delete()
      .eq('user_id', userId)
      .eq('status', 'pending')
      .eq('plan_type', 'none')
      .eq('amount', 0);

    if (cleanupSubscriptionError) {
      console.warn('Failed to remove auto pending subscription for staff:', cleanupSubscriptionError);
    }

    const roles = Array.isArray(metadata.roles) && metadata.roles.length > 0 ? metadata.roles : [tokenData.role];
    console.log('Roles to assign:', roles);

    const { data: customRoles, error: rolesError } = await supabaseAdmin
      .from('custom_roles')
      .select('id, name')
      .in('name', roles);

    if (rolesError) {
      console.error('Failed to fetch custom roles:', rolesError);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return json({ error: 'Ошибка получения ролей' }, 500);
    }

    if (!customRoles || customRoles.length === 0) {
      console.error('No custom roles found for:', roles);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return json({ error: 'Роли не найдены' }, 500);
    }

    const primaryRole = customRoles[0];
    if (customRoles.length > 1) {
      console.warn('Multiple custom roles provided. Using the first one:', customRoles.map(r => r.name).join(', '));
    }

    const baseRole = enumRoles.has(primaryRole.name) ? primaryRole.name : 'user';

    const { error: cleanupPatientRoleError } = await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('role', 'patient');

    if (cleanupPatientRoleError) {
      console.error('Failed to remove auto patient role:', cleanupPatientRoleError);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return json({ error: 'Ошибка настройки роли пользователя' }, 500);
    }

    const { error: userRolesError } = await supabaseAdmin
      .from('user_roles')
      .upsert(
        {
          user_id: userId,
          role: baseRole,
          role_id: primaryRole.id,
        },
        { onConflict: 'user_id,role' }
      );

    if (userRolesError) {
      console.error('Failed to assign roles:', userRolesError);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return json({ error: 'Ошибка назначения ролей: ' + userRolesError.message }, 500);
    }

    console.log('Role assigned successfully:', (primaryRole?.name ?? 'unknown'));

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

    return json({ 
        success: true,
        message: 'Регистрация прошла успешно'
      });

  } catch (error) {
    console.error('Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    return json({ error: 'Внутренняя ошибка сервера: ' + errorMessage }, 500);
  }
});
