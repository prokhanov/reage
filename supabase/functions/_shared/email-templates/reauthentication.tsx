/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
  customHeading?: string
  customBodyText?: string
  customFooterText?: string
}

const logoUrl = 'https://ilxgodhosirhhkffqryw.supabase.co/storage/v1/object/public/email-assets/reage-logo.png'

export const ReauthenticationEmail = ({
  token,
  customHeading,
  customBodyText,
  customFooterText,
}: ReauthenticationEmailProps) => (
  <Html lang="ru" dir="ltr">
    <Head><meta charSet="utf-8" /></Head>
    <Preview>Ваш код подтверждения ReAge</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={logoUrl} alt="ReAge" width="120" height="auto" style={logo} />
        <Heading style={h1}>{customHeading || 'Код подтверждения'}</Heading>
        <Text style={text}>{customBodyText || 'Используйте код ниже для подтверждения вашей личности:'}</Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={footer}>
          {customFooterText || 'Код действителен ограниченное время. Если вы не запрашивали его, проигнорируйте это письмо.'}
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

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
const codeStyle = {
  fontFamily: 'Courier, monospace',
  fontSize: '28px',
  fontWeight: 'bold' as const,
  color: '#7c3aed',
  margin: '0 0 30px',
  letterSpacing: '4px',
}
const footer = { fontSize: '12px', color: '#9ca3af', margin: '30px 0 0' }
