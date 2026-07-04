import { useEffect } from "react";
import { useUserRole } from "@/hooks/useUserRole";

const STYLE_ID = "jivo-hide-style";

/**
 * Скрывает виджет Jivo для ролей: суперадмин, администратор, врач.
 * Для остальных (пациенты, гости) виджет отображается.
 */
export function JivoVisibility() {
  const { data: roleData } = useUserRole();

  useEffect(() => {
    const role = roleData?.userRole;
    const shouldHide =
      role === "Суперадмин" || role === "Администратор" || role === "Врач";

    let styleEl = document.getElementById(STYLE_ID) as HTMLStyleElement | null;

    if (shouldHide) {
      if (!styleEl) {
        styleEl = document.createElement("style");
        styleEl.id = STYLE_ID;
        document.head.appendChild(styleEl);
      }
      styleEl.textContent = `jdiv, jdiv iframe, #jvlabelWrap { display: none !important; visibility: hidden !important; }`;
    } else if (styleEl) {
      styleEl.remove();
    }
  }, [roleData?.userRole]);

  return null;
}
