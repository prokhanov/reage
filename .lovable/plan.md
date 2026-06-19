## Контекст

После Шага 1 регистрации `supabase.auth.signUp` создаёт активную сессию — пользователь уже залогинен в новом аккаунте. На Шагах 2–5 ссылка «Уже есть аккаунт? Войти» бессмысленна и опасна: клик уведёт на `/auth`, где пользователь может залогиниться под другим аккаунтом и сломать текущий регистрационный флоу.

## Изменение

В `src/pages/Register.tsx` (строки 491–501) обернуть блок «Уже есть аккаунт? Войти» в условие, чтобы он показывался **только на Шаге 1** (`currentStep === 1`).

```tsx
{currentStep === 1 && (
  <div className="text-center mt-6 animate-fade-in" style={{ animationDelay: "0.6s" }}>
    <p className="text-sm text-muted-foreground">
      Уже есть аккаунт?{" "}
      <button
        onClick={() => navigate("/auth")}
        className="text-primary hover:text-primary-hover font-medium transition-all hover:underline"
      >
        Войти
      </button>
    </p>
  </div>
)}
```

## Проверка

- Открыть `/register` (Шаг 1) — ссылка видна.
- Перейти на `/register/payment`, `/register/profile`, `/register/medical`, `/register/application` — ссылки нет.

Других мест с этой подсказкой в шагах регистрации нет (проверено `rg`).