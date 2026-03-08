

## Гибридная обложка PDF в демо-отчёте

### Суть
Добавить градиентную обложку (загруженная картинка) как первую страницу PDF в `ReportVisualsTest.tsx`. Обложка рендерится через **html2canvas** → Base64 PNG → вставляется в **pdfmake** как изображение на полную страницу A4.

### Изменения

**1. Сохранить картинку градиента**
- `src/assets/pdf-cover-bg.jpg` — загруженное изображение

**2. `src/lib/pdfExportHelpers.ts` — добавить утилиты обложки**
- `imageToBase64(url: string): Promise<string>` — загружает изображение и возвращает data URI
- `buildCoverPageContent(patientName, date, logoBase64): any[]` — возвращает массив pdfmake-элементов для обложки (имя, дата, белым текстом, центрировано, `pageBreak: 'after'`)
- `buildCoverBackground(bgBase64): (page) => any[]` — функция для `background` в docDefinition, на странице 1 рисует фоновое изображение 595×842pt

**3. `src/pages/admin/ReportVisualsTest.tsx` — интеграция**
- Импортировать `html2canvas` НЕ нужен — загрузка картинки через `imageToBase64` напрямую (это статичный JPG, не DOM-рендер)
- В `handleExportPdf`:
  1. Загрузить `pdf-cover-bg.jpg` и `reage-logo.png` через `imageToBase64`
  2. Вставить `buildCoverPageContent(...)` в начало `pdfContent`
  3. Добавить `background: buildCoverBackground(bgBase64)` в docDefinition
  4. Убрать `pageMargins` для первой страницы (через `pageMargins` как функцию: стр.1 → [0,0,0,0], остальные → [40,50,40,50])

**4. Зависимости**
- Никаких новых — `imageToBase64` реализуется через `fetch` + `canvas.toDataURL` или `FileReader`

### Структура обложки (белый текст на градиенте)
```text
┌─────────────────────────┐
│                         │
│     [ReAge logo]        │
│                         │
│   Персональный отчёт    │
│   здоровья и старения   │
│                         │
│   Сергей Чагин          │
│   12.03.2025            │
│                         │
│   79 биомаркеров        │
│                         │
└─────────────────────────┘
```

### Объём
~50 строк в `pdfExportHelpers.ts`, ~15 строк изменений в `ReportVisualsTest.tsx`.

