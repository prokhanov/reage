План: заменить дублирующую кнопку «Посмотреть демо-аккаунт» в CTA-блоке после FAQ на кнопку «Напишите нам», открывающую форму обратной связи. Форма отправляет уведомление на team@reage.life через transactional email инфраструктуру Lovable.

### Что будем делать

1. **Исправить CTA-блок**
   - В `src/components/landing/CTASection.tsx` заменить вторую кнопку «Посмотреть демо-аккаунт» на кнопку «Написать» / «Напишите нам».
   - Кнопка открывает диалог с формой обратной связи.

2. **Создать форму обратной связи**
   - Новый компонент `src/components/landing/FeedbackDialog.tsx`.
   - Поля: имя, email, сообщение (по умолчанию, как выбрано ранее).
   - Валидация на стороне клиента (обязательные поля, корректный email, лимит длины сообщения).
   - Состояния отправки: loading, success, error.
   - После успешной отправки показывается подтверждение и диалог закрывается.

3. **Настроить отправку transactional email**
   - Проверить и при необходимости доставить `email_domain--setup_email_infra` и `email_domain--scaffold_transactional_email` для проекта.
   - Создать шаблон письма `supabase/functions/_shared/transactional-email-templates/feedback-notification.tsx`.
   - Шаблон содержит имя, email, сообщение и ссылку на ответ (mailto:).
   - Зарегистрировать шаблон в `registry.ts`.
   - Создать Edge Function `supabase/functions/send-feedback/index.ts`, который:
     - Принимает `{ name, email, message }`.
     - Валидирует входные данные через Zod.
     - Вызывает `send-transactional-email` для отправки письма на `team@reage.life`.
     - Возвращает `{ success: true }` или ошибку 400/500.

4. **Подключить форму к UI**
   - В `CTASection.tsx` добавить импорт `FeedbackDialog` и состояние `isFeedbackOpen`.
   - При нажатии на новую кнопку открывать диалог.
   - В `FAQSection.tsx` превратить текст «напишите нам» в кликабельную кнопку/ссылку, открывающую тот же `FeedbackDialog`.

5. **Проверить и задеплоить**
   - Запустить TypeScript-проверку и сборку.
   - Задеплоить Edge Function `send-feedback` и `send-transactional-email` после изменений.
   - Протестировать отправку формы через браузер (Playwright), проверить `email_send_log`.

### Технические детали
- Email-инфраструктура: Lovable Cloud, домен `notify.reage.life` уже верифицирован.
- Для отправки используется существующая функция `send-transactional-email` (будет создана/обновлена скаффолдом).
- Отправитель письма: `notify.reage.life`, получатель: `team@reage.life`.
- Edge Function `send-feedback` не требует авторизации (anonymous users on landing page), но будет иметь базовую защиту через rate-limit на уровне формы (debounce) и валидацию.
- Все пользовательские входы валидируются и не логируются в консоль.