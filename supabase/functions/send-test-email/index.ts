import * as React from 'npm:react@18.3.1';
import { renderAsync } from 'npm:@react-email/components@0.0.22';
import { sendLovableEmail } from 'npm:@lovable.dev/email-js';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.79.0';
import { SignupEmail } from '../_shared/email-templates/signup.tsx';
import { InviteEmail } from '../_shared/email-templates/invite.tsx';
import { MagicLinkEmail } from '../_shared/email-templates/magic-link.tsx';
import { RecoveryEmail } from '../_shared/email-templates/recovery.tsx';
import { EmailChangeEmail } from '../_shared/email-templates/email-change.tsx';
import { ReauthenticationEmail } from '../_shared/email-templates/reauthentication.tsx';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const EMAIL_TEMPLATES: Record<string, React.ComponentType<any>> = {
  signup: SignupEmail,
  invite: InviteEmail,
  magiclink: MagicLinkEmail,
  recovery: RecoveryEmail,
  email_change: EmailChangeEmail,
  reauthentication: ReauthenticationEmail,
};

const DEFAULT_SUBJECTS: Record<string, string> = {
  signup: 'Подтвердите ваш email',
  invite: 'Вас пригласили в ReAge',
  magiclink: 'Ссылка для входа в ReAge',
  recovery: 'Сброс пароля ReAge',
  email_change: 'Подтвердите смену email в ReAge',
  reauthentication: 'Ваш код подтверждения ReAge',
};

const SITE_NAME = 'reage';
const ROOT_DOMAIN = 'reage.life';
const SENDER_DOMAIN = 'notify.reage.life';
const SAMPLE_URL = 'https://reage.lovable.app/auth';

// Map template_type to generateLink type
const LINK_TYPE_MAP: Record<string, string> = {
  signup: 'signup',
  recovery: 'recovery',
  magiclink: 'magiclink',
  invite: 'invite',
  email_change: 'email_change',
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
    const EmailTemplate = EMAIL_TEMPLATES[type];
    if (!EmailTemplate) {
      return new Response(JSON.stringify({ error: `Unknown template type: ${type}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch custom template content and sender settings from DB
    const [templateData, senderData] = await Promise.all([
      supabaseAdmin
        .from('email_templates')
        .select('subject, heading, body_text, button_label, footer_text')
        .eq('template_type', type)
        .maybeSingle(),
      supabaseAdmin
        .from('email_sender_settings')
        .select('sender_name, sender_email, sender_domain')
        .limit(1)
        .maybeSingle(),
    ]);

    const dbTemplate = templateData.data;
    const senderSettings = senderData.data;

    const senderName = senderSettings?.sender_name || SITE_NAME;
    const senderEmail = senderSettings?.sender_email || 'noreply';
    const senderDomain = senderSettings?.sender_domain || SENDER_DOMAIN;

    const customProps: Record<string, string> = {};
    if (dbTemplate) {
      if (dbTemplate.heading) customProps.customHeading = dbTemplate.heading;
      if (dbTemplate.body_text) customProps.customBodyText = dbTemplate.body_text;
      if (dbTemplate.button_label) customProps.customButtonLabel = dbTemplate.button_label;
      if (dbTemplate.footer_text) customProps.customFooterText = dbTemplate.footer_text;
    }

    const emailSubject = dbTemplate?.subject || DEFAULT_SUBJECTS[type] || 'Тестовое письмо';

    // Build template props with sample data
    const templateProps: Record<string, any> = {
      siteName: SITE_NAME,
      siteUrl: `https://${ROOT_DOMAIN}`,
      recipient: email,
      confirmationUrl: SAMPLE_URL,
      token: '123456',
      email: email,
      newEmail: 'new-' + email,
      ...customProps,
    };

    // Render template
    const html = await renderAsync(React.createElement(EmailTemplate, templateProps));
    const text = await renderAsync(React.createElement(EmailTemplate, templateProps), { plainText: true });

    // Send via Lovable Email API
    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = await sendLovableEmail(
      {
        run_id: `test_${crypto.randomUUID()}`,
        to: email,
        from: `${senderName} <${senderEmail}@${senderDomain}>`,
        sender_domain: SENDER_DOMAIN,
        subject: `[Тест] ${emailSubject}`,
        html,
        text,
        purpose: 'transactional',
      },
      { apiKey }
    );

    const tabLabels: Record<string, string> = {
      signup: 'Регистрация',
      recovery: 'Восстановление',
      magiclink: 'Magic Link',
      invite: 'Приглашение',
      email_change: 'Смена email',
      reauthentication: 'Код подтверждения',
    };

    console.log(`Test email (${type}) sent directly to: ${email}`, { message_id: result.message_id });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Тестовое письмо «${tabLabels[type] || type}» отправлено на ${email}`,
        actual_type: type,
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
