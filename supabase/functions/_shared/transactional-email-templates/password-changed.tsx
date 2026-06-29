import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  name?: string
  email?: string
  changedAt?: string
  siteName?: string
}

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '600px' }
const heading = { fontSize: '22px', fontWeight: '600', color: '#0f172a', marginBottom: '16px' }
const text = { fontSize: '15px', lineHeight: '1.6', color: '#0f172a', marginBottom: '12px' }
const muted = { fontSize: '14px', lineHeight: '1.5', color: '#64748b', marginBottom: '12px' }
const box = { backgroundColor: '#f8fafc', borderRadius: '8px', padding: '14px 16px', fontSize: '14px', color: '#0f172a', marginBottom: '20px' }
const alert = { backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '14px 16px', fontSize: '14px', color: '#991b1b', marginBottom: '20px' }
const footer = { fontSize: '13px', color: '#94a3b8', marginTop: '28px', borderTop: '1px solid #e2e8f0', paddingTop: '14px' }

const PasswordChangedEmail = ({ name, email, changedAt, siteName }: Props) => (
  <Html lang="ru" dir="ltr">
    <Head />
    <Preview>Пароль вашего аккаунта {siteName || 'ReAge'} был изменён</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={heading}>Пароль успешно изменён</Heading>
        <Text style={text}>{name ? `Здравствуйте, ${name}!` : 'Здравствуйте!'}</Text>
        <Text style={text}>
          Подтверждаем, что пароль вашего аккаунта в {siteName || 'ReAge'} был изменён.
        </Text>

        <Section style={box}>
          <Text style={{ ...muted, marginBottom: 4 }}>Аккаунт</Text>
          <Text style={{ ...text, marginBottom: 8 }}>{email || '—'}</Text>
          <Text style={{ ...muted, marginBottom: 4 }}>Время</Text>
          <Text style={{ ...text, marginBottom: 0 }}>{changedAt || new Date().toLocaleString('ru-RU')}</Text>
        </Section>

        <Section style={alert}>
          Если это были не вы — немедленно восстановите доступ через «Забыли пароль?» и напишите нам на team@reage.life.
        </Section>

        <Text style={footer}>
          Это автоматическое уведомление о безопасности от {siteName || 'ReAge'}.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: PasswordChangedEmail,
  subject: 'Пароль изменён',
  displayName: 'Password changed notification',
  previewData: {
    name: 'Иван',
    email: 'ivan@example.com',
    changedAt: new Date().toLocaleString('ru-RU'),
    siteName: 'ReAge',
  },
} satisfies TemplateEntry
