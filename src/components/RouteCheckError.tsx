import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface RouteCheckErrorProps {
  onRetry: () => void;
  message?: string;
  /** Техническая причина — показывается только в dev-режиме. */
  devDetails?: string;
}

/**
 * Универсальный fallback для гвардов ролей, когда проверка не прошла
 * из-за сетевой ошибки/таймаута (а не из-за реального отсутствия прав).
 */
export function RouteCheckError({ onRetry, message, devDetails }: RouteCheckErrorProps) {
  const isDev = import.meta.env.DEV;

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <AlertTriangle className="h-10 w-10 text-muted-foreground" />
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Не удалось проверить доступ</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          {message ?? "Что-то пошло не так. Попробуйте ещё раз."}
        </p>
      </div>
      <Button onClick={onRetry} variant="default">
        Повторить
      </Button>
      {isDev && devDetails && (
        <pre className="mt-4 max-w-2xl whitespace-pre-wrap break-words rounded-md bg-muted p-3 text-left text-xs text-muted-foreground">
          {devDetails}
        </pre>
      )}
    </div>
  );
}
