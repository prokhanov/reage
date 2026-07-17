# Задача

Робокасса не показывает Яндекс.Сплит, Подели и Мокка, потому что в платёж не передаётся состав заказа (`Receipt`). Нужно добавить его в запрос на создание платежа.

Реквизиты от пользователя:
- Система налогообложения: `usn_income_outcome` (УСН доходы минус расходы)
- НДС: `none` (без НДС)

# Что меняем

Только один файл: `supabase/functions/robokassa-create-payment/index.ts`.

## 1. Собираем Receipt

Одна позиция — подписка ReAge. Название формируем из `subscription_plans.display_name` + человекочитаемый период (Месяц/Квартал/Полгода/Год), для чего добавляем небольшой доп. `select` в `subscription_plans` по `planId`.

```json
{
  "sno": "usn_income_outcome",
  "items": [
    {
      "name": "Подписка ReAge: <display_name>, <период>",
      "quantity": 1,
      "sum": <finalAmount>,
      "payment_method": "full_payment",
      "payment_object": "service",
      "tax": "none"
    }
  ]
}
```

`sum` = итоговая сумма к оплате (`finalAmount`, с учётом промокода) — совпадает с `OutSum`, иначе Робокасса отклонит.

## 2. Обновляем подпись

Сейчас:
```
md5(MerchantLogin:OutSum:InvId:Password1)
```

Становится (Receipt вставляется между `InvId` и `Password1` в том же виде, в котором уходит в URL — URL-encoded JSON):
```
md5(MerchantLogin:OutSum:InvId:<url-encoded Receipt JSON>:Password1)
```

Правим `buildCreateSignature`, чтобы принимал опциональный `receiptEncoded` и вставлял его перед `password1`.

## 3. Добавляем параметр в URL

`params.set("Receipt", JSON.stringify(receipt))` — `URLSearchParams` сам сделает URL-кодирование. Для подписи используем ровно ту же URL-encoded строку.

## 4. Result URL не трогаем

`robokassa-result/index.ts` валидирует подпись ответа по схеме `OutSum:InvId:Password2` — Receipt туда не входит. Перечитаю файл перед правкой, чтобы точно ничего не сломать.

# Проверка после деплоя

1. Оформить тестовый платёж (test-mode Робокассы уже включён).
2. На странице оплаты нажать стрелку рядом с суммой — должен появиться блок «Состав заказа» с позицией подписки.
3. Убедиться, что Сплит / Подели / Мокка появились в списке методов.
4. Проверить обычную оплату картой (если подпись собрана неверно, Робокасса вернёт «Неверная контрольная сумма» — это и будет сигнал откатить).

# Затронутые файлы

- `supabase/functions/robokassa-create-payment/index.ts`
