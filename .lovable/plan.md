

# Диагностика и исправление обрыва секций отчета

## Проблема

Две секции генерируются с проблемами:
- **"Энергия и восстановление"** — сохранено 2 символа (`##`), хотя лог показывает `1519 tokens, finish_reason: stop`
- **"Обмен веществ и детоксикация"** — 1498 символов, текст обрывается на полуслове (`Щелочная фосфа`), лог `1646 tokens, finish_reason: stop`

Ключевая проблема: код логирует `total_tokens` (prompt + completion), а не отдельно `completion_tokens`. Поэтому `1519 tokens` выглядит нормально, но на самом деле это в основном prompt, а completion — почти ноль. Нет логов длины контента, нет валидации.

## Решение

### Файл: `supabase/functions/analyze-biomarkers/index.ts`

#### 1. Улучшить логирование (строки ~584-601)

После получения ответа от AI логировать:
- `prompt_tokens`, `completion_tokens`, `total_tokens` отдельно
- Длину контента в символах
- Первые 100 и последние 100 символов контента (для диагностики обрыва)
- `finish_reason`

```typescript
const promptTokens = data.usage?.prompt_tokens || 0;
const completionTokens = data.usage?.completion_tokens || 0;
const totalTokens = data.usage?.total_tokens || 0;
const contentLength = categoryReport?.length || 0;

console.log(`Category ${category}: finish_reason=${finishReason}, prompt_tokens=${promptTokens}, completion_tokens=${completionTokens}, total_tokens=${totalTokens}, content_length=${contentLength}`);

if (contentLength < 500) {
  console.error(`PROBLEM: Category ${category} content too short (${contentLength} chars). First 200: ${categoryReport?.substring(0, 200)}`);
}
```

#### 2. Добавить валидацию + retry (после логов)

Если контент < 500 символов — повторить запрос (до 2 попыток) с задержкой 3 секунды:

```typescript
const MIN_CONTENT_LENGTH = 500;
let finalReport = categoryReport;
let retryCount = 0;

while ((!finalReport || finalReport.length < MIN_CONTENT_LENGTH) && retryCount < 2) {
  retryCount++;
  console.warn(`Retry ${retryCount}/2 for ${category} (content: ${finalReport?.length || 0} chars)`);
  await new Promise(r => setTimeout(r, 3000));
  // Повторный запрос с тем же промптом
  const retryResp = await fetch(/*same params*/);
  if (retryResp.ok) {
    const retryData = await retryResp.json();
    finalReport = retryData.choices[0].message.content;
    // Логируем retry результат
    console.log(`Retry result for ${category}: ${finalReport?.length || 0} chars, finish=${retryData.choices[0].finish_reason}, completion_tokens=${retryData.usage?.completion_tokens || 0}`);
  }
}
```

#### 3. Fallback при неудаче

Если после retry контент все еще < 500 — сохранить placeholder:
```typescript
if (!finalReport || finalReport.length < MIN_CONTENT_LENGTH) {
  finalReport = `## ${category}\n\nАнализ этой категории не удался при генерации. Рекомендуется перегенерировать отчёт.`;
  categoryStatuses[category] = { success: false, error: `Content too short after ${retryCount} retries: ${finalReport.length} chars` };
}
```

### После деплоя

Перегенерировать отчет для `analysisId = 0ef9d921-a0be-47f2-bee1-1715c8e86708` и проверить логи — теперь будет видно, почему именно контент короткий (мало completion_tokens, обрыв, пустой ответ и т.д.).

