import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";

/** Обрабатывает ссылку автовхода из письма: https://reage.life/?auto_login=<token>. */
export function AutoLoginHandler() {
  const navigate = useNavigate();
  useEffect(() => {
    const url = new URL(window.location.href);
    const token = url.searchParams.get("auto_login");
    if (!token) return;
    url.searchParams.delete("auto_login");
    window.history.replaceState(null, "", url.pathname + (url.searchParams.toString() ? `?${url.searchParams}` : "") + url.hash);
    (async () => {
      const { data } = await supabase.functions.invoke("energy-claim-session", { body: { loginToken: token } });
      const tokenHash = (data as { tokenHash?: string } | null)?.tokenHash;
      if (tokenHash) {
        const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "magiclink" });
        if (!error) {
          navigate("/one-time-checkups", { replace: true });
          return;
        }
      }
      notify.error("Ссылка для входа устарела", "Войдите по логину и паролю из письма.");
      navigate("/auth", { replace: true });
    })();
  }, [navigate]);
  return null;
}
