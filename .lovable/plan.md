
# План: Добавление промптов разделов отчёта в AI Settings

## Цель
Добавить на страницу AI Settings раздел для редактирования промптов "Назначения" и "Общее резюме" — двух разделов финального отчёта.

## Текущее состояние
- В базе данных уже существуют промпты:
  - `prescriptions_system` / `prescriptions_user` — для раздела "Назначения"
  - `summary_system` / `summary_user` — для раздела "Общее резюме"
- На странице AISettings.tsx отображаются только промпты категорий биомаркеров

## Изменения

### Файл: `src/pages/admin/AISettings.tsx`

1. **Добавить новый раздел "Промпты разделов отчёта"** перед разделом категорий биомаркеров:
   - Группа "Назначения" (иконка 💊):
     - System Prompt (`prescriptions_system`)
     - User Prompt (`prescriptions_user`)
   - Группа "Общее резюме" (иконка 📋):
     - System Prompt (`summary_system`)
     - User Prompt (`summary_user`)

2. **Структура UI:**
   - Использовать тот же Accordion-паттерн, что и для категорий
   - Каждый раздел отчёта — отдельный AccordionItem
   - Внутри — карточки System/User промптов с кнопкой редактирования

3. **Логика:**
   - Извлечь промпты из `settings` по ключам `prescriptions_*` и `summary_*`
   - Включить их в поиск по `searchQuery`

## Результат

| Раздел | Содержимое |
|--------|------------|
| Промпты разделов отчёта | Назначения (2 промпта), Общее резюме (2 промпта) |
| Промпты категорий биомаркеров | 5 категорий × 2 промпта |

## Техническая реализация

```typescript
// Конфигурация разделов отчёта
const reportSections = [
  { 
    id: 'prescriptions', 
    name: 'Назначения', 
    emoji: '💊',
    description: 'Промпты для генерации персонализированных назначений',
    systemKey: 'prescriptions_system',
    userKey: 'prescriptions_user'
  },
  { 
    id: 'summary', 
    name: 'Общее резюме', 
    emoji: '📋',
    description: 'Промпты для формирования итогового резюме отчёта',
    systemKey: 'summary_system',
    userKey: 'summary_user'
  }
];

// Маппинг промптов
const reportPrompts = reportSections.map(section => ({
  section,
  systemPrompt: settings?.find(s => s.key === section.systemKey),
  userPrompt: settings?.find(s => s.key === section.userKey)
}));
```

## Визуальный результат

Страница AI Settings будет содержать два раздела:
1. **Промпты разделов отчёта** — для назначений и резюме
2. **Промпты категорий биомаркеров** — для 5 категорий (как сейчас)


да и старые захардкоженные промпты перенеси тоже сразу в настройки
