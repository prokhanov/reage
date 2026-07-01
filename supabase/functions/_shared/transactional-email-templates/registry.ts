import type { ReactElement } from 'npm:react@18.3.1'
import { template as feedbackTemplate } from './feedback-notification.tsx'
import { template as passwordChangedTemplate } from './password-changed.tsx'
import { template as subscriptionActivatedTemplate } from './subscription-activated.tsx'

export interface TemplateEntry {
  component: (props: Record<string, any>) => ReactElement
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  // Fixed recipient address. If set, recipientEmail from the caller is ignored.
  to?: string
}

export const TEMPLATES: Record<string, TemplateEntry> = {
  'feedback-notification': feedbackTemplate,
  'password-changed': passwordChangedTemplate,
  'subscription-activated': subscriptionActivatedTemplate,
}

