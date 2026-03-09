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
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
  customHeading?: string
  customBodyText?: string
  customButtonLabel?: string
  customFooterText?: string
}

const logoUrl = 'https://ilxgodhosirhhkffqryw.supabase.co/storage/v1/object/public/email-assets/reage-logo.png'

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
  customHeading,
  customBodyText,
  customButtonLabel,
  customFooterText,
}: RecoveryEmailProps) => (
  <Html lang="ru" dir="ltr">
    <Head><meta charSet="utf-8" /></Head>
    <Preview>Сброс пароля ReAge</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={logoUrl} alt="ReAge" width="120" height="auto" style={logo} />
        <Heading style={h1}>{customHeading || 'Сброс пароля'}</Heading>
        <Text style={text}>
          {customBodyText || 'Мы получили запрос на сброс пароля для вашего аккаунта ReAge. Нажмите на кнопку ниже, чтобы задать новый пароль.'}
        </Text>
        <Button style={button} href={confirmationUrl}>
          {customButtonLabel || 'Сбросить пароль'}
        </Button>
        <Text style={footer}>
          {customFooterText || 'Если вы не запрашивали сброс пароля, проигнорируйте это письмо. Ваш пароль не будет изменён.'}
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

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
