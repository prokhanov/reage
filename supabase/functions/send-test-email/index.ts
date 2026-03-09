import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { sendLovableEmail } from 'npm:@lovable.dev/email-js'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { SignupEmail } from '../_shared/email-templates/signup.tsx'
import { InviteEmail } from '../_shared/email-templates/invite.tsx'
import { MagicLinkEmail } from '../_shared/email-templates/magic-link.tsx'
import { RecoveryEmail } from '../_shared/email-templates/recovery.tsx'
import { EmailChangeEmail } from '../_shared/email-templates/email-change.tsx'
import { ReauthenticationEmail } from '../_shared/email-templates/reauthentication.tsx'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SITE_NAME = "reage"
const SENDER_DOMAIN = "notify.reage.life"
const ROOT_DOMAIN = "reage.life"

const EMAIL_TEMPLATES: Record<string, React.ComponentType<any>> = {
  signup: SignupEmail,
  invite: InviteEmail,
  magiclink: MagicLinkEmail,
  recovery: RecoveryEmail,
  email_change: EmailChangeEmail,
  reauthentication: ReauthenticationEmail,
}

const DEFAULT_SUBJECTS: Record<string, string> = {
  signup: 'Подтвердите ваш email',
  invite: 'Вас пригласили в ReAge',
  magiclink: 'Ссылка для входа в ReAge',
  recovery: 'Сброс пароля ReAge',
  email_change: 'Подтвердите смену email в ReAge',
  reauthentication: 'Ваш код подтверждения ReAge',
}

function getSupabaseAdmin() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function fetchCustomTemplate(supabase: any, templateType: string) {
  const { data } = await supabase
    .from('email_templates')
    .select('subject, heading, body_text, button_label, footer_text')
    .eq('template_type', templateType)
    .maybeSingle()
  return data
}

async function fetchSenderSettings(supabase: any) {
  const { data } = await supabase
    .from('email_sender_settings')
    .select('sender_name, sender_email, sender_domain')
    .limit(1)
    .maybeSingle()

  return {
    name: data?.sender_name || SITE_NAME,
    email: data?.sender_email || 'noreply',
    domain: data?.sender_domain || SENDER_DOMAIN,
  }
}

function buildCustomProps(dbTemplate: any) {
  if (!dbTemplate) return {}
  return {
    customHeading: dbTemplate.heading,
    customBodyText: dbTemplate.body_text,
    ...(dbTemplate.button_label ? { customButtonLabel: dbTemplate.button_label } : {}),
    customFooterText: dbTemplate.footer_text,
  }
}

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

    // Verify user is superadmin
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = claimsData.claims.sub;
    const supabaseAdmin = getSupabaseAdmin();

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

    // Fetch template content and sender settings from DB
    const [dbTemplate, senderSettings] = await Promise.all([
      fetchCustomTemplate(supabaseAdmin, type),
      fetchSenderSettings(supabaseAdmin),
    ]);

    const customProps = buildCustomProps(dbTemplate);
    const emailSubject = `[Тест] ${dbTemplate?.subject || DEFAULT_SUBJECTS[type] || 'Notification'}`;

    // Build template props with dummy URLs for test
    const siteUrl = `https://${ROOT_DOMAIN}`;
    const templateProps = {
      siteName: SITE_NAME,
      siteUrl,
      recipient: email,
      confirmationUrl: siteUrl, // dummy link for test
      token: '123456', // dummy token for reauthentication test
      email: email,
      newEmail: email,
      ...customProps,
    };

    // Render the email
    const html = await renderAsync(React.createElement(EmailTemplate, templateProps));
    const text = await renderAsync(React.createElement(EmailTemplate, templateProps), { plainText: true });

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Send the email directly via Lovable Email API
    const result = await sendLovableEmail(
      {
        run_id: crypto.randomUUID(),
        to: email,
        from: `${senderSettings.name} <${senderSettings.email}@${senderSettings.domain}>`,
        sender_domain: SENDER_DOMAIN,
        subject: emailSubject,
        html,
        text,
        purpose: 'transactional',
      },
      { apiKey }
    );

    console.log(`Test email (${type}) sent to: ${email}, message_id: ${result.message_id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Тестовое письмо «${type}» отправлено на ${email}`,
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
