## Корень проблемы

1. **Хроновозраст — целое число.**
   В обоих edge-функциях он считается как разница годов:
   - `finalize-analysis` (стр. 174): `new Date().getFullYear() - new Date(birth).getFullYear()`
   - `compute-health-strategy` (стр. 9, `calcAge`): то же самое, без учёта месяца/дня правильно (там есть месяц, но возвращается целое).
   Поэтому в окне всегда `23.0`, а не реальное `23.7`.

2. **Био-возраст в окне «Пересчитать» не пересчитывается, а просто читается из БД.**
   `compute-health-strategy` берёт `latest.biological_age` (стр. 202) — это значение, посчитанное `finalize-analysis` в момент загрузки анализа со **старой** формулой (или старым `aging_weight`/штрафами). Поэтому когда мы усилили формулу — кнопка «Пересчитать» это не видит, число остаётся прежним.

3. Из-за п.1 даже базовая часть формулы `chronoAge + (85 − HI) × 0.25` даёт «круглый» результат: целое + целое × 0.25 = .0 / .25 / .5 / .75, что усиливает ощущение «всё округлено».

## Что делаем

### A. Дробный хроновозраст (1 знак)

Новый общий хелпер в обоих edge-функциях (заменяем оба `calcAge`/inline-вычисление):

```ts
function calcAgeYears(birthIso: string): number {
  const birth = new Date(birthIso);
  const now = new Date();
  const ms = now.getTime() - birth.getTime();
  const years = ms / (365.2425 * 24 * 3600 * 1000);
  return Math.round(years * 10) / 10; // 1 знак
}
```

Точки замены:
- `supabase/functions/finalize-analysis/index.ts:174` — `const age = ... calcAgeYears(profile.birth_date)`. Дальше переменная `chronologicalAge = age` уже используется в формуле — она автоматически станет дробной.
- `supabase/functions/compute-health-strategy/index.ts:9-16` (`calcAge`) — заменить тело; все callers продолжат работать.
- В `explanation.formula.chronological_age` и тексте `drivers` (`compute-health-strategy:767, 785, 787`) — выводить через `.toFixed(1)`.

### B. «Пересчитать» реально пересчитывает био-возраст

В `compute-health-strategy` (только когда `preview === true`) перед формированием `snapshotPayload` пересчитать `currentBio` по той же формуле, что в `finalize-analysis`, но **без AI-вызова** (детерминированно, опираясь на сохранённый AI-сдвиг):

1. `baseBioAge = chronoAge + (85 − HI) × 0.25` (уже считается на стр. 684).
2. Достать сохранённый AI-сдвиг: `prevAiAdjust = latest.biomarkers_metadata?.bio_age_calc?.ai_adjustment ?? 0`.
3. Применить **новый** асимметричный коридор:
   - `aiLower = HI < 70 ? baseBioAge + 0.5 : HI < 80 ? baseBioAge - 2 : baseBioAge - 5`
   - `aiUpper = baseBioAge + 5`
   - `clampedDelta = clamp(prevAiAdjust, aiLower − baseBioAge, aiUpper − baseBioAge)`
4. `currentBio = round1(baseBioAge + clampedDelta)`.
5. Этим `currentBio` подменить значение, которое идёт в `snapshotPayload.current_bio_age`, `explanation.formula.final_bio_age`, `drivers`, `roadmap[0]`, target-расчёт и т.д. (заменить присваивание `const currentBio = Number(latest.biological_age)` на эту логику; в режиме НЕ-preview оставить старое чтение из БД, чтобы публикация работала как сейчас, либо тоже использовать пересчёт — см. ниже).

   - **Решение:** делаем пересчёт ВСЕГДА (и в preview, и при публикации), чтобы публикуемое значение совпадало с тем, что админ видит и редактирует. Это уже соответствует ожиданию «нажал пересчитать — обновилось везде».

6. **Запись пересчитанного био в анализ.** В блоке публикации (`mode !== preview`) после успешной записи `health_strategy_snapshots` также обновлять `analyses.biological_age = edited.current_bio_age` (или пересчитанное значение, если правка не пришла), чтобы дашборд/отчёты показывали то же число. Это уже частично делается — проверим в коде публикации и при необходимости добавим update.

### C. Формат в UI

В `StrategyPreviewDialog.tsx` инициализация `chrono` уже идёт через `.toFixed(1)` — после фикса A значение само станет дробным (23.7), не 23.0. Дополнительно в строке-сводке `drivers` в едж-функции тоже использовать `.toFixed(1)` для согласованности.

## Что НЕ трогаем

- Сам коэффициент `0.25`, штрафы массовости, `aging_weight` — остаются как в последней калибровке.
- AI-вызов в `finalize-analysis` — он по-прежнему срабатывает при загрузке анализа. «Пересчитать» в админке использует уже сохранённый AI-сдвиг + новые границы коридора, без повторного дорогого AI-вызова.
- Поведение публикации (записи в `health_strategy_snapshots`) — структура та же.

## Файлы

- `supabase/functions/finalize-analysis/index.ts` — заменить расчёт `age` на `calcAgeYears`.
- `supabase/functions/compute-health-strategy/index.ts` — заменить `calcAge`, добавить пересчёт `currentBio` с применением нового коридора, обновить вывод в `explanation` и `drivers`. В блоке публикации проверить обновление `analyses.biological_age`.

## Технические детали (для проверки)

После правки на тестовом пациенте:
- Хроно покажется как, например, `23.7`, а не `23.0`.
- При HI=70: `base = 23.7 + (85−70)·0.25 = 27.45`. Если предыдущий `ai_adjustment` был `-3.0`, новый коридор при HI<70 разрешает только `+0.5` снизу → дельта обрежется до `0`, итог `27.5` (вместо старого `24.0`).
- При HI=82 и сохранённой дельте `-2.0`: `base = 23.7 + 0.75 = 24.45`, коридор `[base−5, base+5]`, дельта остаётся `-2.0`, итог `22.5`.