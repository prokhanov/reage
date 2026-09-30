import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  name?: string
  message?: string
  messages?: string[]
}

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '600px' }
const heading = { fontSize: '22px', fontWeight: '600', color: '#0f2a22', marginBottom: '16px' }
const text = { fontSize: '15px', lineHeight: '1.6', color: '#1f2937' }
const box = { backgroundColor: '#f1f5f4', borderRadius: '10px', padding: '16px', fontSize: '15px', lineHeight: '1.6', color: '#0f172a', whiteSpace: 'pre-wrap' as const, margin: '16px 0 24px' }
const button = { backgroundColor: '#1f4d3f', borderRadius: '10px', color: '#ffffff', fontSize: '15px', fontWeight: '600', padding: '12px 20px', textDecoration: 'none' }

const SupportReplyEmail = ({ name, message, messages }: Props) => {
  const list = messages?.length ? messages : [message || '—']
  return (
  <Html lang="ru" dir="ltr">
    <Head />
    <Preview>Ответ поддержки ReAge на ваш вопрос</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={heading}>{name ? `${name}, ответ на ваш вопрос` : 'Ответ на ваш вопрос'}</Heading>
        <Text style={text}>Мы ответили вам в чате:</Text>
        {list.map((m, i) => <Text key={i} style={box}>{m}</Text>)}
        <Section>
          <Button style={button} href="https://reage.life/">Продолжить переписку</Button>
        </Section>
        <Text style={{ ...text, color: '#6b7280', marginTop: '24px' }}>Команда ReAge</Text>
      </Container>
    </Body>
  </Html>
  )
}

export const template = {
  component: SupportReplyEmail,
  subject: 'Ответ поддержки ReAge',
  displayName: 'Ответ поддержки в чате',
  previewData: { name: 'Анна', message: 'Здравствуйте! Результаты будут готовы через 2 рабочих дня.' },
} satisfies TemplateEntry
