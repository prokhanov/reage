import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Link, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface FeedbackNotificationProps {
  name?: string
  email?: string
  message?: string
  siteName?: string
}

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '600px' }
const heading = { fontSize: '22px', fontWeight: '600', color: '#0f172a', marginBottom: '16px' }
const label = { fontSize: '13px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '0.03em', marginBottom: '4px' }
const value = { fontSize: '15px', lineHeight: '1.5', color: '#0f172a', marginBottom: '16px' }
const messageBox = { backgroundColor: '#f8fafc', borderRadius: '8px', padding: '16px', fontSize: '15px', lineHeight: '1.6', color: '#0f172a', whiteSpace: 'pre-wrap' as const, marginBottom: '24px' }
const button = { backgroundColor: '#3b82f6', borderRadius: '8px', color: '#ffffff', fontSize: '15px', fontWeight: '600', padding: '12px 20px', textDecoration: 'none' }
const footer = { fontSize: '13px', color: '#94a3b8', marginTop: '32px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }

const FeedbackNotificationEmail = ({ name, email, message, siteName }: FeedbackNotificationProps) => {
  const replyTo = email ? `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(`Re: ${siteName || 'ReAge'} feedback`)}` : undefined

  return (
    <Html lang="ru" dir="ltr">
      <Head />
      <Preview>Новое сообщение обратной связи от {name || 'пользователя'}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Новое сообщение обратной связи</Heading>

          <Section>
            <Text style={label}>Имя</Text>
            <Text style={value}>{name || 'Не указано'}</Text>

            <Text style={label}>Email</Text>
            <Text style={value}>{email || 'Не указан'}</Text>

            <Text style={label}>Сообщение</Text>
            <Text style={messageBox}>{message || '—'}</Text>
          </Section>

          {replyTo && (
            <Section style={{ textAlign: 'left' }}>
              <Button style={button} href={replyTo}>
                Ответить пользователю
              </Button>
            </Section>
          )}

          <Text style={footer}>
            Уведомление отправлено с сайта {siteName || 'ReAge'}.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: FeedbackNotificationEmail,
  subject: 'Новое сообщение обратной связи',
  displayName: 'Feedback notification',
  previewData: { name: 'Иван Петров', email: 'ivan@example.com', message: 'Пример сообщения обратной связи.' },
  to: 'team@reage.life',
} satisfies TemplateEntry
