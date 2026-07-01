import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  name?: string
  planName?: string
  planType?: string
  amount?: number | string
  originalAmount?: number | string
  discountAmount?: number | string
  promoCode?: string
  startDate?: string
  endDate?: string
  invId?: number | string
  siteName?: string
  dashboardUrl?: string
  gifted?: boolean
  giftReason?: string
}

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '600px' }
const heading = { fontSize: '22px', fontWeight: '600', color: '#0f172a', marginBottom: '16px' }
const text = { fontSize: '15px', lineHeight: '1.6', color: '#0f172a', marginBottom: '12px' }
const muted = { fontSize: '13px', color: '#64748b', marginBottom: '4px', textTransform: 'uppercase' as const, letterSpacing: '0.03em', fontWeight: '600' as const }
const value = { fontSize: '15px', color: '#0f172a', marginBottom: '12px' }
const box = { backgroundColor: '#f8fafc', borderRadius: '10px', padding: '18px 20px', marginBottom: '20px' }
const listItem = { fontSize: '15px', lineHeight: '1.6', color: '#0f172a', marginBottom: '6px' }
const button = { backgroundColor: '#3b82f6', borderRadius: '8px', color: '#ffffff', fontSize: '15px', fontWeight: '600' as const, padding: '12px 22px', textDecoration: 'none' }
const footer = { fontSize: '13px', color: '#94a3b8', marginTop: '28px', borderTop: '1px solid #e2e8f0', paddingTop: '14px' }

const fmtMoney = (v: number | string | undefined) => {
  if (v === undefined || v === null || v === '') return '—'
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n)) return String(v)
  return `${n.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ₽`
}

const fmtDate = (iso?: string) => {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' })
}

const periodLabel = (p?: string) => {
  switch (p) {
    case 'annual': return 'Годовая подписка'
    case 'monthly': return 'Месячная подписка'
    case 'quarterly': return 'Квартальная подписка'
    case 'semiannual': return 'Полугодовая подписка'
    default: return p ? `Подписка (${p})` : 'Подписка'
  }
}

const SubscriptionActivatedEmail = ({
  name, planName, planType, amount, originalAmount, discountAmount, promoCode,
  startDate, endDate, invId, siteName, dashboardUrl,
}: Props) => {
  const site = siteName || 'ReAge'
  const url = dashboardUrl || 'https://reage.life/dashboard'
  const hasDiscount = Number(discountAmount) > 0

  return (
    <Html lang="ru" dir="ltr">
      <Head />
      <Preview>Оплата прошла. Подписка {site} активирована.</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Оплата прошла. Подписка активирована</Heading>
          <Text style={text}>{name ? `Здравствуйте, ${name}!` : 'Здравствуйте!'}</Text>
          <Text style={text}>
            Спасибо за оплату. Ваша подписка в {site} активна — доступ ко всем функциям сервиса открыт.
          </Text>

          <Section style={box}>
            <Text style={muted}>Тариф</Text>
            <Text style={value}>{planName || '—'}</Text>

            <Text style={muted}>Период</Text>
            <Text style={value}>{periodLabel(planType)}</Text>

            <Text style={muted}>Действует</Text>
            <Text style={value}>{fmtDate(startDate)} — {fmtDate(endDate)}</Text>

            <Text style={muted}>Сумма</Text>
            <Text style={value}>
              {fmtMoney(amount)}
              {hasDiscount && (
                <>
                  {' '}<span style={{ color: '#64748b', fontSize: '13px' }}>
                    (скидка {fmtMoney(discountAmount)}{promoCode ? ` по промокоду ${promoCode}` : ''}, без скидки {fmtMoney(originalAmount)})
                  </span>
                </>
              )}
            </Text>

            <Text style={muted}>Номер счёта</Text>
            <Text style={{ ...value, marginBottom: 0 }}>#{invId ?? '—'}</Text>
          </Section>

          <Heading as="h2" style={{ ...heading, fontSize: '17px', marginBottom: '10px' }}>Что входит в подписку</Heading>
          <Section style={{ marginBottom: '20px' }}>
            <Text style={listItem}>• Годовой мониторинг биомаркеров и биологического возраста</Text>
            <Text style={listItem}>• Персональные отчёты по здоровью и стратегия улучшений</Text>
            <Text style={listItem}>• ИИ-ассистент по вашим показателям 24/7</Text>
            <Text style={listItem}>• Плановые чек-апы и напоминания о пересдаче анализов</Text>
            <Text style={listItem}>• Хранение истории анализов и динамика показателей</Text>
          </Section>

          <Section style={{ textAlign: 'left', marginBottom: '24px' }}>
            <Button style={button} href={url}>Открыть контрольную панель</Button>
          </Section>

          <Text style={{ ...text, color: '#64748b', fontSize: '14px' }}>
            Условия подписки: оплата за выбранный период списывается единоразово. Автопродление не подключается — за 7 дней до окончания мы напомним о продлении. Чек об оплате приходит отдельным письмом от платёжного оператора Robokassa.
          </Text>
          <Text style={{ ...text, color: '#64748b', fontSize: '14px' }}>
            Если возникнут вопросы — напишите на <a href="mailto:team@reage.life" style={{ color: '#3b82f6' }}>team@reage.life</a>.
          </Text>

          <Text style={footer}>
            Это автоматическое уведомление от {site}. Вы получили его, потому что оплатили подписку в личном кабинете.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: SubscriptionActivatedEmail,
  subject: 'Подписка ReAge активирована',
  displayName: 'Subscription activated',
  previewData: {
    name: 'Иван',
    planName: 'ReAge Optimum',
    planType: 'annual',
    amount: 24000,
    originalAmount: 30000,
    discountAmount: 6000,
    promoCode: 'WELCOME20',
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
    invId: 12345,
    siteName: 'ReAge',
    dashboardUrl: 'https://reage.life/dashboard',
  },
} satisfies TemplateEntry
