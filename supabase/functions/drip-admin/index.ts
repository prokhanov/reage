// Drip admin actions: send test, enrol user, cancel user, run-now (manual trigger)
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } })
    const { data: { user } } = await userClient.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const admin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
    const { data: roles } = await admin.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'superadmin')
    if (!roles || roles.length === 0) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const body = await req.json()
    const action = body?.action as string

    if (action === 'test_send') {
      // body: { step_id, email }
      const { step_id, email } = body
      if (!step_id || !email) {
        return new Response(JSON.stringify({ error: 'step_id and email required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      // Create a temporary schedule row pointing to current user but with test email override stored in skip_reason metadata?
      // Simpler: insert a one-off schedule row for the *current* admin user with send_at=now and immediately invoke processor.
      // But we want it to go to `email`, not the admin's email. So we temporarily upsert a fake profile? No — instead invoke directly.

      // Direct send path: fetch the step, render, enqueue once, log.
      const { data: step } = await admin.from('email_drip_steps').select('*, series:email_drip_series(name)').eq('id', step_id).maybeSingle()
      if (!step) return new Response(JSON.stringify({ error: 'step not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

      // Call drip-process internally with a synthetic profile won't work without DB row.
      // Build minimal email directly here using same template:
      const { marked } = await import('npm:marked@13.0.0')
      const SITE_NAME = 'ReAge'
      const SENDER_DOMAIN = 'notify.reage.life'
      const FROM_ADDRESS = `${SITE_NAME} <noreply@${SENDER_DOMAIN}>`
      const APP_URL = 'https://reage.life'
      const fakeUnsub = `${APP_URL}/unsubscribe?token=test`
      const sample = {
        first_name: 'Тест',
        name: 'Тест Тестов',
        email,
        dashboard_url: `${APP_URL}/dashboard`,
        unsubscribe_url: fakeUnsub,
      }
      const fill = (s: string) => (s || '')
        .replaceAll('{{first_name}}', sample.first_name)
        .replaceAll('{{name}}', sample.name)
        .replaceAll('{{email}}', sample.email)
        .replaceAll('{{dashboard_url}}', sample.dashboard_url)
        .replaceAll('{{unsubscribe_url}}', fakeUnsub)
        .replaceAll('{{unsubscribe_all_url}}', fakeUnsub)
        .replaceAll('{{site_url}}', APP_URL)
      const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]!))
      const subject = `[ТЕСТ] ${fill(step.subject)}`
      const ctaLabel = step.cta_label ? fill(step.cta_label) : null
      const ctaUrl = step.cta_url ? fill(step.cta_url) : null
      const bodyHtml = await marked.parse(fill(step.body_markdown || ''), { breaks: true, gfm: true })
      const ctaBlock = ctaLabel && ctaUrl
        ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:28px 0;"><tr><td><a href="${ctaUrl}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:600;font-size:15px;font-family:Arial,sans-serif;">${esc(ctaLabel)}</a></td></tr></table>`
        : ''
      const preheader = step.preheader ? fill(step.preheader) : null
      const html = `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
${preheader ? `<div style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0;">${esc(preheader)}</div>` : ''}
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#ffffff;"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">
  <tr><td style="padding:28px 32px 8px 32px;"><div style="font-size:22px;font-weight:700;color:#0f172a;letter-spacing:-0.01em;">${SITE_NAME}</div></td></tr>
  <tr><td style="padding:8px 32px 24px 32px;font-size:15px;line-height:1.65;color:#1f2937;"><div style="font-size:13px;background:#fef3c7;border:1px solid #fde68a;color:#92400e;padding:10px 14px;border-radius:8px;margin-bottom:18px;">⚠ Это тестовое письмо. Реальные ссылки отписки в нём не работают.</div>${bodyHtml}${ctaBlock}</td></tr>
  <tr><td style="padding:20px 32px 28px 32px;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280;line-height:1.6;">Тестовая отправка из админки ${SITE_NAME}.</td></tr>
</table></td></tr></table></body></html>`
      const text = fill(step.body_markdown || '')

      const messageId = crypto.randomUUID()
      await admin.from('email_send_log').insert({
        message_id: messageId,
        template_name: `drip-test:${step_id}`,
        recipient_email: email,
        status: 'pending',
        metadata: { is_test: true, drip_step_id: step_id, step_id: step_id, sent_by: user.id },
      })

      const { error: enqErr } = await admin.rpc('enqueue_email', {
        queue_name: 'transactional_emails',
        payload: {
          message_id: messageId,
          idempotency_key: messageId,
          to: email,
          from: FROM_ADDRESS,
          sender_domain: SENDER_DOMAIN,
          subject,
          html,
          text,
          purpose: 'transactional',
          label: `drip-test:${step_id}`,
          metadata: { is_test: true, step_id: step_id, drip_step_id: step_id, sent_by: user.id },
          queued_at: new Date().toISOString(),
        },
      })
      if (enqErr) {
        return new Response(JSON.stringify({ error: enqErr.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      return new Response(JSON.stringify({ success: true, message_id: messageId }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'enroll_user') {
      // body: { user_id, series_id }
      const { user_id, series_id } = body
      const { data, error } = await admin.rpc('enroll_user_in_series', { p_user_id: user_id, p_series_id: series_id, p_base_time: new Date().toISOString() })
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      return new Response(JSON.stringify({ success: true, enrolled_steps: data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'cancel_user_series') {
      const { user_id, series_id } = body
      const { error } = await admin.from('email_drip_schedule')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('user_id', user_id).eq('series_id', series_id).eq('status', 'pending')
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'reset_user_series') {
      // Delete schedule rows so user can be re-enrolled fresh
      const { user_id, series_id } = body
      const { error } = await admin.from('email_drip_schedule').delete().eq('user_id', user_id).eq('series_id', series_id)
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'enroll_users' || action === 'enroll_all_existing') {
      const { series_id } = body
      if (!series_id) {
        return new Response(JSON.stringify({ error: 'series_id required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      let userIds: string[] = []
      if (action === 'enroll_all_existing' || body?.all === true) {
        const { data: patientRoleRows } = await admin.from('user_roles').select('user_id').eq('role', 'patient')
        userIds = (patientRoleRows ?? []).map((r: any) => r.user_id)
      } else {
        userIds = Array.isArray(body?.user_ids) ? body.user_ids.filter((x: any) => typeof x === 'string') : []
      }
      let enrolled = 0
      let skipped = 0
      for (const uid of userIds) {
        const { data: existing } = await admin.from('email_drip_schedule').select('id').eq('user_id', uid).eq('series_id', series_id).limit(1)
        if (existing && existing.length > 0) { skipped++; continue }
        await admin.rpc('enroll_user_in_series', { p_user_id: uid, p_series_id: series_id, p_base_time: new Date().toISOString() })
        enrolled++
      }
      return new Response(JSON.stringify({ success: true, enrolled, skipped, enrolled_users: enrolled }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'series_subscribers') {
      const { series_id } = body
      const search: string = (body?.search ?? '').toString().trim().toLowerCase()
      const statusFilter: string = body?.status_filter ?? 'all'
      const page: number = Math.max(1, Number(body?.page ?? 1))
      const pageSize: number = Math.min(200, Math.max(10, Number(body?.page_size ?? 50)))
      if (!series_id) {
        return new Response(JSON.stringify({ error: 'series_id required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const { data: rows } = await admin.from('email_drip_schedule')
        .select('id, user_id, status, send_at, sent_at, step_id, error_message')
        .eq('series_id', series_id)

      const { data: stepsData } = await admin.from('email_drip_steps')
        .select('id, order_index, subject').eq('series_id', series_id).order('order_index')
      const stepMap = new Map<string, { order_index: number; subject: string }>()
      ;(stepsData ?? []).forEach((s: any) => stepMap.set(s.id, { order_index: s.order_index, subject: s.subject }))
      const totalSteps = (stepsData ?? []).length

      type UserAgg = {
        user_id: string; total: number; sent: number; pending: number; skipped: number; failed: number; cancelled: number;
        last_send_at: string | null; last_sent_at: string | null; last_step_id: string | null;
      }
      const map = new Map<string, UserAgg>()
      for (const r of (rows ?? []) as any[]) {
        let a = map.get(r.user_id)
        if (!a) { a = { user_id: r.user_id, total: 0, sent: 0, pending: 0, skipped: 0, failed: 0, cancelled: 0, last_send_at: null, last_sent_at: null, last_step_id: null }; map.set(r.user_id, a) }
        a.total++
        if (r.status === 'sent') a.sent++
        else if (r.status === 'pending') a.pending++
        else if (r.status === 'skipped') a.skipped++
        else if (r.status === 'failed') a.failed++
        else if (r.status === 'cancelled') a.cancelled++
        if (r.sent_at && (!a.last_sent_at || r.sent_at > a.last_sent_at)) {
          a.last_sent_at = r.sent_at; a.last_step_id = r.step_id
        }
        if (!a.last_send_at || (r.send_at && r.send_at > a.last_send_at)) a.last_send_at = r.send_at
      }
      const userIds = Array.from(map.keys())

      const { data: profiles } = userIds.length
        ? await admin.from('profiles').select('id, first_name, last_name, email').in('id', userIds)
        : { data: [] as any[] }
      const profMap = new Map<string, any>()
      ;(profiles ?? []).forEach((p: any) => profMap.set(p.id, p))

      const emails = (profiles ?? []).map((p: any) => p.email).filter(Boolean)
      const { data: unsubs } = emails.length
        ? await admin.from('email_unsubscribes').select('email, scope').in('email', emails)
        : { data: [] as any[] }
      const unsubMap = new Map<string, string>()
      ;(unsubs ?? []).forEach((u: any) => unsubMap.set(u.email.toLowerCase(), u.scope))

      const { data: logs } = emails.length
        ? await admin.from('email_send_log')
            .select('recipient_email, status, created_at, metadata')
            .in('recipient_email', emails)
            .order('created_at', { ascending: false })
            .limit(2000)
        : { data: [] as any[] }
      const deliveryByUser = new Map<string, { status: string; created_at: string }>()
      for (const l of (logs ?? []) as any[]) {
        const md = l.metadata || {}
        if (md.series_id !== series_id) continue
        const prof = (profiles ?? []).find((p: any) => p.email?.toLowerCase() === l.recipient_email?.toLowerCase())
        if (!prof) continue
        if (!deliveryByUser.has(prof.id)) deliveryByUser.set(prof.id, { status: l.status, created_at: l.created_at })
      }

      const { data: subscriptions } = userIds.length
        ? await admin.from('subscriptions').select('user_id, status').in('user_id', userIds).eq('status', 'active')
        : { data: [] as any[] }
      const activeSubs = new Set<string>((subscriptions ?? []).map((s: any) => s.user_id))

      let result = Array.from(map.values()).map((a) => {
        const p = profMap.get(a.user_id) || {}
        const email = p.email ?? ''
        const unsubScope = unsubMap.get(email.toLowerCase()) ?? null
        let overall: string
        if (unsubScope) overall = 'unsubscribed'
        else if (a.pending > 0) overall = 'active'
        else if (a.failed > 0 && a.sent === 0) overall = 'failed'
        else if (a.cancelled === a.total) overall = 'cancelled'
        else if (a.sent > 0 && a.sent + a.skipped + a.cancelled + a.failed === a.total) overall = 'completed'
        else overall = 'mixed'
        const lastStep = a.last_step_id ? stepMap.get(a.last_step_id) : null
        const delivery = deliveryByUser.get(a.user_id) ?? null
        return {
          user_id: a.user_id,
          first_name: p.first_name ?? null,
          last_name: p.last_name ?? null,
          email,
          overall_status: overall,
          progress_sent: a.sent,
          progress_total: Math.max(a.total, totalSteps),
          counts: { pending: a.pending, sent: a.sent, skipped: a.skipped, failed: a.failed, cancelled: a.cancelled },
          last_step_subject: lastStep?.subject ?? null,
          last_step_index: lastStep?.order_index ?? null,
          last_sent_at: a.last_sent_at,
          next_send_at: a.pending > 0 ? a.last_send_at : null,
          delivery_status: delivery?.status ?? null,
          delivery_at: delivery?.created_at ?? null,
          unsubscribe_scope: unsubScope,
          has_active_subscription: activeSubs.has(a.user_id),
        }
      })

      if (search) result = result.filter((r) => `${r.first_name ?? ''} ${r.last_name ?? ''} ${r.email}`.toLowerCase().includes(search))
      if (statusFilter && statusFilter !== 'all') result = result.filter((r) => r.overall_status === statusFilter)
      result.sort((a, b) => {
        if (a.overall_status === 'active' && b.overall_status !== 'active') return -1
        if (b.overall_status === 'active' && a.overall_status !== 'active') return 1
        return (b.last_sent_at ?? '').localeCompare(a.last_sent_at ?? '')
      })

      const total = result.length
      const start = (page - 1) * pageSize
      const items = result.slice(start, start + pageSize)
      const summary: any = { active: 0, completed: 0, unsubscribed: 0, failed: 0, cancelled: 0, mixed: 0 }
      for (const r of result) summary[r.overall_status] = (summary[r.overall_status] ?? 0) + 1
      return new Response(JSON.stringify({ items, total, page, page_size: pageSize, summary }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'list_patients') {
      const { series_id } = body
      const search: string = (body?.search ?? '').toString().trim().toLowerCase()
      const limit: number = Math.min(2000, Math.max(10, Number(body?.limit ?? 500)))

      const { data: patientRoleRows } = await admin.from('user_roles').select('user_id').eq('role', 'patient')
      const userIds = (patientRoleRows ?? []).map((r: any) => r.user_id)
      if (userIds.length === 0) {
        return new Response(JSON.stringify({ items: [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      const { data: profiles } = await admin.from('profiles').select('id, first_name, last_name, email, phone, created_at').in('id', userIds)

      let enrolledSet = new Set<string>()
      if (series_id) {
        const { data: sched } = await admin.from('email_drip_schedule').select('user_id').eq('series_id', series_id)
        ;(sched ?? []).forEach((s: any) => enrolledSet.add(s.user_id))
      }
      const emails = (profiles ?? []).map((p: any) => p.email).filter(Boolean)
      const { data: unsubs } = emails.length
        ? await admin.from('email_unsubscribes').select('email, scope').in('email', emails)
        : { data: [] as any[] }
      const unsubMap = new Map<string, string>()
      ;(unsubs ?? []).forEach((u: any) => unsubMap.set(u.email.toLowerCase(), u.scope))

      const { data: subs } = await admin.from('subscriptions').select('user_id, status').in('user_id', userIds).eq('status', 'active')
      const subsSet = new Set<string>((subs ?? []).map((s: any) => s.user_id))

      let items: any[] = (profiles ?? []).map((p: any) => ({
        user_id: p.id,
        first_name: p.first_name,
        last_name: p.last_name,
        email: p.email,
        phone: p.phone,
        created_at: p.created_at,
        enrolled: enrolledSet.has(p.id),
        unsubscribed: !!unsubMap.get((p.email ?? '').toLowerCase()),
        has_active_subscription: subsSet.has(p.id),
      }))
      if (search) items = items.filter((p) => `${p.first_name ?? ''} ${p.last_name ?? ''} ${p.email ?? ''} ${p.phone ?? ''}`.toLowerCase().includes(search))
      items.sort((a, b) => (a.enrolled === b.enrolled ? 0 : a.enrolled ? 1 : -1))
      items = items.slice(0, limit)
      return new Response(JSON.stringify({ items }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'remove_users_from_series') {
      const { series_id } = body
      const userIds: string[] = Array.isArray(body?.user_ids) ? body.user_ids.filter((x: any) => typeof x === 'string') : []
      if (!series_id || userIds.length === 0) {
        return new Response(JSON.stringify({ error: 'series_id and user_ids required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      const { error, count } = await admin.from('email_drip_schedule')
        .delete({ count: 'exact' })
        .eq('series_id', series_id)
        .in('user_id', userIds)
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      return new Response(JSON.stringify({ success: true, removed: count ?? 0, users: userIds.length }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'drip_logs') {
      const search: string = (body?.search ?? '').toString().trim().toLowerCase()
      const statusFilter: string = body?.status_filter ?? 'all'
      const seriesFilter: string | null = body?.series_id ?? null
      const page: number = Math.max(1, Number(body?.page ?? 1))
      const pageSize: number = Math.min(200, Math.max(10, Number(body?.page_size ?? 50)))

      const { data: logs, error: logsErr } = await admin.from('email_send_log')
        .select('id, message_id, template_name, recipient_email, status, error_message, metadata, created_at')
        .like('template_name', 'drip%')
        .order('created_at', { ascending: false })
        .limit(3000)
      if (logsErr) return new Response(JSON.stringify({ error: logsErr.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

      // Deduplicate by message_id -> latest (rows already ordered desc)
      const latestByMsg = new Map<string, any>()
      for (const l of (logs ?? []) as any[]) {
        const key = l.message_id ?? l.id
        if (!latestByMsg.has(key)) latestByMsg.set(key, l)
      }
      let rows = Array.from(latestByMsg.values())

      if (seriesFilter) {
        rows = rows.filter((l) => {
          const md = l.metadata || {}
          if (md.series_id === seriesFilter) return true
          if (typeof l.template_name === 'string' && l.template_name.startsWith(`drip:${seriesFilter}:`)) return true
          return false
        })
      }

      const { data: seriesRows } = await admin.from('email_drip_series').select('id, name')
      const seriesMap = new Map<string, string>()
      ;(seriesRows ?? []).forEach((s: any) => seriesMap.set(s.id, s.name))

      const { data: stepsAll } = await admin.from('email_drip_steps').select('id, series_id, order_index, subject')
      const stepMap = new Map<string, any>()
      ;(stepsAll ?? []).forEach((s: any) => stepMap.set(s.id, s))

      const emails = Array.from(new Set(rows.map((r) => (r.recipient_email ?? '').toLowerCase()).filter(Boolean)))
      const { data: profiles } = emails.length
        ? await admin.from('profiles').select('id, first_name, last_name, email').in('email', emails as any)
        : { data: [] as any[] }
      const profByEmail = new Map<string, any>()
      ;(profiles ?? []).forEach((p: any) => p.email && profByEmail.set(p.email.toLowerCase(), p))

      const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi
      let items = rows.map((l) => {
        const md = l.metadata || {}
        let seriesId: string | null = md.series_id ?? null
        let stepId: string | null = md.drip_step_id ?? md.step_id ?? null
        const tn: string = typeof l.template_name === 'string' ? l.template_name : ''
        const isTest = !!md.is_test || tn.startsWith('drip-test:') || tn.startsWith('drip-test-')
        // Colon format: drip:<series>:<step> or drip-test:<step>
        if (!seriesId && tn.startsWith('drip:')) {
          const parts = tn.split(':')
          if (parts.length >= 3) { seriesId = parts[1]; stepId = stepId ?? parts[2] }
        }
        if (!stepId && tn.startsWith('drip-test:')) {
          stepId = tn.slice('drip-test:'.length)
        }
        // Dash fallback for legacy rows from process-email-queue:
        // drip-test-<stepUUID> or drip-<seriesUUID>-<stepUUID>
        if ((!stepId || !seriesId) && (tn.startsWith('drip-') || tn.startsWith('drip:'))) {
          const uuids = tn.match(UUID_RE) || []
          if (tn.startsWith('drip-test-') || tn.startsWith('drip-test:')) {
            if (!stepId && uuids[0]) stepId = uuids[0]
          } else {
            if (!seriesId && uuids[0]) seriesId = uuids[0]
            if (!stepId && uuids[1]) stepId = uuids[1]
          }
        }
        const step = stepId ? stepMap.get(stepId) : null
        const prof = profByEmail.get((l.recipient_email ?? '').toLowerCase()) ?? null
        return {
          id: l.id,
          message_id: l.message_id,
          recipient_email: l.recipient_email,
          first_name: prof?.first_name ?? null,
          last_name: prof?.last_name ?? null,
          series_id: seriesId,
          series_name: seriesId ? (seriesMap.get(seriesId) ?? null) : null,
          step_id: stepId,
          step_order_index: step?.order_index ?? null,
          step_subject: step?.subject ?? null,
          status: l.status,
          error_message: l.error_message,
          created_at: l.created_at,
          is_test: isTest,
        }
      })

      if (search) {
        items = items.filter((r) => `${r.first_name ?? ''} ${r.last_name ?? ''} ${r.recipient_email ?? ''}`.toLowerCase().includes(search))
      }
      if (statusFilter && statusFilter !== 'all') {
        items = items.filter((r) => r.status === statusFilter)
      }

      const summary: Record<string, number> = { total: items.length, sent: 0, pending: 0, failed: 0, bounced: 0, complained: 0, suppressed: 0, dlq: 0 }
      for (const r of items) summary[r.status] = (summary[r.status] ?? 0) + 1

      const total = items.length
      const start = (page - 1) * pageSize
      const paged = items.slice(start, start + pageSize)
      return new Response(JSON.stringify({ items: paged, total, page, page_size: pageSize, summary, series_list: Array.from(seriesMap.entries()).map(([id, name]) => ({ id, name })) }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err: any) {
    console.error('drip-admin error', err)
    return new Response(JSON.stringify({ error: err?.message || 'Internal error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
