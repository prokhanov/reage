import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Link, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  name?: string
  login?: string
  password?: string
  autoLoginUrl?: string
  cabinetUrl?: string
}

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '600px' }
const heading = { fontSize: '22px', fontWeight: '600', color: '#0f172a', marginBottom: '16px' }
const text = { fontSize: '15px', lineHeight: '1.6', color: '#0f172a', marginBottom: '12px' }
const muted = { fontSize: '14px', lineHeight: '1.5', color: '#64748b', marginBottom: '12px' }
const box = { backgroundColor: '#f8fafc', borderRadius: '8px', padding: '14px 16px', fontSize: '15px', color: '#0f172a', marginBottom: '20px' }
const button = { backgroundColor: '#10b981', color: '#ffffff', borderRadius: '10px', padding: '14px 22px', fontSize: '15px', fontWeight: '600', textDecoration: 'none' }

const CheckupAccountEmail = ({ name, login, password, autoLoginUrl, cabinetUrl }: Props) => (
  <Html lang="ru" dir="ltr">
    <Head />
    <Preview>Ваш личный кабинет ReAge и данные для входа</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={heading}>{name ? `${name}, спасибо за заказ!` : 'Спасибо за заказ!'}</Heading>
        <Text style={text}>
          Мы создали для вас личный кабинет ReAge. В нём — ваш чекап, его статус и результаты, а ещё можно добавить другие чекапы со скидкой.
        </Text>
        <Section style={box}>
          <Text style={{ margin: '0 0 6px' }}>Логин: <strong>{login || '—'}</strong></Text>
          <Text style={{ margin: 0 }}>Пароль: <strong>{password || '—'}</strong></Text>
        </Section>
        {autoLoginUrl && (
          <Section style={{ marginBottom: '20px' }}>
            <Button href={autoLoginUrl} style={button}>Войти в кабинет</Button>
          </Section>
        )}
        <Text style={muted}>
          Кнопка входит в кабинет без пароля и работает один раз в течение 7 дней. Потом входите по логину и паролю
          {cabinetUrl ? <> на странице <Link href={cabinetUrl}>личного кабинета</Link></> : null}. Пароль можно сменить в профиле.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: CheckupAccountEmail,
  subject: 'Ваш личный кабинет ReAge',
  displayName: 'Аккаунт после оплаты чекапа',
  previewData: { name: 'Анна', login: 'anna@example.com', password: 'Xk7pQ2mN9aBc', autoLoginUrl: 'https://reage.life/?auto_login=demo', cabinetUrl: 'https://reage.life/one-time-checkups' },
} satisfies TemplateEntry
