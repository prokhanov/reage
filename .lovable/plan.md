

# Создание anchorParser и унификация рендеринга

## Что сейчас

Три места дублируют одну и ту же логику парсинга/рендеринга с разными regex:

1. **`pdfExportHelpers.ts`** — `splitTextByBiomarkers` (regex по `**Name (CODE)**` / `## Name (CODE)`) + `buildInterleavedPdfSection` (regex для «Краткое резюме»)
2. **`ReportVisualsTest.tsx`** — дублирует PDF-логику для веб-превью (строки 282-357 для PDF, 379-454 для веб) с собственным regex для резюме
3. **`Recommendations.tsx`** — вообще **не** делает интерлейс на вебе (строки 722-725), только в PDF через `buildInterleavedPdfSection`

## План

### 1. Создать `src/lib/anchorParser.ts`

Единая функция `parseAnchors(text, biomarkerCodes)`:

```typescript
type AnchorBlock =
  | { type: 'text'; content: string }
  | { type: 'summary'; content: string }
  | { type: 'biomarker'; code: string; content: string }
  | { type: 'section'; name: string; content: string }  // insights, strengths, risks, etc.
  | { type: 'spacer' }
  | { type: 'pagebreak' };
```

Логика:
- Ищет `<!-- anchor:TYPE DATA -->` ... `<!-- anchor:TYPE_end -->` парами
- Между парами — блоки `{ type: 'text' }`
- **Fallback**: если ни одного `<!-- anchor:` нет → делегирует в существующий `splitTextByBiomarkers` для обратной совместимости со старыми отчетами
- `spacer` и `pagebreak` — одиночные теги без `_end`

### 2. Создать `src/lib/anchorRenderer.tsx`

Две функции, использующие один и тот же `parseAnchors`:

**`renderInterleavedWeb(blocks, biomarkers, age, gender)`** — возвращает JSX:
- `summary` → рамка `bg-primary/5` с `MarkdownContent`
- `biomarker` → карточка с `BiomarkerRangeBar` + `MarkdownContent`
- `section` → `MarkdownContent` (как есть)
- `spacer` → `<div className="h-8" />`
- `pagebreak` → невидим на вебе
- `text` → `MarkdownContent`

**`buildInterleavedPdf(blocks, biomarkers, barWidth, barHeight, age, gender)`** — возвращает pdfmake content[]:
- `summary` → таблица с фиолетовой рамкой (существующий стиль)
- `biomarker` → заголовок + range bar canvas + текст
- `spacer` → `{ text: '', margin: [0,15,0,0] }`
- `pagebreak` → `{ text: '', pageBreak: 'after' }`

### 3. Рефакторинг потребителей

**`pdfExportHelpers.ts`**:
- `splitTextByBiomarkers` остается (для fallback внутри `parseAnchors`)
- `buildInterleavedPdfSection` переписывается: вызывает `parseAnchors` → `buildInterleavedPdf`

**`ReportVisualsTest.tsx`**:
- `renderInterleavedReport` → вызывает `parseAnchors` → `renderInterleavedWeb`
- PDF-экспорт → вызывает `parseAnchors` → `buildInterleavedPdf`
- Удаляется дублированный код (~80 строк)

**`Recommendations.tsx`**:
- Веб-рендеринг категорий (строки 713-728) → использует `renderInterleavedWeb` вместо простого `MarkdownContent` (добавляет интерлейс на веб)
- PDF-экспорт уже вызывает `buildInterleavedPdfSection` — будет работать через новый парсер автоматически

### 4. Итог

- Одна точка парсинга (`anchorParser.ts`)
- Две функции рендеринга в одном файле (`anchorRenderer.tsx`) — веб и PDF
- Старые отчеты без якорей → fallback через `splitTextByBiomarkers`
- Новые отчеты с якорями → точный парсинг без regex-угадывания

