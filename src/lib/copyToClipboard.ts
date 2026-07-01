/**
 * Копирование в буфер обмена с fallback на document.execCommand.
 * Возвращает true при успехе, false — если ни один способ не сработал
 * (в этом случае UI должен показать текст для ручного копирования).
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  const hasModernClipboard =
    typeof navigator !== "undefined" &&
    Boolean(navigator.clipboard) &&
    typeof window !== "undefined" &&
    window.isSecureContext;

  if (hasModernClipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // В современных браузерах execCommand часто возвращает true в iframe/preview,
      // но фактически не кладёт текст в системный буфер. Не показываем ложный успех.
      return false;
    }
  }

  if (typeof document === "undefined") return false;

  let textarea: HTMLTextAreaElement | null = null;
  try {
    textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.setAttribute("aria-hidden", "true");
    textarea.style.position = "fixed";
    textarea.style.top = "-9999px";
    textarea.style.left = "-9999px";
    textarea.style.width = "1px";
    textarea.style.height = "1px";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);

    const selection = document.getSelection();
    const previousRange = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");

    selection?.removeAllRanges();
    if (previousRange) selection?.addRange(previousRange);

    return ok;
  } catch {
    return false;
  } finally {
    if (textarea?.parentNode) textarea.parentNode.removeChild(textarea);
  }
}
