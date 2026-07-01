## Проблема
На странице «Стратегия здоровья» в трёх местах показываются технические коды (HCY, TEST, LP(A), DHEA-S и т. п.), которые непонятны пациентам:
1. `RoadmapTimeline.tsx` — блок «Ваши ключевые биомаркеры под контролем» (`kb.markers.join(", ")`).
2. `ExpectationsTimeline.tsx` — цель по показателю (`e.biomarker_target.code`).
3. `ActionMap.tsx` — чипы `biomarker_codes` в поповере действия.

## Решение
Показывать человекочитаемое русское название маркера (например «Гомоцистеин», «Тестостерон общий», «Липопротеин(а)»), а код оставить как маленькую подпись/подсказку — чтобы врач/суперадмин мог сопоставить.

### Шаги
1. **Новый хук `src/hooks/useBiomarkerNames.ts`**
   - Один запрос в `biomarkers` (`code, name`) с кэшированием в модульной переменной (грузится один раз за сессию).
   - Возвращает `{ nameByCode: Record<string,string>, format(code): string }`.
   - `format(code)` возвращает `name` если найден, иначе исходный `code` (fallback, чтобы ничего не потерять).
   - Учитывать маппинг демо-кодов через существующий `DEMO_TO_DB_CODE` из `src/lib/biomarkerCodeMap.ts` (сначала пробуем прямой код, если нет — пробуем через маппинг).

2. **`RoadmapTimeline.tsx`**
   - Использовать хук; вместо `kb.markers.join(", ")` рендерить массив как список пилюль/тегов: крупно название, мелко код серым.

3. **`ExpectationsTimeline.tsx`**
   - Показывать `format(code)` жирным вместо `code`. Код убрать (он не несёт ценности рядом с названием и цифрой).

4. **`ActionMap.tsx`**
   - В чипах биомаркеров показывать `format(code)` обычным шрифтом (не `font-mono`). Ширина чипа увеличится — уже верстается через `flex-wrap`, ок.

5. **Никаких изменений** в edge-функциях, БД и промптах — только слой представления.

## Файлы
- `src/hooks/useBiomarkerNames.ts` (новый)
- `src/components/health-strategy/RoadmapTimeline.tsx`
- `src/components/health-strategy/ExpectationsTimeline.tsx`
- `src/components/health-strategy/ActionMap.tsx`
