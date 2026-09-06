import { memo } from "react";

/**
 * Спокойный фон экранов авторизации: без анимированных пятен и частиц —
 * только едва заметная линейчатая сетка в тон поверхности.
 */
export const AuthBackground = memo(function AuthBackground() {
  return (
    <div
      className="absolute inset-0 pointer-events-none bg-surface/40"
      aria-hidden
    />
  );
});
