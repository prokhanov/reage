
# План: Слоты доступны по умолчанию (без предгенерации)

## Проблема

Текущий подход создаёт **~270 записей на каждый месяц** (30 дней × 9 слотов). Сейчас в БД:
- 801 запись всего
- Только 1 слот с реальной бронью
- 797 слотов с дефолтными значениями (capacity=3, booked=0, active=true)

Это неэффективно: 99% записей — "пустышки".

## Решение

Инвертировать логику: **все слоты считаются доступными по умолчанию**. Записи в `availability_slots` создаются только когда:
- Админ закрывает слот или меняет capacity
- Пациент бронирует слот

---

## Что сохраняется

- **Правило 2-часового блока** — логика в `usePatientSlots.ts` и `DaySlotsManager.tsx` работает на виртуальных слотах
- **Бронирование через ЛК пациента** — `AnalysisBookingDialog` продолжает работать
- **Редактирование/отмена брони** — те же функции `book_analysis_slot` и `cancel_booking`
- **Перенос брони** — игнорируется свой слот при проверке 2ч блока

---

## Технические изменения

### 1. Новая таблица настроек по умолчанию

```text
┌─────────────────────────────────────────────────────────────┐
│ default_slot_settings                                       │
├─────────────────────────────────────────────────────────────┤
│ id            uuid PRIMARY KEY                              │
│ day_of_week   int (0-6, 0=воскресенье)                     │
│ time_slot     text (09:00, 10:00, ...)                     │
│ total_capacity int DEFAULT 3                                │
│ is_active     boolean DEFAULT true                          │
│ UNIQUE(day_of_week, time_slot)                             │
└─────────────────────────────────────────────────────────────┘
```

Заполняется 63 записями (7 дней × 9 временных слотов) — все дни недели с 09:00 до 17:00.

### 2. Новая SQL-функция `get_slots_for_date_range`

Генерирует "виртуальные" слоты на основе дефолтов и мержит с реальными записями:

```text
Вход: p_start_date, p_end_date, p_existing_slot_id (для перебронирования)
Выход: id, date, time_slot, total_capacity, booked_count, is_active, is_override
```

- Для каждой даты в диапазоне берёт дефолты по дню недели
- Если есть запись в `availability_slots` — использует её значения
- Флаг `is_override` показывает, реальная это запись или виртуальная

### 3. Обновлённая функция `book_analysis_slot`

```text
Вход: p_slot_id (может быть NULL), p_date, p_time_slot
```

- Если слот существует — стандартная логика (increment booked_count)
- Если слот НЕ существует — создаёт на основе дефолтов с booked_count=1

### 4. Обновлённая функция `cancel_booking`

- При отмене уменьшает booked_count
- Опционально: удаляет запись, если она вернулась к дефолтным значениям

### 5. Обновить `usePatientSlots.ts`

```typescript
// Было: прямой запрос к availability_slots
const { data } = await supabase.from("availability_slots")...

// Станет: вызов RPC-функции
const { data } = await supabase.rpc('get_slots_for_date_range', {
  p_start_date: format(startDate, 'yyyy-MM-dd'),
  p_end_date: format(endDate, 'yyyy-MM-dd'),
  p_existing_slot_id: existingSlotId || null
});
```

Вся логика 2-часового блока остаётся без изменений — она работает с массивом слотов.

### 6. Обновить `useAvailabilitySlots.ts`

Аналогично использовать RPC-функцию вместо прямого запроса.

### 7. Обновить `AnalysisBookingDialog.tsx`

При бронировании передавать дополнительно date и time_slot:

```typescript
await supabase.rpc('book_analysis_slot', { 
  p_slot_id: selectedSlotId.startsWith('virtual_') ? null : selectedSlotId,
  p_date: format(bookingDate, 'yyyy-MM-dd'),
  p_time_slot: bookingTime
});
```

### 8. Обновить `DaySlotsManager.tsx`

- Удалить кнопку "Добавить слоты на месяц"
- При изменении capacity/is_active виртуального слота — создавать реальную запись (upsert)
- Удалить слот = вернуть к дефолтным настройкам (удалить запись)
- Визуально показывать "виртуальные" слоты иначе (опционально)

### 9. Миграция существующих данных

```sql
-- Удалить слоты без бронирований с дефолтными настройками
DELETE FROM availability_slots 
WHERE booked_count = 0 
  AND total_capacity = 3 
  AND is_active = true;
```

Это удалит ~797 из 801 записей, оставив только реально изменённые/забронированные.

---

## Преимущества

| До | После |
|---|---|
| 270+ записей на месяц | 0 записей по умолчанию |
| Нужна ручная генерация | Слоты "появляются" автоматически |
| Медленная генерация | Мгновенный доступ к любой дате |
| Много места в БД | Только исключения хранятся |

---

## Порядок реализации

1. SQL-миграция: создать `default_slot_settings` и заполнить
2. SQL-миграция: создать функцию `get_slots_for_date_range`
3. SQL-миграция: обновить `book_analysis_slot` и `cancel_booking`
4. Обновить `usePatientSlots.ts` — использовать RPC
5. Обновить `useAvailabilitySlots.ts` — использовать RPC
6. Обновить `AnalysisBookingDialog.tsx` — передавать date/time при бронировании
7. Обновить `DaySlotsManager.tsx` — убрать генерацию, добавить upsert для виртуальных
8. SQL-миграция: очистить старые дефолтные записи
