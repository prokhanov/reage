/**
 * Копирование в буфер обмена с fallback на document.execCommand.
 * Возвращает true при успехе, false — если ни один способ не сработал
 * (в этом случае UI должен показать текст для ручного копирования).
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // Modern API — работает только в secure context и при разрешённом clipboard-write
  if (typeof navigator !== "undefined" && navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fall through к execCommand
    }
  }

  if (typeof document === "undefined") return false;

  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "0";
    textarea.style.left = "0";
    textarea.style.opacity = "0";
    textarea.style.pointerEvents = "none";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}
