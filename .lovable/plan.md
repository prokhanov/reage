## Проблема

На `test.reage.life/analyses/` страница не грузится: запросы идут ~12с и возвращают 200. Через прокси без VPN это особенно заметно.

Корень — N+1 в `src/pages/Analyses.tsx`:

```ts
const analysesWithCounts = await Promise.all(
  sorted.map(async (analysis) => {
    const { count } = await supabase
      .from("analysis_values")
      .select("*", { count: "exact", head: true })
      .eq("analysis_id", analysis.id);
    ...
  })
);
```

Если у пациента 10 анализов — это 10 параллельных HEAD-запросов с `count=exact` (полный COUNT по таблице на каждый анализ). Через nginx-прокси они выстраиваются в очередь, отсюда 12с и пустой UI (`loading` не снимается, пока все не вернутся).

## План

**1. `src/pages/Analyses.tsx` — один запрос вместо N**

Заменить `Promise.all(... select count head ...)` на один групповой запрос:

```ts
const ids = sorted.map(a => a.id);
const { data: values } = await supabase
  .from("analysis_values")
  .select("analysis_id")
  .in("analysis_id", ids);

const counts = new Map<string, number>();
(values || []).forEach(v => {
  counts.set(v.analysis_id, (counts.get(v.analysis_id) || 0) + 1);
});

const analysesWithCounts = sorted.map(a => ({
  ...a,
  biomarkers_count: counts.get(a.id) || 0,
}));
```

Это превращает N+1 в 2 запроса (analyses + analysis_values).

**2. Дополнительно — рендерить список сразу, без блокировки на счётчиках**

Сначала `setAnalyses(sorted)` со счётчиками = 0, потом догрузить counts и обновить. Это уберёт пустой экран даже если второй запрос медленный.

**3. Что НЕ трогаем**

- `nginx.conf` (уже исправлен в прошлой итерации).
- `client.ts`, типы Supabase.
- Realtime-флаг (отдельная диагностика).
- Другие страницы.

## Технические детали

- Запрос `select("analysis_id").in("analysis_id", ids)` через RLS вернёт только строки, принадлежащие пользователю (политики уже это обеспечивают).
- Лимит PostgREST 1000 строк: если у пациента >1000 биомаркеров суммарно, нужно пагинировать или использовать RPC. На текущих объёмах (≤10 анализов × ~50 биомаркеров) безопасно.
- Время загрузки страницы упадёт с ~N × RTT до 2 × RTT.

Подтвердить — приступаю к правке.
