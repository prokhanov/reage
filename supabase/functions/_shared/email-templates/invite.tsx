/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

const logoUrl = 'https://ilxgodhosirhhkffqryw.supabase.co/storage/v1/object/public/email-assets/reage-logo.png'

export const InviteEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
}: InviteEmailProps) => (
  <Html lang="ru" dir="ltr">
    <Head />
    <Preview>Вас пригласили в ReAge</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={logoUrl} alt="ReAge" width="120" height="auto" style={logo} />
        <Heading style={h1}>Вас пригласили в ReAge</Heading>
        <Text style={text}>
          Вы получили приглашение присоединиться к{' '}
          <Link href={siteUrl} style={link}>
            <strong>ReAge</strong>
          </Link>
          . Нажмите на кнопку ниже, чтобы принять приглашение и создать аккаунт.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Принять приглашение
        </Button>
        <Text style={footer}>
          Если вы не ожидали этого приглашения, просто проигнорируйте это письмо.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail

const main = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }
const container = { padding: '40px 25px' }
const logo = { margin: '0 0 24px' }
const h1 = {
  fontSize: '24px',
  fontWeight: 'bold' as const,
  color: '#2d1a4e',
  margin: '0 0 20px',
}
const text = {
  fontSize: '15px',
  color: '#6b5b7b',
  lineHeight: '1.6',
  margin: '0 0 25px',
}
const link = { color: '#7c3aed', textDecoration: 'underline' }
const button = {
  backgroundColor: '#7c3aed',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: '600' as const,
  borderRadius: '8px',
  padding: '14px 28px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#9ca3af', margin: '30px 0 0' }
