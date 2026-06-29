/**
 * Перевод технических ошибок (Supabase Auth, Postgres, Storage, сеть) в понятный
 * русский текст. Если ошибка не распознана — возвращается `fallback` или общее
 * сообщение. Сырой английский текст пользователю не показывается.
 */

const DEFAULT_FALLBACK = "Что-то пошло не так. Попробуйте ещё раз.";

type Rule = { test: RegExp; message: string | ((m: RegExpMatchArray) => string) };

const RULES: Rule[] = [
  // --- Supabase Auth ---
  { test: /invalid login credentials/i, message: "Неверный email или пароль." },
  { test: /email not confirmed/i, message: "Email ещё не подтверждён. Проверьте почту." },
  { test: /user already registered|already been registered|already exists/i, message: "Пользователь с таким email уже зарегистрирован." },
  {
    test: /password should be at least (\d+) characters/i,
    message: (m) => `Пароль должен содержать минимум ${m[1]} символов.`,
  },
  { test: /new password should be different/i, message: "Новый пароль должен отличаться от текущего." },
  { test: /weak[_ ]password|password is known to be weak|pwned/i, message: "Этот пароль слишком простой. Выберите более надёжный." },
  { test: /email rate limit exceeded/i, message: "Слишком много писем. Попробуйте через пару минут." },
  {
    test: /for security purposes,? you can only request this after (\d+) seconds?/i,
    message: (m) => `В целях безопасности повторите попытку через ${m[1]} сек.`,
  },
  { test: /rate limit/i, message: "Слишком много попыток. Подождите немного и попробуйте снова." },
  { test: /token (has )?expired|invalid token|token.*invalid/i, message: "Ссылка устарела или недействительна. Запросите новую." },
  { test: /otp.*(expired|invalid)|invalid.*otp/i, message: "Код подтверждения недействителен или устарел." },
  { test: /unable to validate email address|invalid (email )?format/i, message: "Некорректный формат email." },
  { test: /user not found/i, message: "Пользователь не найден." },
  { test: /signup.*disabled|signups not allowed/i, message: "Регистрация временно недоступна." },
  { test: /invalid (api )?key|jwt.*invalid|jwt expired/i, message: "Сессия истекла. Войдите снова." },

  // --- Postgres / PostgREST ---
  { test: /duplicate key value violates unique constraint/i, message: "Запись с такими данными уже существует." },
  { test: /violates row-level security|permission denied/i, message: "Недостаточно прав для этого действия." },
  { test: /null value in column .* violates not-null/i, message: "Заполните все обязательные поля." },
  { test: /value too long for type/i, message: "Введённое значение слишком длинное." },
  { test: /violates foreign key constraint/i, message: "Невозможно выполнить: запись связана с другими данными." },
  { test: /violates check constraint/i, message: "Введённое значение не проходит проверку." },
  { test: /invalid input syntax/i, message: "Некорректный формат данных." },

  // --- Storage ---
  { test: /payload too large|file size.*exceed|too large/i, message: "Файл слишком большой." },
  { test: /the resource already exists|object already exists/i, message: "Файл с таким именем уже существует." },
  { test: /mime type .* is not supported|invalid file type/i, message: "Неподдерживаемый тип файла." },

  // --- Сеть / Edge runtime ---
  { test: /failed to fetch|network ?error|networkerror/i, message: "Не удалось связаться с сервером. Проверьте интернет-соединение." },
  { test: /functionshttperror|edge function returned a non-2xx/i, message: "Сервис временно недоступен. Попробуйте ещё раз." },
  { test: /timeout|timed out/i, message: "Сервер не ответил вовремя. Попробуйте ещё раз." },
  { test: /unexpected end of json|json (parse|parsing) error|not valid json/i, message: "Сервер вернул некорректный ответ. Попробуйте ещё раз." },
  { test: /aborted|abort ?error/i, message: "Запрос был отменён." },
];

function extractMessage(err: unknown): string {
  if (err == null) return "";
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message || "";
  if (typeof err === "object") {
    const anyErr = err as Record<string, unknown>;
    const candidates = [
      anyErr.message,
      (anyErr.error as { message?: string } | undefined)?.message,
      anyErr.error_description,
      anyErr.error,
      anyErr.msg,
      anyErr.details,
      anyErr.hint,
    ];
    for (const c of candidates) {
      if (typeof c === "string" && c.trim()) return c;
    }
    try {
      return JSON.stringify(err);
    } catch {
      return "";
    }
  }
  return String(err);
}

/**
 * Переводит ошибку в понятное русское сообщение. Если в `errOrText` уже строка
 * на русском — возвращаем её как есть.
 */
export function translateError(errOrText: unknown, fallback: string = DEFAULT_FALLBACK): string {
  if (errOrText == null) return fallback;
  const raw = extractMessage(errOrText).trim();
  if (!raw) return fallback;

  // Уже на русском — пропускаем без изменений.
  if (/[А-Яа-яЁё]/.test(raw)) return raw;

  for (const rule of RULES) {
    const m = raw.match(rule.test);
    if (m) return typeof rule.message === "function" ? rule.message(m) : rule.message;
  }

  // Сырой английский технический текст пользователю не показываем.
  return fallback;
}
