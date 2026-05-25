import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface RouteCheckErrorProps {
  onRetry: () => void;
  message?: string;
}

/**
 * Универсальный fallback для гвардов ролей, когда проверка не прошла
 * из-за сетевой ошибки/таймаута (а не из-за реального отсутствия прав).
 * Лучше показать понятное сообщение с кнопкой «Повторить», чем
 * бесконечный спиннер или молчаливый редирект.
 */
export function RouteCheckError({ onRetry, message }: RouteCheckErrorProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <AlertTriangle className="h-10 w-10 text-muted-foreground" />
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Не удалось загрузить данные</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          {message ?? "Сервер не отвечает. Проверьте соединение и попробуйте ещё раз."}
        </p>
      </div>
      <Button onClick={onRetry} variant="default">
        Повторить
      </Button>
    </div>
  );
}
